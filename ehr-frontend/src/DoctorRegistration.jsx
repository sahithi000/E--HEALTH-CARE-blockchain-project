import React, { useState } from "react";
import axios from "axios";
import "./DoctorRegistration.css";
import healthImage from "./dp.jpg";
function DoctorRegistration() {
  const [form, setForm] = useState({
    address: "",
    name: "",
    hospital: "",
    specialization: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/requestDoctor", form);
      alert(res.data.message + " TxHash: " + res.data.txHash);
    } catch (error) {
      console.error(error);
      alert("Error requesting doctor registration");
    }
  };

  return (
    <div className="container">
    <form onSubmit={handleSubmit}>
      <input type="text" name="address" placeholder="Doctor Address" onChange={handleChange} required /><br></br>
      <input type="text" name="name" placeholder="Doctor Name" onChange={handleChange} required /><br></br>
      <input type="text" name="hospital" placeholder="Hospital Name" onChange={handleChange} required /><br></br>
      <input type="text" name="specialization" placeholder="Specialization" onChange={handleChange} required /><br></br>
      <button type="submit">Request Registration</button>
    </form>
    <img src={healthImage} alt="Healthcare" className="landing-image" />
    </div>
  );
}

export default DoctorRegistration;
