import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function MemberNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const response = await apiFetch("/notifications");
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to load notifications.");
        return;
      }

      setNotifications(data);
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markRead = async (id) => {
    const response = await apiFetch(`/notifications/${id}/read`, {
      method: "PATCH",
    });

    if (response.ok) {
      const updated = await response.json();
      setNotifications((current) =>
        current.map((notification) =>
          notification._id === id ? updated : notification
        )
      );
    }
  };

  const markAllRead = async () => {
    const response = await apiFetch("/notifications/read-all", {
      method: "PATCH",
    });

    if (response.ok) {
      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          readAt: new Date().toISOString(),
        }))
      );
    }
  };

  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1>Notifications</h1>
          <p>You have {unreadCount} unread notification{unreadCount === 1 ? "" : "s"}.</p>
        </div>
        {unreadCount > 0 && (
          <button className="secondary-btn" onClick={markAllRead}>
            Mark all as read
          </button>
        )}
      </div>

      {message && <p className="form-message">{message}</p>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading notifications...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="page-section">
          <p className="empty-text">You have no notifications yet.</p>
        </div>
      ) : (
        notifications.map((notification) => (
          <article
            className={`page-section ${notification.readAt ? "" : "unread"}`}
            key={notification._id}
          >
            <div className="section-header">
              <div>
                <h2>{notification.title}</h2>
                <p className="muted-text">
                  {new Date(notification.createdAt).toLocaleString()}
                </p>
              </div>
              {!notification.readAt && (
                <button className="secondary-btn" onClick={() => markRead(notification._id)}>
                  Mark as read
                </button>
              )}
            </div>
            <p>{notification.message}</p>
          </article>
        ))
      )}
    </Layout>
  );
}

export default MemberNotifications;
