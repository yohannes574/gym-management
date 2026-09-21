import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, AlertCircle } from "lucide-react";
import { API_URL, saveAuth } from "../api/api";
import AuthBrand from "../components/AuthBrand";

function StaffLogin() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [staffCode, setStaffCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/auth/staff/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, staffCode }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Staff login failed.");
        return;
      }

      saveAuth(data.token, data.user);

      navigate("/dashboard/owner");
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page staff">
      <AuthBrand subtitle="Restricted portal for gym staff. Owner and receptionist accounts only." />

      <div className="auth-form-side">
        <div className="auth-card">
          <div className="auth-logo">
            <ShieldCheck />
          </div>

          <h1>Staff Portal</h1>

          <p className="auth-subtitle">
            Restricted access for gym staff only.
          </p>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                placeholder="Enter your staff email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="auth-field">
              <label>Staff Access Code</label>
              <input
                type="password"
                placeholder="Enter the staff access code"
                value={staffCode}
                onChange={(e) => setStaffCode(e.target.value)}
                required
              />
            </div>

            <button
              type="submit"
              className="auth-btn"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign in to Staff Portal"}
            </button>
          </form>

          {message && (
            <p className="auth-message">
              <AlertCircle />
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default StaffLogin;