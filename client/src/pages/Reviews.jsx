import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function Reviews() {
  const [reviews, setReviews] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    try {
      const response = await apiFetch("/reviews");
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "Failed to load reviews.");
        return;
      }
      setReviews(data);
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const response = await apiFetch(`/reviews/${id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "Could not update the review.");
        return;
      }
      setReviews((current) => current.map((review) => review._id === id ? data : review));
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Member Reviews</h1>
        <p>Review member feedback and approve suitable reviews.</p>
      </div>

      {message && <p className="form-message">{message}</p>}

      <div className="page-section">
        {loading ? (
          <p className="muted-text">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="empty-text">No member reviews yet.</p>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Rating</th>
                  <th>Comment</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review._id}>
                    <td>{review.member?.name || "-"}</td>
                    <td>{review.rating} / 5</td>
                    <td>{review.comment}</td>
                    <td><span className={`status-badge ${review.status}`}>{review.status}</span></td>
                    <td>
                      {review.status === "pending" && (
                        <>
                          <button className="primary-btn" onClick={() => updateStatus(review._id, "approved")}>Approve</button>{" "}
                          <button className="secondary-btn" onClick={() => updateStatus(review._id, "rejected")}>Reject</button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Reviews;
