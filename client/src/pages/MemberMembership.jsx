import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Pin, RefreshCw, Wallet, Info, FolderOpen } from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function MemberMembership() {
  const [memberships, setMemberships] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [renewingId, setRenewingId] = useState(null);

  const fetchMemberships = async () => {
    try {
      setLoading(true);
      setMessage("");

      // Re-use the member portal endpoint which already returns
      // memberships, payments, and attendance in one shot.
      const response = await apiFetch("/portal/member");
      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Failed to load your memberships."
        );
        return;
      }

      setMemberships(data.memberships || []);
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemberships();
  }, []);

  const handleRenew = async (id) => {
    setMessage("");

    if (
      !window.confirm(
        "Renew this membership? It will start today and last one plan duration."
      )
    ) {
      return;
    }

    try {
      setRenewingId(id);

      const response = await apiFetch(
        `/memberships/${id}/renew`,
        { method: "PUT" }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Could not renew.");
        return;
      }

      setMessage(data.message);
      fetchMemberships();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setRenewingId(null);
    }
  };

  const active = memberships.find((m) => m.status === "active");
  const past = memberships.filter((m) => m.status !== "active");

  const today = new Date();
  const daysLeft = active
    ? Math.max(
        0,
        Math.ceil(
          (new Date(active.endDate) - today) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;


  return (
    <Layout>
      <div className="page-header">
        <div>
          <span className="page-header-kicker">My Account</span>
          <h1>My Membership</h1>
          <p>
            View your current membership, renewal options, and
            history.
          </p>
        </div>
      </div>

      {message && <p className="form-message">{message}</p>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your membership...</p>
        </div>
      ) : (
        <>
          {/* CURRENT MEMBERSHIP */}
          <div className="page-section">
            <h2><Pin /> Current Membership</h2>

            {active ? (
              <div className="membership-card">
                <div className="membership-card-header">
                  <div>
                    <h3>{active.plan?.name || "Membership"}</h3>
                    <p className="muted-text">
                      {active.plan?.price} ETB ·{" "}
                      {active.plan?.duration} days
                    </p>
                  </div>

                  <span
                    className={`status-badge ${active.status}`}
                  >
                    {active.status}
                  </span>
                </div>

                <div className="profile-grid">
                  <div>
                    <span className="profile-label">
                      Start Date
                    </span>
                    <strong>
                      {new Date(
                        active.startDate
                      ).toLocaleDateString()}
                    </strong>
                  </div>

                  <div>
                    <span className="profile-label">
                      Expiration Date
                    </span>
                    <strong>
                      {new Date(
                        active.endDate
                      ).toLocaleDateString()}
                    </strong>
                  </div>

                  <div>
                    <span className="profile-label">
                      Days Remaining
                    </span>
                    <strong>
                      {daysLeft > 0
                        ? `${daysLeft} day${daysLeft === 1 ? "" : "s"}`
                        : "Expires today"}
                    </strong>
                  </div>
                </div>

                <div className="membership-card-actions">
                  <button
                    className="primary-btn"
                    onClick={() => handleRenew(active._id)}
                    disabled={renewingId === active._id}
                  >
                    {renewingId === active._id ? (
                      "Renewing..."
                    ) : (
                      <>
                        <RefreshCw /> Renew Now
                      </>
                    )}
                  </button>

                  <Link
                    to="/dashboard/member/payments"
                    className="secondary-btn"
                  >
                    <Wallet /> View Payments
                  </Link>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>
                  You don't have an active membership yet. Pick a plan on
                  the{" "}
                  <Link to="/dashboard/member/payments">
                    My Payments
                  </Link>{" "}
                  page — your membership activates as soon as your payment
                  is confirmed.
                </p>
              </div>
            )}
          </div>

          {/* RENEWAL INFORMATION */}
          {active && (
            <div className="page-section">
              <h2><Info /> Renewal Information</h2>
              <ul className="info-list">
                <li>
                  Renewing will restart your membership{" "}
                  <strong>today</strong> and extend it by the
                  plan's full duration (
                  {active.plan?.duration} days).
                </li>
                <li>
                  Plan price:{" "}
                  <strong>{active.plan?.price} ETB</strong>
                </li>
                <li>
                  A new payment is required for each renewal —
                  head to{" "}
                  <Link to="/dashboard/member/payments">
                    My Payments
                  </Link>{" "}
                  to pay.
                </li>
              </ul>
            </div>
          )}

          {/* HISTORY */}
          <div className="page-section">
            <h2><FolderOpen /> Membership History ({past.length})</h2>

            {past.length === 0 ? (
              <p className="empty-text">No past memberships.</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Start Date</th>
                      <th>End Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {past.map((m) => (
                      <tr key={m._id}>
                        <td>{m.plan?.name || "—"}</td>
                        <td>
                          {new Date(
                            m.startDate
                          ).toLocaleDateString()}
                        </td>
                        <td>
                          {new Date(
                            m.endDate
                          ).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${m.status}`}
                          >
                            {m.status}
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

export default MemberMembership;
