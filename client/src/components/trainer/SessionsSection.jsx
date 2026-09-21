import { useEffect, useState } from "react";
import { CalendarDays, Check, X } from "lucide-react";
import { apiFetch } from "../../api/api";

function SessionsSection({ memberId }) {
  const [sessions, setSessions] = useState([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [activity, setActivity] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const response = await apiFetch(`/trainer/sessions?memberId=${memberId}`);
      setSessions(response.ok ? await response.json() : []);
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [memberId]);

  const handleSchedule = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!date || !time || !activity.trim()) {
      setMessage("Date, time, and activity are required.");
      return;
    }

    try {
      const response = await apiFetch("/trainer/sessions", {
        method: "POST",
        body: JSON.stringify({
          memberId,
          scheduledAt: `${date}T${time}`,
          activity,
          location,
          notes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Could not schedule the session.");
        return;
      }

      setMessage(data.message);
      setDate("");
      setTime("");
      setActivity("");
      setLocation("");
      setNotes("");
      fetchSessions();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  const handleStatus = async (id, action) => {
    setMessage("");

    try {
      const response = await apiFetch(`/trainer/sessions/${id}/${action}`, {
        method: "PATCH",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Action failed.");
        return;
      }

      setMessage(data.message);
      fetchSessions();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  const upcoming = sessions.filter((s) => s.status === "scheduled");
  const past = sessions.filter((s) => s.status !== "scheduled");

  const formatDateTime = (value) =>
    new Date(value).toLocaleString([], {
      dateStyle: "medium",
      timeStyle: "short",
    });

  return (
    <div className="page-section">
      <h2><CalendarDays /> Training Sessions</h2>

      <form className="inline-form" onSubmit={handleSchedule}>
        <h3>Schedule a training session</h3>

        <div className="form-row">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
          <input type="text" placeholder="Activity (e.g. Leg day)" value={activity} onChange={(e) => setActivity(e.target.value)} required />
          <input type="text" placeholder="Location (optional)" value={location} onChange={(e) => setLocation(e.target.value)} />
          <input type="text" placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
          <button type="submit" className="primary-btn">Schedule</button>
        </div>
      </form>

      {message && <p className="form-message">{message}</p>}

      {loading ? (
        <p className="empty-text">Loading sessions...</p>
      ) : (
        <>
          <h3 className="list-title">Upcoming ({upcoming.length})</h3>

          {upcoming.length === 0 ? (
            <p className="empty-text">No upcoming sessions.</p>
          ) : (
            upcoming.map((session) => (
              <div className="session-item" key={session._id}>
                <div>
                  <strong>{formatDateTime(session.scheduledAt)}</strong>
                  <p>
                    {session.activity}
                    {session.location ? ` · ${session.location}` : ""}
                  </p>
                </div>

                <div className="approval-actions">
                  <button className="action-btn approve" onClick={() => handleStatus(session._id, "complete")}>
                    <Check /> Mark Completed
                  </button>
                  <button className="action-btn reject" onClick={() => handleStatus(session._id, "cancel")}>
                    <X /> Cancel
                  </button>
                </div>
              </div>
            ))
          )}

          <h3 className="list-title">History ({past.length})</h3>

          {past.length === 0 ? (
            <p className="empty-text">No session history yet.</p>
          ) : (
            past.map((session) => (
              <div className="session-item" key={session._id}>
                <div>
                  <strong>{formatDateTime(session.scheduledAt)}</strong>
                  <p>{session.activity}</p>
                </div>

                <span className={`status-badge ${session.status}`}>
                  {session.status}
                </span>
              </div>
            ))
          )}
        </>
      )}
    </div>
  );
}

export default SessionsSection;