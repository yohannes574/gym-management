import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Banknote,
  ReceiptText,
  CreditCard,
  ScrollText,
  FileText,
  ImageUp,
  ImageIcon,
  Check,
  Sparkles,
  PartyPopper,
} from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function MemberPayments() {
  const [searchParams] = useSearchParams();
  const [payments, setPayments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  // Set when returning from a successful Chapa checkout.
  const [justPaid, setJustPaid] = useState(false);

  // Pay-now form
  const [planId, setPlanId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank");
  // Screenshot of the transfer, required for bank / Telebirr payments.
  const [proofFile, setProofFile] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setMessage("");

      // Get payments (already scoped to this member) and the
      // available membership plans to pick from.
      const [payRes, plansRes] = await Promise.all([
        apiFetch("/payments"),
        apiFetch("/membership-plans"),
      ]);

      const payData = payRes.ok ? await payRes.json() : [];
      setPayments(payData);

      if (plansRes.ok) {
        const allPlans = await plansRes.json();
        // Only offer plans that are still available.
        setPlans(allPlans.filter((plan) => plan.active !== false));
      }
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Returning from Chapa: the return URL carries payment + status.
  useEffect(() => {
    if (
      searchParams.get("payment") &&
      searchParams.get("status") === "success"
    ) {
      setJustPaid(true);
    }
  }, [searchParams]);

  const totalPaid = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  const selectedPlan = plans.find((plan) => plan._id === planId);

  const handlePay = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!planId) {
      setMessage("Please choose a membership plan first.");
      return;
    }

    // Bank and Telebirr payments are verified from a transfer
    // screenshot, so it must be attached before submitting.
    if (paymentMethod !== "chapa" && !proofFile) {
      setMessage(
        "Please attach a screenshot of your transfer. Staff use it to confirm your payment."
      );
      return;
    }

    try {
      setPaying(true);

      if (paymentMethod === "chapa") {
        // Chapa checkout happens on Chapa's hosted page.
        const response = await apiFetch("/payments/chapa/initialize", {
          method: "POST",
          body: JSON.stringify({ planId }),
        });

        const data = await response.json();

        if (!response.ok) {
          setMessage(data.message || "Could not start the Chapa payment.");
          return;
        }

        window.location.assign(data.checkoutUrl);
        return;
      }

      // Bank / Telebirr / other: submit the payment request with the
      // transfer screenshot attached so staff can verify it.
      const formData = new FormData();
      formData.append("planId", planId);
      formData.append("paymentMethod", paymentMethod);

      if (proofFile) {
        formData.append("proofImage", proofFile);
      }

      const response = await apiFetch("/payments", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Could not record the payment."
        );
        return;
      }

      setMessage(
        data.status === "pending"
          ? `Payment request for ${data.amount} ETB submitted via ${data.paymentMethod}. Staff will verify your transfer screenshot and confirm it.`
          : `Payment of ${data.amount} ETB recorded via ${data.paymentMethod}.`
      );
      setProofFile(null);
      fetchData();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <span className="page-header-kicker">My Account</span>
          <h1>My Payments</h1>
          <p>
            Choose a membership plan, pay for it, and track confirmation.
          </p>
        </div>
      </div>

      {message && <p className="form-message">{message}</p>}

      {justPaid && (
        <div className="payment-success-banner">
          <PartyPopper />
          <div>
            <strong>Payment successful!</strong>
            <p>
              Thank you! Your payment was confirmed. Head to{" "}
              <Link to="/dashboard/member/membership">My Membership</Link>{" "}
              to see your active plan.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your payments...</p>
        </div>
      ) : (
        <>
          {/* SUMMARY */}
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-icon"><Banknote /></span>
              <div className="stat-info">
                <p className="stat-title">Total Paid</p>
                <h2>{totalPaid} ETB</h2>
              </div>
            </div>

            <div className="stat-card accent-violet">
              <span className="stat-icon"><ReceiptText /></span>
              <div className="stat-info">
                <p className="stat-title">Payments</p>
                <h2>{payments.length}</h2>
              </div>
            </div>
          </div>

          {/* CHOOSE A PLAN & PAY */}
          <div className="page-section">
            <h2><Sparkles /> Choose a Plan & Pay</h2>

            {plans.length === 0 ? (
              <p className="empty-text">
                No membership plans are available right now. Please check
                back soon or contact the gym.
              </p>
            ) : (
              <form onSubmit={handlePay}>
                {/* Plan picker */}
                <div className="plan-picker-grid">
                  {plans.map((plan) => (
                    <button
                      key={plan._id}
                      type="button"
                      className={`plan-option ${planId === plan._id ? "selected" : ""}`}
                      onClick={() => setPlanId(plan._id)}
                    >
                      <span className="plan-option-check">
                        {planId === plan._id && <Check />}
                      </span>
                      <h3>{plan.name}</h3>
                      <p className="plan-option-price">
                        {plan.price} ETB
                      </p>
                      <p className="plan-option-duration">
                        {plan.duration} days
                      </p>
                      {plan.description && (
                        <p className="plan-option-desc">
                          {plan.description}
                        </p>
                      )}
                    </button>
                  ))}
                </div>

                {selectedPlan && (
                  <p className="muted-text plan-picked-note">
                    Selected: <strong>{selectedPlan.name}</strong> —{" "}
                    {selectedPlan.price} ETB for {selectedPlan.duration}{" "}
                    days
                  </p>
                )}

                <div className="form-row">
                  <select
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      setProofFile(null);
                    }}
                  >
                    <option value="bank">Bank Transfer</option>
                    <option value="telebirr">Telebirr</option>
                    <option value="chapa">Chapa (Card / Wallet)</option>
                  </select>
                </div>

                {paymentMethod !== "chapa" && (
                  <div className="proof-upload">
                    <label className="proof-label" htmlFor="payment-proof">
                      <ImageUp />
                      {proofFile
                        ? proofFile.name
                        : "Upload transfer screenshot (required)"}
                    </label>
                    <input
                      id="payment-proof"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      className="proof-input"
                      onChange={(e) =>
                        setProofFile(e.target.files?.[0] || null)
                      }
                    />
                    <p className="muted-text proof-hint">
                      JPG, PNG, WEBP, or GIF up to 5 MB. Staff will confirm
                      your payment after checking this screenshot.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={paying || !planId}
                >
                  {paying
                    ? "Processing..."
                    : selectedPlan
                      ? `Pay ${selectedPlan.price} ETB for ${selectedPlan.name}`
                      : "Select a plan to pay"}
                </button>

                {paymentMethod !== "chapa" && proofFile && (
                  <p className="muted-text proof-selected">
                    <ImageIcon /> {proofFile.name} attached
                  </p>
                )}
              </form>
            )}
          </div>

          {/* PAYMENT HISTORY */}
          <div className="page-section">
            <h2><ScrollText /> Payment History ({payments.length})</h2>

            {payments.length === 0 ? (
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
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p) => (
                      <tr key={p._id}>
                        <td>
                          {new Date(
                            p.paymentDate
                          ).toLocaleDateString()}
                        </td>
                        <td>
                          {p.plan?.name ||
                            p.membership?.plan?.name ||
                            "—"}
                        </td>
                        <td>{p.amount} ETB</td>
                        <td>
                          <span className="payment-method">
                            {p.paymentMethod}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`status-badge ${p.status}`}
                          >
                            {p.status}
                          </span>
                        </td>
                        <td>
                          <Link
                            to={`/dashboard/member/payments/${p._id}/receipt`}
                            className="member-link"
                          >
                            <FileText /> Receipt
                          </Link>
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

export default MemberPayments;
