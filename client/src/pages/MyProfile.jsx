import { useEffect, useState } from "react";
import { User, Lock } from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch, getToken, saveAuth } from "../api/api";

function MyProfile() {
  const [, setProfile] = useState(null);

  // Profile form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("other");
  const [profileMessage, setProfileMessage] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    try {
      setLoading(true);

      const response = await apiFetch("/auth/me");
      const data = await response.json();

      if (!response.ok) {
        setProfileMessage(
          data.message || "Failed to load your profile."
        );
        return;
      }

      setProfile(data);

      // Pre-fill the edit form
      setName(data.user.name || "");
      setEmail(data.user.email || "");
      setPhone(data.member?.phone || "");
      setGender(data.member?.gender || "other");
    } catch (error) {
      console.error(error);
      setProfileMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileMessage("");

    if (!name.trim() || !email.trim()) {
      setProfileMessage("Name and email are required.");
      return;
    }

    try {
      setProfileSaving(true);

      const response = await apiFetch("/auth/me", {
        method: "PUT",
        body: JSON.stringify({ name, email, phone, gender }),
      });

      const data = await response.json();

      if (!response.ok) {
        setProfileMessage(
          data.message || "Could not save your profile."
        );
        return;
      }

      // Refresh the cached user in localStorage so the sidebar
      // and any other place reading `getUser()` see the new name/email
      const token = getToken();
      if (token && data.user) {
        saveAuth(token, {
          ...JSON.parse(localStorage.getItem("user") || "{}"),
          ...data.user,
        });
      }

      setProfileMessage(data.message);
      fetchMe();
    } catch (error) {
      console.error(error);
      setProfileMessage("Could not connect to the server.");
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordMessage("");

    if (!currentPassword || !newPassword) {
      setPasswordMessage("Please fill in all password fields.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage("New password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("New passwords do not match.");
      return;
    }

    try {
      setPasswordSaving(true);

      const response = await apiFetch("/auth/me/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        setPasswordMessage(
          data.message || "Could not change your password."
        );
        return;
      }

      setPasswordMessage(data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      console.error(error);
      setPasswordMessage("Could not connect to the server.");
    } finally {
      setPasswordSaving(false);
    }
  };


  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your profile...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <span className="page-header-kicker">My Account</span>
          <h1>My Profile</h1>
          <p>
            Update your personal information and account password.
          </p>
        </div>
      </div>

      {/* EDIT PROFILE */}
      <div className="page-section">
        <h2><User /> Personal Information</h2>

        <form
          className="inline-form"
          onSubmit={handleProfileSave}
        >
          <div className="form-row">
            <input
              type="text"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />

            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <input
              type="tel"
              placeholder="Phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />

            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other / prefer not to say</option>
            </select>
          </div>

          <button
            type="submit"
            className="primary-btn"
            disabled={profileSaving}
          >
            {profileSaving ? "Saving..." : "Save Changes"}
          </button>
        </form>

        {profileMessage && (
          <p className="form-message">{profileMessage}</p>
        )}
      </div>

      {/* CHANGE PASSWORD */}
      <div className="page-section">
        <h2><Lock /> Change Password</h2>

        <form
          className="inline-form"
          onSubmit={handlePasswordChange}
        >
          <input
            type="password"
            placeholder="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="New password (min 6 characters)"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={6}
            required
          />

          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={6}
            required
          />

          <button
            type="submit"
            className="primary-btn"
            disabled={passwordSaving}
          >
            {passwordSaving ? "Updating..." : "Update Password"}
          </button>
        </form>

        {passwordMessage && (
          <p className="form-message">{passwordMessage}</p>
        )}
      </div>
    </Layout>
  );
}

export default MyProfile;
