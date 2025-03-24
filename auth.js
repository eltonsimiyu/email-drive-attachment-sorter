import React, { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on page load
  useEffect(() => {
    axios
      .get("http://localhost:3000/check-auth", { withCredentials: true })
      .then((response) => {
        if (response.data.authenticated) {
          setIsAuthenticated(true);
        }
      })
      .catch((error) => {
        console.error("Auth check failed:", error);
        setIsAuthenticated(false);
      });
  }, []);

  // Handle Google Authentication
  const handleAuth = async () => {
    if (!email) {
      setMessage("Please enter your email first.");
      return;
    }

    try {
      const response = await axios.get(
        `http://localhost:3000/auth?email=${email}`,
        { withCredentials: true }
      );
      window.location.href = response.data.authUrl; // Redirect to Google OAuth
    } catch (error) {
      console.error("Error initiating authentication:", error);
      setMessage("Failed to authenticate. Please try again.");
    }
  };

  // Fetch Attachments from Backend
  const handleSort = async () => {
    if (!isAuthenticated) {
      setMessage("Please authenticate first.");
      return;
    }

    setMessage("Fetching email attachments...");
    setAttachments([]);

    try {
      const response = await axios.get(
        `http://localhost:3000/fetch-attachments?email=${email}`,
        { withCredentials: true }
      );

      if (response.data.attachments && response.data.attachments.length > 0) {
        setAttachments(response.data.attachments);
        setMessage("Attachments fetched successfully!");
      } else {
        setMessage("No attachments found.");
      }
    } catch (error) {
      console.error("Error fetching attachments:", error);
      setMessage("Error fetching attachments.");
    }
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card shadow p-4 text-center" style={{ maxWidth: "400px", width: "100%" }}>
        <h2 className="mb-3">📩 Email Attachment Sorter</h2>

        <input
          type="email"
          className="form-control mb-3"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {!isAuthenticated ? (
          <button className="btn btn-success w-100 mb-3" onClick={handleAuth}>
            Authenticate with Google
          </button>
        ) : (
          <button className="btn btn-primary w-100 mb-3" onClick={handleSort}>
            Fetch Attachments
          </button>
        )}

        <p className="text-muted">{message}</p>

        {attachments.length > 0 && (
          <div className="mt-3">
            <h5>Attachments:</h5>
            <ul className="list-group">
              {attachments.map((file, index) => (
                <li key={index} className="list-group-item">
                  {file.filename}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
