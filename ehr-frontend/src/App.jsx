import React, { useState, useEffect } from "react";
import Upload from "./Upload";
import Web3 from "web3";
import axios from "axios";
import DoctorRegistration from "./DoctorRegistration"; 
import Landing from "./Landing";
import "./App.css";

function App() {
  const [user, setUser] = useState({ address: "", role: "" }); 
  const [patient, setPatient] = useState("");
  const [insurance, setInsurance] = useState([]);
  const [companyPolicies, setCompanyPolicies] = useState([]);
const [doctorInfo, setDoctorInfo] = useState(null);

  const [records, setRecords] = useState([]);
  const [showLanding, setShowLanding] = useState(true);
  const [lastHash, setLastHash] = useState("");
  const [contractABI, setContractABI] = useState(null);
  const [doctorRegistered, setDoctorRegistered] = useState(false);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [filterCategory, setFilterCategory] = useState("All");
  const [claims, setClaims] = useState([]);
  const [pendingInsurance, setPendingInsurance] = useState([]);
  const [insuranceRegistered, setInsuranceRegistered] = useState(false);
  const [pendingPolicies, setPendingPolicies] = useState([]);

  const web3 = new Web3("http://127.0.0.1:7545");
  const contractAddress = "0xf49aC32a7215ba48EE8C44Ca4ee137f6a5Be892b";

  // Load ABI
  useEffect(() => {
    const loadABI = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/abi");
        setContractABI(res.data);
      } catch (err) {
        console.error("Failed to load ABI:", err);
      }
    };
    loadABI();
  }, []);
   // Fetch doctor info in App.jsx
  useEffect(() => {
    const fetchDoctor = async () => {
      if (!user.address) return;
      try {
        const res = await axios.get(`http://localhost:5000/getDoctor/${user.address}`);
        setDoctorInfo(res.data.doctor);
      } catch (err) {
        setDoctorInfo(null);
      }
    };
    fetchDoctor();
  }, [user.address]);

  useEffect(() => {
    getRecords();
    getInsurance();
    fetchPendingPolicies();
  }, [user.address]); // Load when user address changes

  const fetchPendingPolicies = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/getPendingPoliciesByPatient/${user.address}`);
      setPendingPolicies(res.data.pending || []);
    } catch (err) {
      console.error("Error fetching pending policies:", err);
    }
  };
  // Get patient records
  const getRecords = async () => {
    // if (!patient) return alert("Enter a patient address first!");

    try {
      const res = await axios.get(`http://localhost:5000/getRecords/${patient}`);
      const recs = res.data.records;
      setRecords(recs);

      if (recs.length > 0) setLastHash(recs[recs.length - 1].ipfsHash);
      // else alert("No records found for this patient");
    } catch (err) {
      console.error(err);
      // alert("Error fetching records: " + err.response?.data?.error || err.message);
    }
  };

  // Fetch insurance details
  const getInsurance = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/getInsurance/${user.address}`);
      setInsurance(res.data.insurance || []);
    } catch (err) {
      console.error("Error fetching insurance:", err);
    }
  };

  // Handle login
  const handleLogin = async (role, address) => {
    if (!address) return alert("Please enter an address");

    if (role === "doctor") {
      try {
        const res = await axios.get(`http://localhost:5000/getDoctor/${address}`);
        setDoctorRegistered(res.data.doctor.registered);
      } catch (err) {
        console.error(err);
        alert("Error checking doctor registration");
        return;
      }
    }
    if (role === "insurance") {
  try {
    const res = await axios.get(`http://localhost:5000/getInsuranceStatus/${address}`);
    if (res.data.status === "approved") {
      setInsuranceRegistered(true);
    } else if (res.data.status === "pending") {
      alert("Your registration is pending admin approval.");
      setInsuranceRegistered(false);
    } else {
      setInsuranceRegistered(false);
    }
  } catch (err) {
    console.error("Error checking insurance status:", err);
    setInsuranceRegistered(false);
  }
}


    setUser({ role, address });
    if (role === "patient") setPatient(address);
  };

  const handleLogout = () => {
    setUser({ address: "", role: "" });
    setPatient("");
    setRecords([]);
    setDoctorRegistered(false);
    setPendingDoctors([]);
  };

  // Fetch pending doctors for Admin
  const fetchPendingDoctors = async () => {
    try {
      const res = await axios.get("http://localhost:5000/getPendingDoctors");
      setPendingDoctors(res.data.doctors);
    } catch (err) {
      console.error(err);
      alert("Error fetching pending doctors");
    }
  };

  const fetchPendingInsurance = async () => {
    try {
      const res = await axios.get("http://localhost:5000/getPendingInsurance");

      let companies = [];
      let addresses = [];

      const insuranceCompanies = res.data.insuranceCompanies;

      if (Array.isArray(insuranceCompanies) && insuranceCompanies.length === 2) {
        companies = insuranceCompanies[0];
        addresses = insuranceCompanies[1];
      } else if (insuranceCompanies[0] && insuranceCompanies[1]) {
        companies = insuranceCompanies[0];
        addresses = insuranceCompanies[1];
      } else {
        console.error("Unexpected format:", insuranceCompanies);
      }

      const pending = companies.map((company, idx) => ({
        ...company,
        address: addresses[idx]
      }));

      setPendingInsurance(pending);
    } catch (err) {
      console.error(err);
      alert("Error fetching pending insurance companies");
    }
  };

  const approveInsurance = async (companyAddress) => {
    try {
      const res = await axios.post("http://localhost:5000/approveInsuranceCompany", {
        companyAddress,
        adminAddress: user.address,
      });
      alert("Insurance company approved! TxHash: " + res.data.txHash);
      fetchPendingInsurance();
    } catch (err) {
      console.error(err);
      alert("Error approving insurance company");
    }
  };

  // Approve a doctor (Admin)
  const approveDoctor = async (doctorAddress) => {
    try {
      const res = await axios.post("http://localhost:5000/approveDoctor", {
        doctorAddress,
        adminAddress: user.address,
      });
      alert("Doctor approved! TxHash: " + res.data.txHash);
      fetchPendingDoctors();
    } catch (err) {
      console.error(err);
      alert("Error approving doctor");
    }
  };

  if (showLanding) {
    return <Landing onEnter={() => setShowLanding(false)} />;
  }

  // LOGIN FORM
  if (!user.role) {
    return (
      <div className="login-container">
        <div style={{ padding: "20px" }} className="login-form">
          {/* <h2>EHR LOGIN</h2> */}
          <div>
            <input type="text" placeholder="Doctor Address" id="doctorAddress" />
            <button onClick={() => handleLogin("doctor", document.getElementById("doctorAddress").value)}>
              Login as Doctor
            </button>
          </div>
          <div style={{ marginTop: "20px" }}>
            <input type="text" placeholder="Patient Address" id="patientAddress" />
            <button onClick={() => handleLogin("patient", document.getElementById("patientAddress").value)}>
              Login as Patient
            </button>
          </div>
          
        </div>
        <div>
        <div style={{ marginTop: "20px" }} className="login-welcome">
          {/* <h3>Insurance Company Login</h3> */}
          <div >
          <input type="text" placeholder="Company Address" id="companyAddress" />
          <button onClick={() => handleLogin("insurance", document.getElementById("companyAddress").value)}>
            Login as Insurer
          </button>
          </div>
        </div>
        <div style={{ marginTop: "20px" }}>
            <input type="text" placeholder="Admin Address" id="adminAddress"  />
            <button onClick={() => handleLogin("admin", document.getElementById("adminAddress").value)}>
              Login as Admin
            </button>
          </div>
      </div>
      </div>
    );
  }
//doctor dashboard
  if (user.role === "doctor") {
    
  return (
    <div style={{ padding: "20px" }}>
      <h2 className="dd">
        Doctor Dashboard {doctorInfo && (
          <span className="doctor-info-badge">
            Dr. {doctorInfo.name} | {doctorInfo.hospital} | {doctorInfo.specialization}
          </span>
        )}
        <button className="lg" onClick={handleLogout}>
          logout
        </button>
      </h2>

      {!doctorRegistered ? (
        <>
          <p className="pp">Your account is not approved yet. Request registration below:</p>
          <DoctorRegistration address={user.address} />
        </>
      ) : (
        <>
          <div className="doctor-dashboard-container">
            {/* Upload Section */}
            <div className="dupload">
              <Upload
                patientAddress={patient}
                parentHash={lastHash}
                doctorAddress={user.address}
                onUpload={getRecords}
              />
            </div>

            {/* Get Records Section */}
            <div className="dashboard">
              <div className="dashboard-content">
                <input
                  type="text"
                  placeholder="Patient Address"
                  value={patient}
                  onChange={(e) => setPatient(e.target.value)}
                />
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="All">All</option>
                  <option value="Prescription">Prescription</option>
                  <option value="Lab Report">Lab Report</option>
                  <option value="Scan">Scan</option>
                  <option value="Discharge Summary">Discharge Summary</option>
                </select>
                <button onClick={getRecords}>Get Patient Records</button>
              </div>
            </div>
          </div>

          <div className="precords">
            <h3>Patient Records:</h3>
            {records.length === 0 ? (
              <p>No records found for this patient.</p>
            ) : (
              <ul>
                {records.filter((r) => filterCategory === "All" || r.category === filterCategory).map((r, idx) => (
                  <li key={idx}>
                    Category: {r.category || "N/A"} <br/> 
                    IPFS: <a href={`https://gateway.pinata.cloud/ipfs/${r.ipfsHash}`} target="_blank" rel="noreferrer">{r.fileName || r.ipfsHash}</a><br/>
                    Doctor: Dr. {r.doctorName} ({r.hospital}, {r.specialization}) <br/>
                    Timestamp: {new Date(Number(r.timestamp)).toLocaleString()}<br/>
                    Parent: {r.parentHash || "N/A"}
                    Status: {r.verified ? "✅ Approved" : "❌ Pending/Declined"}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}

  // PATIENT DASHBOARD
  if (user.role === "patient") {
    return (
      <div style={{ padding: "20px" }} className="patient-dashboard">
        <h2>Patient Dashboard <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          style={{ marginBottom: "10px" }}
        >
          <option value="All">All</option>
          <option value="Prescription">Prescription</option>
          <option value="Lab Report">Lab Report</option>
          <option value="Scan">Scan</option>
          <option value="Discharge Summary">Discharge Summary</option>
        </select><button onClick={getRecords} className="rb">Refresh Records</button><button onClick={handleLogout} style={{ marginTop: "20px" }} className="lb">Logout</button></h2>
        
        
        
        <div className="dashboard-content2">
        
        <div className="left-column">

        <h3>Records List:</h3>
        {records.length === 0 ? (
          <p>No records found.</p>
        ) : (
          <ul>
            {records.filter((r) => filterCategory === "All" || r.category === filterCategory).map((r, idx) => (
              <li key={idx}>
                File: {r.fileName || "Unknown"}  <br/>
                Category: {r.category || "N/A"} <br/> 
                IPFS: <a href={`https://gateway.pinata.cloud/ipfs/${r.ipfsHash}`} target="_blank" rel="noreferrer">{r.fileName || r.ipfsHash}</a><br/>
                Doctor: Dr. {r.doctorName} ({r.hospital}, {r.specialization}) <br/>
                <br/>
                Timestamp: {new Date(Number(r.timestamp)).toLocaleString()}<br/>
                Status: {r.verified ? "✅ Approved" : "⏳ Pending"}<br/>

                {!r.verified && (
                  <>
                    <button
                      onClick={async () => {
                        await axios.post("http://localhost:5000/approveRecord", { patientAddress: user.address, index: idx });
                        getRecords();
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={async () => {
                        if (window.confirm("Are you sure you want to decline and delete this record?")) {
                          await axios.post("http://localhost:5000/declineRecord", { patientAddress: user.address, index: idx });
                          getRecords();
                        }
                      }}
                      style={{ marginLeft: "10px", color: "white" }}
                    >
                      Decline ❌
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
        <button onClick={getInsurance} style={{ marginLeft: "10px" }}>Refresh Insurance</button>
        <div style={{ marginTop: "20px", padding: "15px", border: "1px solid #f6f1f1ff", borderRadius: "8px" }}>
          <h3>Insurance Details</h3>
          {insurance.length === 0 ? (
            <p>No insurance records found.</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", marginTop: "10px" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Company Name</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Policy Number</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Coverage Details</th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {insurance.map((ins, idx) => (
                  <tr key={idx}>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>{ins.companyName}</td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>{ins.policyNumber}</td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>{ins.coverageDetails}</td>
                    <td
                      style={{
                        border: "1px solid #ddd",
                        padding: "8px",
                        color: ins.active ? "green" : "red",
                        fontWeight: "bold"
                      }}
                    >
                      {ins.active ? "Active ✅" : "Expired ❌"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <h3> Policy Requests</h3>
<button onClick={async () => {
  const res = await axios.get(`http://localhost:5000/getPendingPoliciesByPatient/${user.address}`);
  setPendingPolicies(res.data.pending || []);
}}>
  History of Policies
</button>
<ul>
  {pendingPolicies.map((p, idx) => (
    <li key={idx}>
      {p.companyName} - {p.policyNumber} : {p.decided ? (p.approved ? "✅ Approved" : "❌ Rejected") : "⏳ Pending"}
    </li>
  ))}
</ul></div>
<div className="right-column">
  <div className="request-policy-section">
<h3>Request New Policy</h3>
<input id="companyAddr" placeholder="Insurance Company Address" />
<input id="companyName" placeholder="Company Name" />
<input id="policyNo" placeholder="Policy Number" />
<input id="coverage" placeholder="Coverage Details" />
<button onClick={async () => {
  await axios.post("http://localhost:5000/requestPolicy", {
    patientAddress: user.address,
    insuranceCompany: document.getElementById("companyAddr").value,
    companyName: document.getElementById("companyName").value,
    policyNumber: document.getElementById("policyNo").value,
    coverageDetails: document.getElementById("coverage").value,
  });
  alert("Policy request submitted!");
}}>
  Submit Request
</button>
</div>
</div>
</div>
        

        
      </div>
    );
  }

  // ADMIN DASHBOARD
  if (user.role === "admin") {
    return (
      
        
      <div style={{ padding: "20px" }} className="admin-dashboard">
        <h2>Admin Dashboard <button className="ab" onClick={handleLogout} style={{ marginTop: "20px" }}>Logout</button></h2>
        <div className="admin-sections">
          <div className="pending-doctors-section">
          <h3>Pending Doctors</h3>
        <button onClick={fetchPendingDoctors}>Load Pending Doctors</button>
        {pendingDoctors.length === 0 ? (
          <p>No pending doctors.</p>
        ) : (
          <ul>
            {pendingDoctors.map((d, idx) => (
              <li key={idx}>
                Name: {d.name}, Hospital: {d.hospital}, Specialization: {d.specialization} <br />
                Address: {d.address} <br />
                <button onClick={() => approveDoctor(d.address)}>Approve</button>
              </li>
            ))}
          </ul>
        )}
        </div>
        
        <div className="pending-insurance-section">
          <h3>Pending Insurance Companies</h3>
        <button onClick={fetchPendingInsurance}>Load Pending Insurance </button>
        {pendingInsurance.length === 0 ? (
          <p>No pending insurance companies.</p>
        ) : (
          <ul>
            {pendingInsurance.map((c, idx) => (
              <li key={idx}>
                Name: {c.name}, License: {c.licenseNumber} <br />
                Address: {c.address} <br />
                <button onClick={() => approveInsurance(c.address)}>Approve</button>
              </li>
            ))}
          </ul>
        )}
        </div>
        </div>
        
      </div>
    );
  }


// =====================
// INSURANCE DASHBOARD
// =====================
if (user.role === "insurance") {
  const fetchClaims = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/getClaims/${user.address}`);
      setClaims(res.data.claims || []);
    } catch (err) {
      console.error(err);
      alert("Error fetching claims");
    }
  };

  return (
    <div style={{ padding: "20px" }} className="insurance-dashboard">
      <h2>Insurance Dashboard <button onClick={handleLogout} style={{ marginTop: "20px" }}>
            Logout
          </button> </h2>

      {!insuranceRegistered ? (
        <>
          <p>Your company is not approved yet. Request registration below:</p>
          <input type="text" placeholder="Company Name" id="companyName" />
          <input type="text" placeholder="License Number" id="licenseNumber" />
          <button
            onClick={async () => {
              await axios.post("http://localhost:5000/requestInsuranceCompany", {
                name: document.getElementById("companyName").value,
                licenseNumber: document.getElementById("licenseNumber").value,
                companyAddress: user.address,
              });
              alert("Registration request submitted! Please wait for admin approval.");
              setInsuranceRegistered(false);
            }}
          >
            Register Company
          </button>
        </>
      ) : (
        <>
          
          
          <h3 style={{ marginTop: "30px" }}>Pending Policy Requests</h3>
          <button
            onClick={async () => {
              const res = await axios.get(
                `http://localhost:5000/getPendingPoliciesForCompany/${user.address}`
              );
              setCompanyPolicies(
                res.data.pendingRequests.map((p, idx) => ({
                  ...p,
                  patient: res.data.patients[idx],
                  index: res.data.indexes[idx],
                }))
              );
            }}
          >
            Load Requests
          </button>

          <ul>
            {companyPolicies.map((p, idx) => (
              <li key={idx} style={{ margin: "10px 0" }}>
                Patient: {p.patient} | Policy: {p.policyNumber} | Coverage: {p.coverageDetails}
                {!p.decided && (
                  <>
                    <button
                      onClick={async () => {
                        await axios.post("http://localhost:5000/approvePendingPolicy", {
                          companyAddress: user.address,
                          patientAddress: p.patient,
                          index: p.index,
                        });
                        alert("Approved");
                        // Refresh the list after approval
                        const res = await axios.get(`http://localhost:5000/getPendingPoliciesForCompany/${user.address}`);
                        setCompanyPolicies(res.data.pendingRequests.map((p, idx) => ({
                          ...p,
                          patient: res.data.patients[idx],
                          index: res.data.indexes[idx],
                        })));
                      }}
                      style={{ marginLeft: "10px" }}
                    >
                      Approve ✅
                    </button>
                    <button
                      onClick={async () => {
                        await axios.post("http://localhost:5000/rejectPendingPolicy", {
                          companyAddress: user.address,
                          patientAddress: p.patient,
                          index: p.index,
                        });
                        alert("Rejected");
                        // Refresh the list after rejection
                        const res = await axios.get(`http://localhost:5000/getPendingPoliciesForCompany/${user.address}`);
                        setCompanyPolicies(res.data.pendingRequests.map((p, idx) => ({
                          ...p,
                          patient: res.data.patients[idx],
                          index: res.data.indexes[idx],
                        })));
                      }}
                      style={{ marginLeft: "10px", color: "red" }}
                    >
                      Reject ❌
                    </button>
                  </>
                )}
                {p.decided && <span> → {p.approved ? "✅ Approved" : "❌ Rejected"}</span>}
              </li>
            ))}
          </ul>

          
        </>
      )}
    </div>
  );
}

return null;
}

export default App;