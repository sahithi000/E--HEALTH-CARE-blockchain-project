const express = require("express");
const cors = require("cors");
const multer = require("multer");
const fs = require("fs");
const axios = require("axios");
const FormData = require("form-data");
require("dotenv").config();

const { Web3 } = require("web3");
const web3 = new Web3("http://127.0.0.1:7545");

const contractAddress = process.env.CONTRACT_ADDRESS;
const ehrArtifact = JSON.parse(fs.readFileSync("../build/contracts/EHR.json", "utf8"));
const contractABI = ehrArtifact.abi;
const contract = new web3.eth.Contract(contractABI, contractAddress);

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

let account;
web3.eth.getAccounts().then((accounts) => {
  account = accounts[0];
  console.log("Using account:", account);
});

// =====================
// Upload to IPFS
// =====================
async function uploadToIPFS(filePath) {
  const data = new FormData();
  data.append("file", fs.createReadStream(filePath));

  const res = await axios.post(
    "https://api.pinata.cloud/pinning/pinFileToIPFS",
    data,
    {
      maxBodyLength: "Infinity",
      headers: {
        "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
        Authorization: `Bearer ${process.env.PINATA_JWT}`,
      },
    }
  );
  return res.data.IpfsHash;
}

// =====================
// Upload record
// =====================
// app.post("/upload", upload.single("file"), async (req, res) => {
//   try {
//     const { patientAddress, doctorAddress } = req.body;
//     const filePath = req.file.path;
//     const fileName = req.file.originalname;
//     const ipfsHash = await uploadToIPFS(filePath);

//     const receipt = await contract.methods
//       .addRecord(patientAddress, ipfsHash, finalName)
//       .send({ from: doctorAddress, gas: 3000000 }); // <- use doctorAddress here

//     fs.unlinkSync(filePath);
//     res.json({ success: true, ipfsHash, txHash: receipt.transactionHash });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { patientAddress, doctorAddress, category } = req.body;
    const filePath = req.file.path;
    const fileName = req.file.originalname; // 👈 actual filename

    const ipfsHash = await uploadToIPFS(filePath);

    const receipt = await contract.methods
      .addRecord(patientAddress, ipfsHash, fileName, category)
      .send({ from: doctorAddress, gas: 3000000 });

    fs.unlinkSync(filePath);
    res.json({ success: true, ipfsHash, fileName, category, txHash: receipt.transactionHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// Get patient records
// =====================
// app.get("/getRecords/:patient", async (req, res) => {
//   try {
//     const patientAddress = req.params.patient;
//     const records = await contract.methods.getRecords(patientAddress).call({ from: account });

//     const formattedRecords = records.map((r) => ({
//       ipfsHash: r.ipfsHash,
//       doctor: r.doctor,
//       timestamp: Number(r.timestamp),
//       patient: r.patient
//     }));

//     res.json({ success: true, records: formattedRecords });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });
// =====================
// Get patient records
// =====================
app.get("/getRecords/:patient", async (req, res) => {
  try {
    const patientAddress = req.params.patient;
    const records = await contract.methods.getRecords(patientAddress).call({ from: account });

    const formattedRecords = await Promise.all(
      records.map(async (r) => {
        // ✅ Fetch doctor details for each record
        const doctorDetails = await contract.methods.getDoctor(r.doctor).call();

        return {
          ipfsHash: r.ipfsHash,
          doctor: r.doctor, 
          fileName: r.fileName,              // address
          category: r.category,
          doctorName: doctorDetails[0],    // name
          hospital: doctorDetails[1],      // hospital
          specialization: doctorDetails[2],// specialization
          timestamp: Number(r.timestamp),
          patient: r.patient,
          verified: r.verified             // include approval status
        };
      })
    );

    res.json({ success: true, records: formattedRecords });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// =====================
// Doctor registration request
// =====================
app.post("/requestDoctor", async (req, res) => {
  try {
    const { address, name, hospital, specialization } = req.body;
    if (!address || !name || !hospital || !specialization) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const receipt = await contract.methods
      .requestDoctorRegistration(name, hospital, specialization)
      .send({ from: address, gas: 3000000 });

    res.json({ success: true, message: "Doctor registration requested!", txHash: receipt.transactionHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// Approve doctor (Admin)
// =====================
app.post("/approveDoctor", async (req, res) => {
  try {
    const { doctorAddress } = req.body;

    const receipt = await contract.methods
      .approveDoctor(doctorAddress)
      .send({ from: account, gas: 3000000 }); // account = admin

    res.json({ success: true, txHash: receipt.transactionHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// Get doctor by address
// =====================
app.get("/getDoctor/:doctorAddress", async (req, res) => {
  try {
    const doctorAddress = req.params.doctorAddress;
    const doctor = await contract.methods.getDoctor(doctorAddress).call({ from: account });

    const formattedDoctor = {
      name: doctor[0],
      hospital: doctor[1],
      specialization: doctor[2],
      registered: doctor[3]
    };

    res.json({ success: true, doctor: formattedDoctor });
  } catch (err) {
    console.error("Error fetching doctor:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// Serve contract ABI
// =====================
app.get("/api/abi", (req, res) => {
  res.json(contractABI);
});

// =====================
// Doctor login
// =====================
app.post("/loginDoctor", async (req, res) => {
  try {
    const { address } = req.body;
    const doctor = await contract.methods.getDoctor(address).call();
    if (doctor[3]) {
      res.json({ success: true, message: "Doctor logged in", address });
    } else {
      res.status(401).json({ success: false, message: "Doctor not approved yet" });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// Patient login
// =====================
app.post("/loginPatient", async (req, res) => {
  try {
    const { address } = req.body;
    res.json({ success: true, message: "Patient logged in", address });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});
// Get all pending doctors (admin)
app.get("/getPendingDoctors", async (req, res) => {
  try {
    const accounts = await web3.eth.getAccounts();
    const pendingDoctors = [];

    for (const addr of accounts) {
      const doctor = await contract.methods.pendingDoctors(addr).call();
      if (doctor.registered) {
        pendingDoctors.push({
          address: addr,
          name: doctor.name,
          hospital: doctor.hospital,
          specialization: doctor.specialization,
        });
      }
    }

    res.json({ success: true, doctors: pendingDoctors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// Patient approve record
// =====================
app.post("/approveRecord", async (req, res) => {
  try {
    const { patientAddress, index } = req.body;
    const receipt = await contract.methods
      .approveRecord(index)
      .send({ from: patientAddress, gas: 3000000 });

    res.json({ success: true, txHash: receipt.transactionHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post("/declineRecord", async (req, res) => {
  try {
    const { patientAddress, index } = req.body;
    const receipt = await contract.methods
      .declineRecord(index)
      .send({ from: patientAddress, gas: 3000000 });

    res.json({ success: true, txHash: receipt.transactionHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});


// Add Insurance
app.post("/addInsurance", async (req, res) => {
  try {
    const { patientAddress, doctorAddress, companyName, policyNumber, coverageDetails } = req.body;

    const tx = await contract.methods
      .addInsurance(patientAddress, companyName, policyNumber, coverageDetails)
      .send({ from: doctorAddress, gas: 3000000 });

    res.json({ success: true, txHash: tx.transactionHash });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get("/getInsurance/:patient", async (req, res) => {
  try {
    const patientAddress = req.params.patient;
    const insurance = await contract.methods.getInsurance(patientAddress).call();
    res.json({ success: true, insurance });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Insurance company registration request
// =====================
// Insurance Endpoints (Fixed)
// =====================

// Insurance company registration request
app.post("/requestInsuranceCompany", async (req, res) => {
  try {
    const { name, licenseNumber, companyAddress } = req.body;
    
    if (!name || !licenseNumber || !companyAddress) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const tx = await contract.methods
      .requestInsuranceCompany(name, licenseNumber)
      .send({ from: companyAddress, gas: 3000000 });

    res.json({ success: true, txHash: tx.transactionHash });
  } catch (err) {
    console.error("Insurance registration error:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      suggestion: "Check if requestInsuranceRegistration function exists in contract"
    });
  }
});

// Get Pending Insurance Companies
app.get("/getPendingInsurance", async (req, res) => {
  try {
    const pendingCompanies = await contract.methods
      .getPendingInsuranceCompanies()
      .call({ from: account });

    res.json({ success: true, insuranceCompanies: pendingCompanies });
  } catch (err) {
    console.error("Error fetching pending insurance:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      details: "Check getPendingInsuranceCompanies function in contract"
    });
  }
});

// Admin approves insurance company
app.post("/approveInsuranceCompany", async (req, res) => {
  try {
    const { companyAddress } = req.body;
    
    const tx = await contract.methods
      .approveInsuranceCompany(companyAddress)
      .send({ from: account, gas: 3000000 });

    res.json({ success: true, txHash: tx.transactionHash });
  } catch (err) {
    console.error("Error approving insurance company:", err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      details: "Check approveInsuranceCompany function in contract"
    });
  }
});

// =====================
// Claim Management
// =====================

// Patient raises a claim
// =====================
// Raise Claim (Patient)
// =====================
// app.post("/raiseClaim", async (req, res) => {
//   try {
//     const { patientAddress, insuranceCompany, policyNumber, reason } = req.body;

//     if (!patientAddress || !insuranceCompany || !policyNumber || !reason) {
//       return res.status(400).json({ success: false, error: "All fields are required" });
//     }

//     const receipt = await contract.methods
//       .raiseClaim(policyNumber, reason, insuranceCompany)
//       .send({ from: patientAddress, gas: 3000000 });

//     res.json({ success: true, txHash: receipt.transactionHash });
//   } catch (err) {
//     console.error("Error raising claim:", err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });
// Patient raises a claim with bill upload
app.post("/raiseClaim", upload.single("bill"), async (req, res) => {
  try {
    const { patientAddress, insuranceCompany, policyNumber, reason } = req.body;

    if (!patientAddress || !insuranceCompany || !policyNumber || !reason) {
      return res.status(400).json({ success: false, error: "All fields are required" });
    }

    let billIpfsHash = "";
    if (req.file) {
      const filePath = req.file.path;
      billIpfsHash = await uploadToIPFS(filePath);
      fs.unlinkSync(filePath);
    }

    const receipt = await contract.methods
      .raiseClaim(policyNumber, reason, insuranceCompany, billIpfsHash) // ✅ update smart contract to accept bill hash
      .send({ from: patientAddress, gas: 3000000 });

    res.json({ success: true, txHash: receipt.transactionHash, billIpfsHash });
  } catch (err) {
    console.error("Error raising claim:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// Get Claims (Insurance Company)
// =====================
app.get("/getClaims/:company", async (req, res) => {
  try {
    const companyAddress = req.params.company;
    const claims = await contract.methods.getClaims(companyAddress).call();

    const formattedClaims = claims.map((c, idx) => ({
      id: idx,
      patient: c.patient,
      policyNumber: c.policyNumber,
      reason: c.reason,
      timestamp: Number(c.timestamp),
      status: c.decided ? (c.approved ? "Approved ✅" : "Declined ❌") : "Pending ⏳"
    }));

    res.json({ success: true, claims: formattedClaims });
  } catch (err) {
    console.error("Error fetching claims:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// Approve Claim (Insurance Company)
// =====================
app.post("/approveClaim", async (req, res) => {
  try {
    const { insuranceAddress, claimId } = req.body;

    const receipt = await contract.methods
      .approveClaim(claimId)
      .send({ from: insuranceAddress, gas: 3000000 });

    res.json({ success: true, txHash: receipt.transactionHash });
  } catch (err) {
    console.error("Error approving claim:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// =====================
// Decline Claim (Insurance Company)
// =====================
app.post("/declineClaim", async (req, res) => {
  try {
    const { insuranceAddress, claimId } = req.body;

    const receipt = await contract.methods
      .declineClaim(claimId)
      .send({ from: insuranceAddress, gas: 3000000 });

    res.json({ success: true, txHash: receipt.transactionHash });
  } catch (err) {
    console.error("Error declining claim:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
app.get("/getInsuranceStatus/:address", async (req, res) => {
  try {
    const address = req.params.address;

    const company = await contract.methods.insuranceCompanies(address).call();
    const pending = await contract.methods.pendingInsuranceCompanies(address).call();

    if (company.registered) {
      return res.json({ status: "approved", company });
    } else if (pending.registered) {
      return res.json({ status: "pending", company: pending });
    } else {
      return res.json({ status: "not_registered" });
    }
  } catch (err) {
    console.error("Error checking insurance status:", err);
    res.status(500).json({ error: err.message });
  }
});
app.post("/requestPolicy", async (req, res) => {
  const { patientAddress, insuranceCompany, companyName, policyNumber, coverageDetails } = req.body;
  const tx = await contract.methods
    .addPendingPolicy(companyName, policyNumber, coverageDetails, insuranceCompany)
    .send({ from: patientAddress, gas: 3000000 });
  res.json({ success: true, txHash: tx.transactionHash });
});
app.get("/getPendingPoliciesByPatient/:patient", async (req, res) => {
  const pending = await contract.methods.getPendingPoliciesByPatient(req.params.patient).call();
  res.json({ success: true, pending });
});
app.post("/approvePendingPolicy", async (req, res) => {
  const { companyAddress, patientAddress, index } = req.body;
  try {
    const tx = await contract.methods
      .approvePendingPolicy(patientAddress, index)
      .send({ from: companyAddress, gas: 3000000 });
    res.json({ txHash: tx.transactionHash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/rejectPendingPolicy", async (req, res) => {
  const { companyAddress, patientAddress, index } = req.body;
  try {
    const tx = await contract.methods
      .rejectPendingPolicy(patientAddress, index)
      .send({ from: companyAddress, gas: 3000000 });
    res.json({ txHash: tx.transactionHash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/getPendingPoliciesForCompany/:company", async (req, res) => {
  try {
    const { company } = req.params;
    const result = await contract.methods.getPendingPoliciesForCompany(company).call();
    // Convert BigInt / BN to string
    const pendingRequests = result[0].map((bn) => bn.toString());
    const patients = result[1]; // assuming addresses, already string
    const indexes = result[2].map((bn) => bn.toString());
    res.json({
      pendingRequests,
      patients,
      indexes,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});


app.listen(5000, () => console.log("Server running on http://localhost:5000"));
