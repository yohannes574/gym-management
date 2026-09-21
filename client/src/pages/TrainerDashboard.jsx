import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  Users,
  CalendarDays,
  Clock,
  Check,
} from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function TrainerDashboard() {
  const [portal, setPortal] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPortal = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await apiFetch("/portal/trainer");

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Failed to load your dashboard."
        );
        return;
      }

      setPortal(data);
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortal();
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <span className="page-header-kicker">Trainer Portal</span>
          <h1>Trainer Dashboard</h1>
          <p>
            Overview of your members and today's gym activity.
          </p>
        </div>
      </div>

      {message && <p className="message">{message}</p>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading dashboard...</p>
        </div>
      ) : (
        portal && (
          <>
            {/* STATS */}
            <div className="stats-grid">
              <div className="stat-card">
                <span className="stat-icon"><ClipboardCheck /></span>
                <div className="stat-info">
                  <p className="stat-title">
                    Today's Check-ins
                  </p>
                  <h2>
                    {portal.stats.todayCheckIns}
                  </h2>
                </div>
              </div>

              <div className="stat-card accent-green">
                <span className="stat-icon"><Users /></span>
                <div className="stat-info">
                  <p className="stat-title">
                    Assigned Members
                  </p>
                  <h2>
                    {portal.stats.assignedMembers}
                  </h2>
                </div>
              </div>

              <div className="stat-card accent-blue">
                <span className="stat-icon"><CalendarDays /></span>
                <div className="stat-info">
                  <p className="stat-title">
                    Sessions Today
                  </p>
                  <h2>
                    {portal.stats.todaySessions}
                  </h2>
                </div>
              </div>

              <div className="stat-card accent-violet">
                <span className="stat-icon"><Clock /></span>
                <div className="stat-info">
                  <p className="stat-title">
                    Upcoming Sessions
                  </p>
                  <h2>
                    {portal.stats.upcomingSessions}
                  </h2>
                </div>
              </div>
            </div>

            {/* TODAY'S ATTENDANCE */}
            <div className="page-section">
              <h2><ClipboardCheck /> Today's Check-ins</h2>

              {portal.todayAttendance.length === 0 ? (
                <p className="empty-text">
                  No check-ins yet today.
                </p>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Member</th>
                        <th>Email</th>
                        <th>Check-in Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portal.todayAttendance.map(
                        (record) => (
                          <tr key={record._id}>
                            <td>
                              {record.member?.name ||
                                "Unknown"}
                            </td>
                            <td>
                              {record.member?.email ||
                                "-"}
                            </td>
                            <td>
                              {new Date(
                                record.checkInTime
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* UPCOMING SESSIONS */}
            <div className="page-section">
              <h2><CalendarDays /> Upcoming Sessions</h2>

              {portal.upcomingSessions.length === 0 ? (
                <p className="empty-text">
                  No upcoming sessions scheduled.
                </p>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Date / Time</th>
                        <th>Member</th>
                        <th>Activity</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {portal.upcomingSessions.map((session) => (
                        <tr key={session._id}>
                          <td>
                            {new Date(
                              session.scheduledAt
                            ).toLocaleString([], {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </td>
                          <td>
                            {session.member?.name || "Unknown"}
                          </td>
                          <td>{session.activity}</td>
                          <td>
                            <button
                              className="action-btn approve"
                              onClick={async () => {
                                const res = await apiFetch(
                                  `/trainer/sessions/${session._id}/complete`,
                                  { method: "PATCH" }
                                );
                                const data = await res.json();
                                setMessage(
                                  data.message ||
                                    "Session updated."
                                );
                                fetchPortal();
                              }}
                            >
                              <Check /> Complete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )
      )}
    </Layout>
  );
}

export default TrainerDashboard;
