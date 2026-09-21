import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      const response = await apiFetch("/announcements");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to load announcements.");
        return;
      }

      setAnnouncements(data);
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      setSaving(true);
      const response = await apiFetch("/announcements", {
        method: "POST",
        body: JSON.stringify({ title, body }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Could not publish announcement.");
        return;
      }

      setAnnouncements((current) => [data, ...current]);
      setTitle("");
      setBody("");
      setMessage("Announcement published.");
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Gym Announcements</h1>
        <p>Publish updates that members can read in their portal.</p>
      </div>

      {message && <p className="form-message">{message}</p>}

      <div className="page-section">
        <h2>Publish Announcement</h2>
        <form className="inline-form" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Announcement title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={120}
            required
          />
          <textarea
            placeholder="Write the announcement..."
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={5}
            required
          />
          <button className="primary-btn" type="submit" disabled={saving}>
            {saving ? "Publishing..." : "Publish"}
          </button>
        </form>
      </div>

      <div className="page-section">
        <h2>Published Announcements</h2>
        {loading ? (
          <p className="muted-text">Loading announcements...</p>
        ) : announcements.length === 0 ? (
          <p className="empty-text">No announcements published yet.</p>
        ) : (
          announcements.map((announcement) => (
            <article key={announcement._id}>
              <h3>{announcement.title}</h3>
              <p className="muted-text">
                {new Date(announcement.publishedAt).toLocaleString()} by {announcement.createdBy?.name || "Staff"}
              </p>
              <p>{announcement.body}</p>
            </article>
          ))
        )}
      </div>
    </Layout>
  );
}

export default Announcements;
