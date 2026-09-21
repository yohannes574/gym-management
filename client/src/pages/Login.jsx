import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dumbbell, LogIn, AlertCircle } from "lucide-react";
import { API_URL, saveAuth } from "../api/api";
import AuthBrand from "../components/AuthBrand";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Login failed.");
        return;
      }

      // Save token + user (role is used by the route guards)
      saveAuth(data.token, data.user);

      setMessage("Login successful!");

      // /dashboard sends each role to its own dashboard
      setTimeout(() => {
        navigate("/dashboard");
      }, 500);
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <AuthBrand subtitle="The all-in-one platform for your gym — memberships, attendance, training and payments." />

      <div className="auth-form-side">
        <div className="auth-card">
          <div className="auth-logo">
            <Dumbbell />
          </div>

          <h1>Welcome back</h1>

          <p className="auth-subtitle">
            Sign in to your GymPro account
          </p>

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>Email</label>
              <input
                type="email"
                placeholder="Enter your email"
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

            <button
              type="submit"
              className="auth-btn"
              disabled={loading}
            >
              {loading ? "Signing in..." : (
                <>
                  <LogIn />
                  Login
                </>
              )}
            </button>
          </form>

          {message && (
            <p className={`auth-message ${message === "Login successful!" ? "success" : ""}`}>
              <AlertCircle />
              {message}
            </p>
          )}

          <p className="auth-footer">
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;