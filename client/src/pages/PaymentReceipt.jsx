import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Printer, Dumbbell, CheckCircle2 } from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function PaymentReceipt() {
  const { id } = useParams();
  const [payment, setPayment] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOne = async () => {
      try {
        setLoading(true);
        setMessage("");

        const response = await apiFetch(`/payments/${id}`);
        const data = await response.json();

        if (!response.ok) {
          setMessage(
            data.message || "Failed to load the receipt."
          );
          return;
        }

        setPayment(data);
      } catch (error) {
        console.error(error);
        setMessage("Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchOne();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <Layout>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading receipt...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="receipt-toolbar no-print">
        <Link
          to="/dashboard/member/payments"
          className="back-link"
        >
          <ArrowLeft /> Back to Payments
        </Link>

        <button
          className="primary-btn"
          onClick={handlePrint}
          disabled={!payment}
        >
          <Printer /> Print / Download
        </button>
      </div>

      {message && <p className="form-message">{message}</p>}

      {payment && (
        <div className="receipt">
          <div className="receipt-header">
            <h1>
              <Dumbbell /> GymPro
            </h1>
            <p className="muted-text">
              Official payment receipt
            </p>
          </div>

          <div className="receipt-row">
            <span>Receipt #</span>
            <strong>{payment._id}</strong>
          </div>

          <div className="receipt-row">
            <span>Date</span>
            <strong>
              {new Date(payment.paymentDate).toLocaleString()}
            </strong>
          </div>

          <hr />

          <div className="receipt-row">
            <span>Member</span>
            <strong>
              {payment.member?.name || "—"}
            </strong>
          </div>

          <div className="receipt-row">
            <span>Email</span>
            <strong>
              {payment.member?.email || "—"}
            </strong>
          </div>

          <div className="receipt-row">
            <span>Phone</span>
            <strong>
              {payment.member?.phone || "—"}
            </strong>
          </div>

          <hr />

          <div className="receipt-row">
            <span>Plan</span>
            <strong>
              {payment.membership?.plan?.name ||
                payment.plan?.name ||
                "—"}
            </strong>
          </div>

          <div className="receipt-row">
            <span>Plan Duration</span>
            <strong>
              {(payment.membership?.plan?.duration ||
                payment.plan?.duration)
                ? `${payment.membership?.plan?.duration || payment.plan.duration} days`
                : "—"}
            </strong>
          </div>

          {payment.membership?.startDate ? (
            <div className="receipt-row">
              <span>Membership Period</span>
              <strong>
                {new Date(
                  payment.membership.startDate
                ).toLocaleDateString()}{" "}
                –{" "}
                {new Date(
                  payment.membership.endDate
                ).toLocaleDateString()}
              </strong>
            </div>
          ) : (
            <div className="receipt-row">
              <span>Membership</span>
              <strong>
                Activated after staff confirmation
              </strong>
            </div>
          )}

          <div className="receipt-row">
            <span>Payment Method</span>
            <strong>{payment.paymentMethod}</strong>
          </div>

          <div className="receipt-row">
            <span>Status</span>
            <strong>
              <span
                className={`status-badge ${payment.status}`}
              >
                {payment.status}
              </span>
            </strong>
          </div>

          <hr />

          <div className="receipt-row receipt-total">
            <span>Total Paid</span>
            <strong>{payment.amount} ETB</strong>
          </div>

          <p className="receipt-footer muted-text">
            <CheckCircle2 style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 5 }} />
            Thank you for your payment! Keep this receipt for
            your records.
          </p>
        </div>
      )}
    </Layout>
  );
}

export default PaymentReceipt;