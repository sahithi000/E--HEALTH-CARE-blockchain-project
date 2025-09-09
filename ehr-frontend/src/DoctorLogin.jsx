import React, { useState } from "react";
import axios from "axios";

function DoctorLogin({ onLogin }) {
  const [address, setAddress] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/loginDoctor", { address });
      if (res.data.success) onLogin(address, "doctor");
    } catch (err) {
      alert("Login failed");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Doctor Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <button type="submit">Login</button>
    </form>
  );
}

export default DoctorLogin;
