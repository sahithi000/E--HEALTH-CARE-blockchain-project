import React from "react";
import "./Landing.css";
import healthImage from "./healthcare.jpg"; // Add a healthcare-related image in src folder

function Landing({ onEnter }) {
  return (
    <div className="landing-container">
      <div className="landing-content">
        <h1 className="landing-title">E-Health Care System</h1>
        <p className="landing-subtitle">Secure, Digital, and Easy Access to Your Health Records</p>
        <button className="landing-button" onClick={onEnter}>Enter</button>
      </div>
      <div className="landing-image-container">
        <img src={healthImage} alt="Healthcare" className="landing-image" />
      </div>
    </div>
  );
}

export default Landing;
