import React, { useState } from "react";
import axios from "axios";

function ViewRecords() {
  const [patientAddress, setPatientAddress] = useState("");
  const [records, setRecords] = useState([]);
  const [message, setMessage] = useState("");

  const fetchRecords = async () => {
    if (!patientAddress) {
      setMessage("Please enter a patient address!");
      return;
    }

    try {
      const res = await axios.get(
        `http://localhost:5000/getRecords/${patientAddress}`
      );

      if (res.data.success) {
        setRecords(res.data.records);
        setMessage(`Found ${res.data.records.length} record(s).`);
      } else {
        setRecords([]);
        setMessage("No records found.");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error fetching records. Check backend logs.");
      setRecords([]);
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>View Patient Records</h2>

      <input
        type="text"
        placeholder="Enter Patient Address"
        value={patientAddress}
        onChange={(e) => setPatientAddress(e.target.value)}
        style={{ marginBottom: "10px", display: "block", width: "400px" }}
      />

      <button onClick={fetchRecords}>Fetch Records</button>

      <p>{message}</p>

      {records.length > 0 && (
        <table border="1" cellPadding="10" style={{ marginTop: "20px" }}>
          <thead>
            <tr>
              <th>IPFS Link</th>
              <th>Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {records.map((record, index) => (
              <tr key={index}>
                <td>
                  <a
                    href={`https://gateway.pinata.cloud/ipfs/${record.ipfsHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {record.ipfsHash}
                  </a>
                </td>
                <td>{new Date(record.timestamp * 1000).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default ViewRecords;
