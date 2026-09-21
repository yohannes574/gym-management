import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function MemberAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

    fetchAnnouncements();
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <h1>Gym Announcements</h1>
        <p>Important updates and news from the gym.</p>
      </div>

      {message && <p className="form-message">{message}</p>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading announcements...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="page-section">
          <p className="empty-text">There are no announcements yet.</p>
        </div>
      ) : (
        announcements.map((announcement) => (
          <article className="page-section" key={announcement._id}>
            <h2>{announcement.title}</h2>
            <p className="muted-text">
              {new Date(announcement.publishedAt).toLocaleString()}
            </p>
            <p>{announcement.body}</p>
          </article>
        ))
      )}
    </Layout>
  );
}

export default MemberAnnouncements;
