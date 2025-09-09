// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract EHR {
    // =====================
    // Structs
    // =====================

    struct Record {
        string ipfsHash;
        address patient;
        address doctor;
        uint timestamp;
        bool verified;
        string category;
        string fileName;
    }

    struct Doctor {
        string name;
        string hospital;
        string specialization;
        bool registered;
    }

    struct Insurance {
        string companyName;
        string policyNumber;
        string coverageDetails;
        bool active;
    }

    // <-- added billIpfsHash to Claim
    struct Claim {
        address patient;
        string policyNumber;
        string reason;
        string billIpfsHash; // NEW: IPFS hash of patient's bill/evidence
        uint timestamp;
        bool approved;
        bool decided;
    }

    struct InsuranceCompany {
        string name;
        string licenseNumber;
        bool registered; // true means either "pending" (in pending map) or "approved" (in approved map)
    }
// NEW: pending policy requested by patient (for an insurance company to decide)
    struct PendingPolicy {
        string companyName;
        string policyNumber;
        string coverageDetails;
        address insuranceCompany;
        bool decided;
        bool approved;
    }
    // =====================
    // Storage
    // =====================

    address public admin;

    mapping(address => Record[]) public patientRecords; // patient → records
    mapping(address => Doctor) public doctors;          // approved doctors
    mapping(address => Doctor) public pendingDoctors;   // doctors pending approval
    mapping(address => PendingPolicy[]) public pendingPolicies;
    mapping(address => Insurance[]) public patientInsurance; // patient → insurances

    // Claims per insurance company
    mapping(address => Claim[]) public insuranceClaims;

    // Insurance companies
    mapping(address => InsuranceCompany) public insuranceCompanies;           // approved
    mapping(address => InsuranceCompany) public pendingInsuranceCompanies;    // pending
    address[] public pendingInsuranceAddresses;                               // keys for pending

    // =====================
    // Events
    // =====================

    event RecordApproved(address indexed patient, uint recordIndex);
    event RecordDeclined(address indexed patient, uint recordIndex);
    event RecordAdded(address indexed patient, address indexed doctor, string ipfsHash, uint timestamp);

    event DoctorRequested(address indexed doctor, string name, string hospital, string specialization);
    event DoctorApproved(address indexed doctor, string name, string hospital, string specialization);

    // include bill hash in event so UI / logs can show it
    event ClaimRaised(address indexed patient, string policyNumber, string reason, string billIpfsHash, uint timestamp);
    event ClaimApproved(address indexed insuranceCompany, address indexed patient, uint claimIndex);
    event ClaimDeclined(address indexed insuranceCompany, address indexed patient, uint claimIndex);

    event InsuranceCompanyRequested(address indexed company, string name, string licenseNumber);
    event InsuranceCompanyApproved(address indexed company, string name, string licenseNumber);
    // NEW events for policies
    event PolicyRequested(address indexed patient, address indexed insuranceCompany, uint index);
    event PolicyApproved(address indexed insuranceCompany, address indexed patient, uint index);
    event PolicyRejected(address indexed insuranceCompany, address indexed patient, uint index);
    // =====================
    // Modifiers
    // =====================

    modifier onlyRegisteredDoctor() {
        require(doctors[msg.sender].registered, "Not a registered doctor");
        _;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can perform this");
        _;
    }

    // =====================
    // Constructor
    // =====================

    constructor() {
        admin = msg.sender; // deployer is admin
    }

    // =====================
    // Doctor Functions
    // =====================

    function requestDoctorRegistration(
        string memory _name,
        string memory _hospital,
        string memory _specialization
    ) public {
        require(!doctors[msg.sender].registered, "Already registered");
        require(!pendingDoctors[msg.sender].registered, "Already pending approval");

        pendingDoctors[msg.sender] = Doctor({
            name: _name,
            hospital: _hospital,
            specialization: _specialization,
            registered: true // mark as present in pending list (pattern already used)
        });

        emit DoctorRequested(msg.sender, _name, _hospital, _specialization);
    }

    function approveDoctor(address _doctor) public onlyAdmin {
        require(pendingDoctors[_doctor].registered, "Doctor not pending approval");

        doctors[_doctor] = pendingDoctors[_doctor];
        delete pendingDoctors[_doctor];

        emit DoctorApproved(
            _doctor,
            doctors[_doctor].name,
            doctors[_doctor].hospital,
            doctors[_doctor].specialization
        );
    }

    function getDoctor(address _doctor)
        public
        view
        returns (string memory, string memory, string memory, bool)
    {
        Doctor memory d = doctors[_doctor];
        return (d.name, d.hospital, d.specialization, d.registered);
    }

    // =====================
    // Record Functions
    // =====================

    function addRecord(
        address _patient,
        string memory _ipfsHash,
        string memory _fileName,
        string memory _category
    ) public onlyRegisteredDoctor {
        Record memory newRecord = Record({
            fileName: _fileName,
            category: _category,
            ipfsHash: _ipfsHash,
            patient: _patient,
            doctor: msg.sender,
            timestamp: block.timestamp,
            verified: false
        });

        patientRecords[_patient].push(newRecord);

        emit RecordAdded(_patient, msg.sender, _ipfsHash, block.timestamp);
    }

    function getRecords(address _patient) public view returns (Record[] memory) {
        return patientRecords[_patient];
    }

    // =====================
    // Patient approval/decline
    // =====================

    function approveRecord(uint index) public {
        require(index < patientRecords[msg.sender].length, "Invalid record index");
        patientRecords[msg.sender][index].verified = true;
        emit RecordApproved(msg.sender, index);
    }

    function declineRecord(uint index) public {
        require(index < patientRecords[msg.sender].length, "Invalid record index");

        // Shift array elements left
        for (uint i = index; i < patientRecords[msg.sender].length - 1; i++) {
            patientRecords[msg.sender][i] = patientRecords[msg.sender][i + 1];
        }

        // Remove last element
        patientRecords[msg.sender].pop();

        emit RecordDeclined(msg.sender, index);
    }


// =====================
    // Pending policy workflow (new)
    // =====================
    // Called by patient: request that insuranceCompany consider a policy
   address[] public allPatients;

function addPendingPolicy(
    string memory _companyName,
    string memory _policyNumber,
    string memory _coverageDetails,
    address _insuranceCompany
) public {
    if (pendingPolicies[msg.sender].length == 0) {
        allPatients.push(msg.sender);
    }
    pendingPolicies[msg.sender].push(
        PendingPolicy({
            companyName: _companyName,
            policyNumber: _policyNumber,
            coverageDetails: _coverageDetails,
            insuranceCompany: _insuranceCompany,
            decided: false,
            approved: false
        })
    );
    emit PolicyRequested(msg.sender, _insuranceCompany, pendingPolicies[msg.sender].length - 1);
}


    // get pending policies for a given patient (used by server)
    function getPendingPoliciesByPatient(address _patient) public view returns (PendingPolicy[] memory) {
        return pendingPolicies[_patient];
    }

    function approvePendingPolicy(address patient, uint index) public {
    PendingPolicy storage p = pendingPolicies[patient][index];
    require(p.insuranceCompany == msg.sender, "Not your policy");
    require(!p.decided, "Already decided");

    p.decided = true;
    p.approved = true;

    // add to active insurance
    Insurance memory newInsurance = Insurance({
        companyName: p.companyName,
        policyNumber: p.policyNumber,
        coverageDetails: p.coverageDetails,
        active: true
    });
    patientInsurance[patient].push(newInsurance);
}

function rejectPendingPolicy(address patient, uint index) public {
    PendingPolicy storage p = pendingPolicies[patient][index];
    require(p.insuranceCompany == msg.sender, "Not your policy");
    require(!p.decided, "Already decided");

    p.decided = true;
    p.approved = false;
}

function getPendingPoliciesForCompany(address company)
    external
    view
    returns (PendingPolicy[] memory, address[] memory, uint[] memory)
{
    uint count = 0;

    // first pass: count matching pending policies across allPatients
    for (uint p = 0; p < allPatients.length; p++) {
        address patient = allPatients[p];
        PendingPolicy[] memory list = pendingPolicies[patient];
        for (uint i = 0; i < list.length; i++) {
            PendingPolicy memory pol = list[i];
            if (!pol.decided && pol.insuranceCompany == company) {
                count++;
            }
        }
    }

    // allocate arrays
    PendingPolicy[] memory result = new PendingPolicy[](count);
    address[] memory resultPatients = new address[](count);
    uint[] memory indexes = new uint[](count);

    // second pass: populate results
    uint idx = 0;
    for (uint p = 0; p < allPatients.length; p++) {
        address patient = allPatients[p];
        PendingPolicy[] memory list = pendingPolicies[patient];
        for (uint i = 0; i < list.length; i++) {
            PendingPolicy memory pol = list[i];
            if (!pol.decided && pol.insuranceCompany == company) {
                result[idx] = pol;
                resultPatients[idx] = patient;
                indexes[idx] = i;
                idx++;
            }
        }
    }

    return (result, resultPatients, indexes);
}



    // =====================
    // Insurance (Patient’s policies)
    // =====================

    function addInsurance(
        address _patient,
        string memory _companyName,
        string memory _policyNumber,
        string memory _coverageDetails
    ) public onlyRegisteredDoctor {
        Insurance memory newInsurance = Insurance({
            companyName: _companyName,
            policyNumber: _policyNumber,
            coverageDetails: _coverageDetails,
            active: true
        });

        patientInsurance[_patient].push(newInsurance);
    }

    function getInsurance(address _patient) public view returns (Insurance[] memory) {
        return patientInsurance[_patient];
    }

    // =====================
    // Claims
    // =====================

    // Modified to accept bill IPFS hash
    function raiseClaim(
        string memory _policyNumber,
        string memory _reason,
        address _insuranceCompany,
        string memory _billIpfsHash
    ) public {
        require(insuranceCompanies[_insuranceCompany].registered, "Invalid insurance company");

        insuranceClaims[_insuranceCompany].push(
            Claim({
                patient: msg.sender,
                policyNumber: _policyNumber,
                reason: _reason,
                billIpfsHash: _billIpfsHash,
                timestamp: block.timestamp,
                approved: false,
                decided: false
            })
        );

        emit ClaimRaised(msg.sender, _policyNumber, _reason, _billIpfsHash, block.timestamp);
    }

    function getClaims(address _insuranceCompany) public view returns (Claim[] memory) {
        return insuranceClaims[_insuranceCompany];
    }

    function approveClaim(uint _index) public {
        require(insuranceCompanies[msg.sender].registered, "Only insurance company can approve");
        require(_index < insuranceClaims[msg.sender].length, "Invalid claim index");
        require(!insuranceClaims[msg.sender][_index].decided, "Already processed");

        insuranceClaims[msg.sender][_index].approved = true;
        insuranceClaims[msg.sender][_index].decided = true;

        emit ClaimApproved(msg.sender, insuranceClaims[msg.sender][_index].patient, _index);
    }

    function declineClaim(uint _index) public {
        require(insuranceCompanies[msg.sender].registered, "Only insurance company can decline");
        require(_index < insuranceClaims[msg.sender].length, "Invalid claim index");
        require(!insuranceClaims[msg.sender][_index].decided, "Already processed");

        insuranceClaims[msg.sender][_index].approved = false;
        insuranceClaims[msg.sender][_index].decided = true;

        emit ClaimDeclined(msg.sender, insuranceClaims[msg.sender][_index].patient, _index);
    }

    // =====================
    // Insurance Company Registration (mirror of doctor flow)
    // =====================

    function requestInsuranceCompany(
        string memory _name,
        string memory _licenseNumber
    ) public {
        require(!insuranceCompanies[msg.sender].registered, "Already registered");
        require(!pendingInsuranceCompanies[msg.sender].registered, "Already pending approval");

        pendingInsuranceCompanies[msg.sender] = InsuranceCompany({
            name: _name,
            licenseNumber: _licenseNumber,
            registered: true
        });

        pendingInsuranceAddresses.push(msg.sender);

        emit InsuranceCompanyRequested(msg.sender, _name, _licenseNumber);
    }

    function approveInsuranceCompany(address _company) public onlyAdmin {
        require(!insuranceCompanies[_company].registered, "Already approved");
        require(pendingInsuranceCompanies[_company].registered, "Not pending approval");

        insuranceCompanies[_company] = InsuranceCompany({
            name: pendingInsuranceCompanies[_company].name,
            licenseNumber: pendingInsuranceCompanies[_company].licenseNumber,
            registered: true
        });

        emit InsuranceCompanyApproved(
            _company,
            insuranceCompanies[_company].name,
            insuranceCompanies[_company].licenseNumber
        );

        // remove from pending map
        delete pendingInsuranceCompanies[_company];

        // and from index array
        for (uint i = 0; i < pendingInsuranceAddresses.length; i++) {
            if (pendingInsuranceAddresses[i] == _company) {
                pendingInsuranceAddresses[i] = pendingInsuranceAddresses[pendingInsuranceAddresses.length - 1];
                pendingInsuranceAddresses.pop();
                break;
            }
        }
    }

    function getPendingInsuranceCompanies()
        public
        view
        returns (InsuranceCompany[] memory, address[] memory)
    {
        uint count = pendingInsuranceAddresses.length;
        InsuranceCompany[] memory companies = new InsuranceCompany[](count);
        address[] memory addrs = new address[](count);

        for (uint i = 0; i < count; i++) {
            address a = pendingInsuranceAddresses[i];
            companies[i] = pendingInsuranceCompanies[a];
            addrs[i] = a;
        }
        return (companies, addrs);
    }
    // =====================
    // Utility: get pending policy count for patient (optional)
    // =====================
    function getPendingPolicyCount(address _patient) public view returns (uint) {
        return pendingPolicies[_patient].length;
    }
}
