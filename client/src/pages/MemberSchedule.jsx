import { useEffect, useState } from "react";
import { Pin, BookOpen, MapPin, MessageSquare } from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function MemberSchedule() {
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await apiFetch("/portal/member");
        const data = await response.json();

        if (!response.ok) {
          setError(
            data.message || "Failed to load your schedule."
          );
          return;
        }

        setUpcoming(data.upcomingSessions || []);
        setPast(data.pastSessions || []);
      } catch (err) {
        console.error(err);
        setError("Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const formatDateTime = (value) =>
    new Date(value).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <Layout>
      <div className="page-header">
        <div>
          <span className="page-header-kicker">Fitness</span>
          <h1>My Training Schedule</h1>
          <p>
            Upcoming training sessions with your trainer, plus a
            history of past ones.
          </p>
        </div>
      </div>

      {error && <p className="form-message">{error}</p>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your schedule...</p>
        </div>
      ) : (
        <>
          {/* UPCOMING */}
          <div className="page-section">
            <h2><Pin /> Upcoming ({upcoming.length})</h2>

            {upcoming.length === 0 ? (
              <p className="empty-text">
                No upcoming training sessions. Your trainer will
                schedule new ones for you.
              </p>
            ) : (
              <div>
                {upcoming.map((session) => (
                  <div
                    className="session-card"
                    key={session._id}
                  >
                    <div className="session-card-main">
                      <strong>
                        {formatDateTime(session.scheduledAt)}
                      </strong>
                      <p>
                        {session.activity}
                        {session.location && (
                          <>
                            <MapPin
                              style={{
                                width: 13,
                                height: 13,
                                verticalAlign: -2,
                                marginRight: 4,
                              }}
                            />
                            {session.location}
                          </>
                        )}
                      </p>
                      {session.notes && (
                        <p className="muted-text">
                          <MessageSquare
                            style={{
                              width: 13,
                              height: 13,
                              verticalAlign: -2,
                              marginRight: 4,
                            }}
                          />
                          {session.notes}
                        </p>
                      )}
                    </div>

                    <span className="status-badge scheduled">
                      Scheduled
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HISTORY */}
          <div className="page-section">
            <h2><BookOpen /> History ({past.length})</h2>

            {past.length === 0 ? (
              <p className="empty-text">
                No completed or cancelled sessions yet.
              </p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date / Time</th>
                      <th>Activity</th>
                      <th>Location</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {past.map((session) => (
                      <tr key={session._id}>
                        <td>
                          {formatDateTime(session.scheduledAt)}
                        </td>
                        <td>{session.activity}</td>
                        <td>{session.location || "—"}</td>
                        <td>
                          <span
                            className={`status-badge ${session.status}`}
                          >
                            {session.status}
                          </span>
                        </td>
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

export default MemberSchedule;