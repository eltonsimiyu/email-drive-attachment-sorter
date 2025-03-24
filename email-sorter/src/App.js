import React, { useState, useEffect } from "react";
import axios from "axios";
import "bootstrap/dist/css/bootstrap.min.css";

function App() {
  const [email, setEmail] = useState(localStorage.getItem("email") || "");
  const [startDate, setStartDate] = useState(""); // Start Date
  const [endDate, setEndDate] = useState(""); // End Date
  const [message, setMessage] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(false); // Loading state

  // ? Check authentication status on page load
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

  // ? Handle Google Authentication
  const handleAuth = async () => {
    if (!email) {
      setMessage("?? Please enter your email first.");
      return;
    }

    try {
      localStorage.setItem("email", email); // Save email for future use
      const response = await axios.get(
        `http://localhost:3000/auth?email=${email}`,
        { withCredentials: true }
      );
      console.log("Received Auth URL:", response.data.authUrl);
      window.location.href = response.data.authUrl; // Redirect to Google OAuth
    } catch (error) {
      console.error("Error initiating authentication:", error);
      setMessage("? Failed to authenticate. Please try again.");
    }
  };

  // ? Fetch Attachments from Backend with Date Filter
  const handleSort = async () => {
    if (!isAuthenticated) {
      setMessage("?? Please authenticate first.");
      return;
    }

    if (!startDate && !endDate) {
      setMessage("?? Please select a start or end date.");
      return;
    }

    setLoading(true);
    setMessage("?? Fetching email attachments...");
    setAttachments([]);

    try {
      const response = await axios.get(
        `http://localhost:3000/fetch-attachments?email=${email}&startDate=${startDate}&endDate=${endDate}`,
        { withCredentials: true }
      );

      if (response.data.attachments && response.data.attachments.length > 0) {
        setAttachments(response.data.attachments);
        setMessage(`? Found ${response.data.attachments.length} attachments!`);
      } else {
        setMessage("?? No attachments found for the selected dates.");
      }
    } catch (error) {
      console.error("Error fetching attachments:", error);
      setMessage("? Error fetching attachments.");
    } finally {
      setLoading(false);
    }
  };

  // ? Clear Date Filters
  const clearDates = () => {
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="container d-flex justify-content-center align-items-center vh-100">
      <div className="card shadow p-4 text-center" style={{ maxWidth: "400px", width: "100%" }}>
        <h2 className="mb-3">?? Email Attachment Sorter</h2>

        {/* Email Input */}
        <input
          type="email"
          className="form-control mb-3"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* Start Date Input */}
        <input
          type="date"
          className="form-control mb-2"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        {/* End Date Input */}
        <input
          type="date"
          className="form-control mb-2"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
        />

        {/* Clear Dates Button */}
        <button className="btn btn-secondary w-100 mb-3" onClick={clearDates}>
          Clear Dates
        </button>

        {!isAuthenticated ? (
          <button className="btn btn-success w-100 mb-3" onClick={handleAuth}>
            Authenticate with Google
          </button>
        ) : (
          <button className="btn btn-primary w-100 mb-3" onClick={handleSort} disabled={loading}>
            {loading ? "Fetching..." : "Fetch Attachments"}
          </button>
        )}

        <p className="text-muted">{message}</p>

        {/* Attachments List */}
        {attachments.length > 0 && (
          <div className="mt-3">
            <h5>Attachments ({attachments.length}):</h5>
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
