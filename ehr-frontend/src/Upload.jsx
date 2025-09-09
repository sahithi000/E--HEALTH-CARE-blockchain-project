import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Upload.css";
function Upload({ patientAddress, parentHash, doctorAddress, onUpload }) { // receive doctorAddress from App.jsx
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState("");
  const [doctorInfo, setDoctorInfo] = useState(null);
  const [category, setCategory] = useState("Prescription");
  // Fetch doctor info from backend
  useEffect(() => {
    const fetchDoctor = async () => {
      if (!doctorAddress) return;
      try {
        const res = await axios.get(`http://localhost:5000/getDoctor/${doctorAddress}`);
        setDoctorInfo(res.data.doctor);
      } catch (err) {
        setDoctorInfo(null);
      }
    };
    fetchDoctor();
  }, [doctorAddress]);

  const handleUpload = async () => {
    if (!file) return setMessage("Select a file first!");
    if (!doctorInfo || !doctorInfo.registered) return setMessage("You are not a registered doctor ❌");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("patientAddress", patientAddress);
    formData.append("parentHash", parentHash || "");
    formData.append("doctorAddress", doctorAddress); // important: send doctor address to backend
    formData.append("category", category);
    try {
      const res = await axios.post("http://localhost:5000/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(`Uploaded! IPFS: ${res.data.ipfsHash}`);
      if (onUpload) onUpload(res.data.ipfsHash);
    } catch (err) {
      setMessage("Upload failed: " + err.response?.data?.error || err.message);
    }
  };

  return (
    <div className="upload-container">
      
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <select value={category} onChange={(e) => setCategory(e.target.value)}>select
        <option value="All">All</option>
  <option value="Prescription">Prescription</option>
  <option value="Lab Report">Lab Report</option>
  <option value="X-Ray">X-Ray</option>
  <option value="Scan">Scan</option>
</select>
      <button onClick={handleUpload}>Upload</button>
      <p>{message}</p>
    </div>
  );
}

export default Upload;
