import { useState } from "react";

function App() {
  const [message, setMessage] = useState("");

  const checkBackend = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/health`
      );

      const data = await response.json();

      setMessage(data.message);
    } catch (error) {
      console.error(error);
      setMessage("Backend connection failed");
    }
  };

  return (
    <div>
      <h1>NEXUS DevOps Staging</h1>

      <p>React Frontend</p>

      <button onClick={checkBackend}>
        Check Backend
      </button>

      <p>{message}</p>
      <sub>copyright © 2026 Nexus School Management System</sub>
    </div>
  );
}

export default App;