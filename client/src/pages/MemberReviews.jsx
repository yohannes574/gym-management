import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function MemberReviews() {
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    try {
      setSaving(true);
      const response = await apiFetch("/reviews", {
        method: "POST",
        body: JSON.stringify({ rating: Number(rating), comment }),
      });
      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Could not submit your review.");
        return;
      }

      setReviews((current) => [data, ...current]);
      setComment("");
      setMessage("Review submitted for staff approval.");
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
        <h1>Leave a Review</h1>
        <p>Tell us about your experience at the gym.</p>
      </div>

      {message && <p className="form-message">{message}</p>}

      <div className="page-section">
        <h2>Submit Review</h2>
        <form className="inline-form" onSubmit={handleSubmit}>
          <select value={rating} onChange={(event) => setRating(event.target.value)}>
            <option value="5">5 - Excellent</option>
            <option value="4">4 - Good</option>
            <option value="3">3 - Average</option>
            <option value="2">2 - Needs improvement</option>
            <option value="1">1 - Poor</option>
          </select>
          <textarea
            placeholder="Write your review..."
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={5}
            maxLength={1000}
            required
          />
          <button className="primary-btn" type="submit" disabled={saving}>
            {saving ? "Submitting..." : "Submit Review"}
          </button>
        </form>
      </div>

      <div className="page-section">
        <h2>My Reviews</h2>
        {loading ? (
          <p className="muted-text">Loading reviews...</p>
        ) : reviews.length === 0 ? (
          <p className="empty-text">You have not submitted a review yet.</p>
        ) : (
          reviews.map((review) => (
            <article key={review._id} className="review-item">
              <h3>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</h3>
              <p>{review.comment}</p>
              <span className={`status-badge ${review.status}`}>{review.status}</span>
            </article>
          ))
        )}
      </div>
    </Layout>
  );
}

export default MemberReviews;
