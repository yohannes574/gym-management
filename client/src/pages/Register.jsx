import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Dumbbell, User as UserIcon, UserRound, Hourglass, AlertCircle } from "lucide-react";
import { API_URL } from "../api/api";
import AuthBrand from "../components/AuthBrand";

function Register() {
  const navigate = useNavigate();

  const [role, setRole] = useState("member");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
          role,
          // Members need a phone number for their gym profile
          phone: role === "member" ? phone : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Registration failed.");
        return;
      }

      if (role === "trainer") {
        // Trainers must wait for owner approval
        setSuccess(true);
        setMessage(data.message);
        return;
      }

      setMessage(data.message);

      setTimeout(() => {
        navigate("/login");
      }, 1200);
    } catch (error) {
      console.error(error);
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Trainer accounts wait for owner approval
  if (success) {
    return (
      <div className="auth-page">
        <AuthBrand subtitle="Trainer registrations are reviewed by the gym owner before you can sign in." />

        <div className="auth-form-side">
          <div className="auth-card">
            <div className="auth-logo">
              <Hourglass />
            </div>

            <h1>Registration pending</h1>

            <p className="auth-subtitle">{message}</p>

            <Link to="/login" className="auth-btn">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <AuthBrand subtitle="Join the gym in minutes — manage your membership, book training sessions and track progress." />

      <div className="auth-form-side">
        <div className="auth-card">
          <div className="auth-logo">
            <Dumbbell />
          </div>

          <h1>Create Account</h1>

          <p className="auth-subtitle">
            Join the GymPro platform
          </p>

          {/* ROLE TOGGLE */}
          <div className="role-toggle">
            <button
              type="button"
              className={role === "member" ? "selected" : ""}
              onClick={() => setRole("member")}
            >
              <UserIcon />
              Member
            </button>

            <button
              type="button"
              className={role === "trainer" ? "selected" : ""}
              onClick={() => setRole("trainer")}
            >
              <UserRound />
              Trainer
            </button>
          </div>

          {role === "trainer" && (
            <p className="auth-hint">
              Trainer accounts need to be approved by the gym owner
              before you can sign in.
            </p>
          )}

          <form onSubmit={handleSubmit}>
            <div className="auth-field">
              <label>Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

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

            {role === "member" && (
              <div className="auth-field">
                <label>Phone</label>
                <input
                  type="tel"
                  placeholder="Enter your phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Create a password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>

            <button
              type="submit"
              className="auth-btn"
              disabled={loading}
            >
              {loading ? "Creating account..." : "Register"}
            </button>
          </form>

          {message && (
            <p className="auth-message">
              <AlertCircle />
              {message}
            </p>
          )}

          <p className="auth-footer">
            Already have an account? <Link to="/login">Login here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;