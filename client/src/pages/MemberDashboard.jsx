import { useEffect, useState } from "react";
import { User, CreditCard, Wallet, CalendarCheck } from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function MemberDashboard() {
  const [portal, setPortal] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchPortal = async () => {
    try {
      setLoading(true);
      setMessage("");

      const response = await apiFetch("/portal/member");

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

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your dashboard...</p>
        </div>
      </Layout>
    );
  }

  const activeMembership = portal?.memberships?.find(
    (membership) => membership.status === "active"
  );

  return (
    <Layout>
      <div className="page-header">
        <div>
          <span className="page-header-kicker">Member Portal</span>
          <h1>My Dashboard</h1>
          <p>
            Welcome back,{" "}
            {portal?.member?.name || "Member"}! Here is your gym
            activity.
          </p>
        </div>
      </div>

      {message && <p className="message">{message}</p>}

      {portal && (
        <>
          {/* PROFILE */}
          <div className="page-section">
            <h2><User /> My Profile</h2>

            <div className="profile-grid">
              <div>
                <span className="profile-label">Name</span>
                <strong>{portal.member.name}</strong>
              </div>

              <div>
                <span className="profile-label">Email</span>
                <strong>{portal.member.email}</strong>
              </div>

              <div>
                <span className="profile-label">Phone</span>
                <strong>{portal.member.phone}</strong>
              </div>

              <div>
                <span className="profile-label">Status</span>
                <span
                  className={`status-badge ${portal.member.status}`}
                >
                  {portal.member.status}
                </span>
              </div>
            </div>
          </div>

          {/* MEMBERSHIP */}
          <div className="page-section">
            <h2><CreditCard /> My Membership</h2>

            {activeMembership ? (
              <div className="membership-banner active">
                <div>
                  <strong>
                    {activeMembership.plan?.name ||
                      "Membership"}
                  </strong>
                  <p>
                    Valid until{" "}
                    {new Date(
                      activeMembership.endDate
                    ).toLocaleDateString()}
                  </p>
                </div>

                <span className="status-badge active">
                  Active
                </span>
              </div>
            ) : (
              <div className="membership-banner expired">
                <div>
                  <strong>No active membership</strong>
                  <p>
                    Contact the gym reception to subscribe to a
                    plan.
                  </p>
                </div>

                <span className="status-badge expired">
                  Inactive
                </span>
              </div>
            )}

            {portal.memberships.length > 0 && (
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
                    {portal.memberships.map((membership) => (
                      <tr key={membership._id}>
                        <td>
                          {membership.plan?.name || "-"}
                        </td>
                        <td>
                          {new Date(
                            membership.startDate
                          ).toLocaleDateString()}
                        </td>
                        <td>
                          {new Date(
                            membership.endDate
                          ).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${membership.status}`}
                          >
                            {membership.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* PAYMENTS */}
          <div className="page-section">
            <h2><Wallet /> My Payments</h2>

            {portal.payments.length === 0 ? (
              <p className="empty-text">No payments yet.</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Plan</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portal.payments.map((payment) => (
                      <tr key={payment._id}>
                        <td>
                          {new Date(
                            payment.paymentDate
                          ).toLocaleDateString()}
                        </td>
                        <td>
                          {payment.membership?.plan?.name ||
                            payment.plan?.name ||
                            "-"}
                        </td>
                        <td>{payment.amount} ETB</td>
                        <td>{payment.paymentMethod}</td>
                        <td>{payment.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ATTENDANCE */}
          <div className="page-section">
            <h2><CalendarCheck /> My Check-ins</h2>

            {portal.attendance.length === 0 ? (
              <p className="empty-text">
                No check-ins yet. See you at the gym!
              </p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {portal.attendance.map((record) => (
                      <tr key={record._id}>
                        <td>
                          {new Date(
                            record.checkInTime
                          ).toLocaleDateString()}
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

export default MemberDashboard;