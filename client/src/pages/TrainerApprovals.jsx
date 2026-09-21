import { useEffect, useState } from "react";
import {
  Hourglass,
  Dumbbell,
  UserPlus,
  Check,
  X,
  CalendarDays,
  AlertCircle,
} from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function TrainerApprovals() {
  const [trainers, setTrainers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // New staff account form
  const [staffName, setStaffName] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [staffMessage, setStaffMessage] = useState("");
  const [creatingStaff, setCreatingStaff] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      setMessage("");

      const [trainersResponse, staffResponse] =
        await Promise.all([
          apiFetch("/staff/trainers"),
          apiFetch("/staff/users"),
        ]);

      const trainersData = await trainersResponse.json();

      if (!trainersResponse.ok) {
        setMessage(
          trainersData.message || "Failed to load trainers."
        );
        return;
      }

      setTrainers(trainersData);
      setStaff(
        staffResponse.ok ? await staffResponse.json() : []
      );
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleStatus = async (trainerId, action) => {
    setMessage("");

    try {
      const response = await apiFetch(
        `/staff/trainers/${trainerId}/${action}`,
        {
          method: "PATCH",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Action failed.");
        return;
      }

      setMessage(data.message);
      fetchData();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    setStaffMessage("");
    setCreatingStaff(true);

    try {
      const response = await apiFetch("/staff/users", {
        method: "POST",
        body: JSON.stringify({
          name: staffName,
          email: staffEmail,
          password: staffPassword,
          role: "receptionist",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setStaffMessage(
          data.message || "Could not create the account."
        );
        return;
      }

      setStaffMessage(data.message);
      setStaffName("");
      setStaffEmail("");
      setStaffPassword("");
      fetchData();
    } catch (error) {
      console.error(error);
      setStaffMessage("Could not connect to the server.");
    } finally {
      setCreatingStaff(false);
    }
  };

  const pendingTrainers = trainers.filter(
    (trainer) => trainer.approvalStatus === "pending"
  );

  const reviewedTrainers = trainers.filter(
    (trainer) => trainer.approvalStatus !== "pending"
  );

  return (
    <Layout>
      <div className="page-header">
        <div>
          <span className="page-header-kicker">Staff Management</span>
          <h1>Trainer Approvals & Staff</h1>
          <p>
            Approve trainer registrations and manage staff
            accounts.
          </p>
        </div>
      </div>

      {message && <p className="message"><AlertCircle />{message}</p>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      ) : (
        <>
          {/* PENDING TRAINERS */}
          <div className="page-section">
            <h2><Hourglass /> Pending Trainer Requests</h2>

            {pendingTrainers.length === 0 ? (
              <p className="empty-text">
                No pending trainer requests.
              </p>
            ) : (
              <div className="approval-list">
                {pendingTrainers.map((trainer) => (
                  <div
                    className="approval-item"
                    key={trainer._id}
                  >
                    <div>
                      <strong>{trainer.name}</strong>
                      <p>{trainer.email}</p>
                      <p className="approval-date">
                        <CalendarDays /> Requested{" "}
                        {new Date(
                          trainer.createdAt
                        ).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="approval-actions">
                      <button
                        className="action-btn approve"
                        onClick={() =>
                          handleStatus(trainer._id, "approve")
                        }
                      >
                        <Check /> Approve
                      </button>

                      <button
                        className="action-btn reject"
                        onClick={() =>
                          handleStatus(trainer._id, "reject")
                        }
                      >
                        <X /> Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ALL TRAINERS */}
          <div className="page-section">
            <h2><Dumbbell /> All Trainers</h2>

            {reviewedTrainers.length === 0 ? (
              <p className="empty-text">
                No reviewed trainers yet.
              </p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reviewedTrainers.map((trainer) => (
                      <tr key={trainer._id}>
                        <td>{trainer.name}</td>
                        <td>{trainer.email}</td>
                        <td>
                          <span
                            className={`status-badge ${trainer.approvalStatus}`}
                          >
                            {trainer.approvalStatus}
                          </span>
                        </td>
                        <td>
                          {trainer.approvalStatus ===
                          "rejected" ? (
                            <button
                              className="action-btn approve"
                              onClick={() =>
                                handleStatus(
                                  trainer._id,
                                  "approve"
                                )
                              }
                            >
                              Approve
                            </button>
                          ) : (
                            <button
                              className="action-btn reject"
                              onClick={() =>
                                handleStatus(
                                  trainer._id,
                                  "reject"
                                )
                              }
                            >
                              Reject
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CREATE RECEPTIONIST */}
          <div className="page-section">
            <h2><UserPlus /> Add Receptionist Account</h2>

            <form
              className="form-grid"
              onSubmit={handleCreateStaff}
            >
              <input
                type="text"
                placeholder="Full name"
                value={staffName}
                onChange={(e) => setStaffName(e.target.value)}
                required
              />

              <input
                type="email"
                placeholder="Email"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                required
              />

              <input
                type="password"
                placeholder="Password (min 6 characters)"
                value={staffPassword}
                onChange={(e) =>
                  setStaffPassword(e.target.value)
                }
                minLength={6}
                required
              />

              <button
                type="submit"
                className="primary-btn"
                disabled={creatingStaff}
              >
                <UserPlus />
                {creatingStaff
                  ? "Creating..."
                  : "Create Receptionist"}
              </button>
            </form>

            {staffMessage && (
              <p className="form-message">{staffMessage}</p>
            )}

            {staff.length > 0 && (
              <div className="table-container staff-table">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((member) => (
                      <tr key={member._id}>
                        <td>{member.name}</td>
                        <td>{member.email}</td>
                        <td>{member.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </Layout>
  );
}

export default TrainerApprovals;