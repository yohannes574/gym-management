import { useEffect, useState } from "react";
import {
  Wallet,
  PlusCircle,
  History,
  AlertCircle,
  Image,
  Check,
  X,
  XCircle,
} from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function Payments() {
  const [members, setMembers] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [payments, setPayments] = useState([]);

  const [memberId, setMemberId] = useState("");
  const [membershipId, setMembershipId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const [message, setMessage] = useState("");

  // Screenshot viewer + verification of pending member payments.
  const [proofView, setProofView] = useState(null); // { url, payment }
  const [proofLoading, setProofLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [rejecting, setRejecting] = useState(null); // payment being rejected
  const [rejectReason, setRejectReason] = useState("");

  // GET MEMBERS
  const fetchMembers = async () => {
    try {
      const response = await apiFetch("/members");
      const data = await response.json();

      if (response.ok) {
        setMembers(data);
      }
    } catch (error) {
      console.error(error);
      setMessage("Failed to load members.");
    }
  };

  // GET MEMBERSHIPS
  const fetchMemberships = async () => {
    try {
      const response = await apiFetch("/memberships");
      const data = await response.json();

      if (response.ok) {
        setMemberships(data);
      }
    } catch (error) {
      console.error(error);
      setMessage("Failed to load memberships.");
    }
  };

  // GET PAYMENTS
  const fetchPayments = async () => {
    try {
      const response = await apiFetch("/payments");
      const data = await response.json();

      if (response.ok) {
        setPayments(data);
      }
    } catch (error) {
      console.error(error);
      setMessage("Failed to load payments.");
    }
  };

  // Load data
  useEffect(() => {
    fetchMembers();
    fetchMemberships();
    fetchPayments();
  }, []);

  // Filter memberships for selected member
  const selectedMemberships = memberships.filter(
    (membership) => membership.member?._id === memberId
  );

  // CREATE PAYMENT
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!memberId || !membershipId || !amount) {
      setMessage(
        "Please select a member, membership, and enter an amount."
      );
      return;
    }

    try {
      const response = await apiFetch("/payments", {
        method: "POST",
        body: JSON.stringify({
          memberId,
          membershipId,
          amount: Number(amount),
          paymentMethod,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to create payment.");
        return;
      }

      setMessage("Payment recorded successfully!");

      setMemberId("");
      setMembershipId("");
      setAmount("");
      setPaymentMethod("cash");

      fetchPayments();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  // VIEW PROOF — fetch the screenshot with the auth header and show it.
  const openProof = async (payment) => {
    try {
      setProofLoading(true);

      const response = await apiFetch(`/payments/${payment._id}/proof`);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setMessage(data.message || "Could not load the payment proof.");
        return;
      }

      const blob = await response.blob();
      setProofView({ url: URL.createObjectURL(blob), payment });
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setProofLoading(false);
    }
  };

  const closeProof = () => {
    if (proofView?.url) {
      URL.revokeObjectURL(proofView.url);
    }
    setProofView(null);
  };

  // APPROVE / REJECT pending member payments.
  const handleVerify = async (payment, decision, reason = "") => {
    try {
      setProcessingId(payment._id);

      const response = await apiFetch(`/payments/${payment._id}/verify`, {
        method: "PATCH",
        body: JSON.stringify({ decision, reason }),
      });

      const data = await response.json();

      setMessage(
        data.message ||
          (response.ok
            ? "Payment updated."
            : "Could not update the payment.")
      );

      if (response.ok) {
        fetchPayments();
      }
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setProcessingId(null);
      setRejecting(null);
      setRejectReason("");
    }
  };

  return (
    <Layout>
      <div className="dashboard-page">
        <div className="page-header">
          <div>
            <span className="page-header-kicker">Management</span>
            <h1>Payments</h1>
            <p>Record payments and review the full payment history.</p>
          </div>
        </div>

        {message && (
          <p className="message">
            <AlertCircle />
            {message}
          </p>
        )}

        {/* PAYMENT FORM */}
        <div className="page-section">
          <h2>
            <PlusCircle /> Record Payment
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div>
                <label>Member</label>
                <select
                  value={memberId}
                  onChange={(e) => {
                    setMemberId(e.target.value);
                    setMembershipId("");
                  }}
                  required
                >
                  <option value="">Select Member</option>
                  {members.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name} — {member.email}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Membership</label>
                <select
                  value={membershipId}
                  onChange={(e) => setMembershipId(e.target.value)}
                  disabled={!memberId}
                  required
                >
                  <option value="">Select Membership</option>
                  {selectedMemberships.map((membership) => (
                    <option
                      key={membership._id}
                      value={membership._id}
                    >
                      {membership.plan?.name} —{" "}
                      {membership.plan?.price} ETB
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Amount (ETB)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Payment amount"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </div>

              <div>
                <label>Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                >
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                  <option value="telebirr">Telebirr</option>
                  <option value="chapa">Chapa</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="primary-btn">
                <Wallet /> Record Payment
              </button>
            </div>
          </form>
        </div>

        {/* PAYMENT HISTORY */}
        <div className="page-section">
          <div className="section-header">
            <div>
              <h2>
                <History /> Payment History
              </h2>
              <p>
                {payments.length} recorded payment{payments.length === 1 ? "" : "s"} ·{" "}
                {payments.filter((p) => p.status === "pending").length} awaiting
                verification
              </p>
            </div>
          </div>

          {payments.length === 0 ? (
            <p className="empty-text">No payments found.</p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Plan</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Date</th>
                    <th>Status</th>
                    <th>Proof</th>
                    <th>Verify</th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment._id}>
                      <td>
                        <strong>{payment.member?.name}</strong>
                      </td>
                      <td>
                        {payment.membership?.plan?.name ||
                          payment.plan?.name ||
                          "—"}
                      </td>
                      <td>{payment.amount} ETB</td>
                      <td className="capitalize">{payment.paymentMethod}</td>
                      <td>
                        {new Date(
                          payment.paymentDate
                        ).toLocaleDateString()}
                      </td>
                      <td>
                        <span className={`status-badge ${payment.status}`}>
                          {payment.status}
                        </span>
                        {payment.rejectionReason && (
                          <p className="muted-text">
                            {payment.rejectionReason}
                          </p>
                        )}
                        {payment.reviewedBy?.name && (
                          <p className="muted-text">
                            Reviewed by {payment.reviewedBy.name}
                          </p>
                        )}
                      </td>
                      <td>
                        {payment.proofImage ? (
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => openProof(payment)}
                            disabled={proofLoading}
                          >
                            <Image /> View
                          </button>
                        ) : (
                          <span className="muted-text">—</span>
                        )}
                      </td>
                      <td>
                        {payment.status === "pending" ? (
                          <div className="verify-actions">
                            <button
                              type="button"
                              className="secondary-btn approve-btn"
                              onClick={() =>
                                handleVerify(payment, "approved")
                              }
                              disabled={processingId === payment._id}
                            >
                              <Check /> Approve
                            </button>
                            <button
                              type="button"
                              className="danger-btn reject-btn"
                              onClick={() => {
                                setRejecting(payment);
                                setRejectReason("");
                              }}
                              disabled={processingId === payment._id}
                            >
                              <X /> Reject
                            </button>
                          </div>
                        ) : (
                          <span className="muted-text">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* PROOF VIEWER MODAL */}
        {proofView && (
          <div className="modal-overlay" onClick={closeProof}>
            <div
              className="proof-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>
                  <Image /> Transfer Screenshot
                </h3>
                <button
                  type="button"
                  className="modal-close"
                  onClick={closeProof}
                  aria-label="Close"
                >
                  <X />
                </button>
              </div>

              <p className="muted-text">
                <strong>{proofView.payment.member?.name}</strong> ·{" "}
                {proofView.payment.amount} ETB ·{" "}
                <span className="capitalize">{proofView.payment.paymentMethod}</span>
              </p>

              <img
                src={proofView.url}
                alt="Payment proof"
                className="proof-image"
              />

              {proofView.payment.status === "pending" && (
                <div className="modal-actions">
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={() => {
                      const payment = proofView.payment;
                      closeProof();
                      handleVerify(payment, "approved");
                    }}
                    disabled={processingId === proofView.payment._id}
                  >
                    <Check /> Approve Payment
                  </button>
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => {
                      setRejecting(proofView.payment);
                      closeProof();
                    }}
                  >
                    <X /> Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* REJECT REASON MODAL */}
        {rejecting && (
          <div className="modal-overlay" onClick={() => setRejecting(null)}>
            <div
              className="proof-modal reject-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>
                  <XCircle /> Reject Payment
                </h3>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setRejecting(null)}
                  aria-label="Close"
                >
                  <X />
                </button>
              </div>

              <p className="muted-text">
                Reject <strong>{rejecting.member?.name}</strong>'s{" "}
                <span className="capitalize">{rejecting.paymentMethod}</span>{" "}
                payment of {rejecting.amount} ETB? The member will be asked to
                submit a new payment. This review will remain in payment history.
              </p>

              <textarea
                className="reject-reason"
                placeholder="Reason shown to the member (optional, e.g. amount mismatch, unclear screenshot)"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />

              <div className="modal-actions">
                <button
                  type="button"
                  className="danger-btn"
                  onClick={() => handleVerify(rejecting, "rejected", rejectReason)}
                  disabled={processingId === rejecting._id}
                >
                  {processingId === rejecting._id
                    ? "Rejecting..."
                    : "Reject Payment"}
                </button>
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setRejecting(null)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
    </Layout>
  );
}

export default Payments;