function PatientLogin({ onLogin }) {
  const [address, setAddress] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/loginPatient", { address });
      if (res.data.success) onLogin(address, "patient");
    } catch (err) {
      alert("Login failed");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Patient Address"
        value={address}
        onChange={(e) => setAddress(e.target.value)}
      />
      <button type="submit">Login</button>
    </form>
  );
}

export default PatientLogin;
