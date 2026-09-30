import { useEffect, useEffectEvent, useState } from "react";
import { BarChart3, CalendarDays, CreditCard, Users, Wallet } from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

const formatDateInput = (date) => {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
};

function OwnerReports() {
  const today = new Date();
  const monthStart = new Date(today);
  monthStart.setDate(monthStart.getDate() - 29);

  const [from, setFrom] = useState(formatDateInput(monthStart));
  const [to, setTo] = useState(formatDateInput(today));
  const [report, setReport] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchReport = async (event) => {
    event?.preventDefault();
    try {
      setLoading(true);
      setMessage("");
      const params = new URLSearchParams({ from, to });
      const response = await apiFetch(`/owner/reports?${params}`);
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "Could not load reports.");
        return;
      }
      setReport(data);
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const loadInitialReport = useEffectEvent(() => fetchReport());

  useEffect(() => {
    queueMicrotask(() => loadInitialReport());
  }, []);

  const summary = report?.summary;

  return (
    <Layout>
      <div className="dashboard-page">
        <div className="page-header">
          <div>
            <span className="page-header-kicker">Owner tools</span>
            <h1>Operations Reports</h1>
            <p>Revenue and attendance for the selected period.</p>
          </div>
        </div>

        {message && <p className="message">{message}</p>}

        <div className="page-section">
          <form className="form-grid" onSubmit={fetchReport}>
            <div>
              <label htmlFor="report-from">From</label>
              <input id="report-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} required />
            </div>
            <div>
              <label htmlFor="report-to">Through</label>
              <input id="report-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} required />
            </div>
            <div className="form-actions">
              <button className="primary-btn" type="submit"><CalendarDays /> Update report</button>
            </div>
          </form>
        </div>

        {loading ? (
          <p className="muted-text">Loading report...</p>
        ) : summary ? (
          <>
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-icon"><Wallet /></div><div className="stat-info"><p className="stat-title">Paid revenue</p><h2>{summary.totalRevenue.toLocaleString()} ETB</h2></div></div>
              <div className="stat-card accent-green"><div className="stat-icon"><CreditCard /></div><div className="stat-info"><p className="stat-title">Paid payments</p><h2>{summary.paidPayments}</h2></div></div>
              <div className="stat-card accent-orange"><div className="stat-icon"><Users /></div><div className="stat-info"><p className="stat-title">Active members</p><h2>{summary.activeMembers}</h2></div></div>
              <div className="stat-card"><div className="stat-icon"><BarChart3 /></div><div className="stat-info"><p className="stat-title">Active memberships</p><h2>{summary.activeMemberships}</h2></div></div>
            </div>

            <div className="stats-grid">
              <div className="stat-card"><div className="stat-info"><p className="stat-title">Pending payments</p><h2>{summary.pendingPayments}</h2></div></div>
              <div className="stat-card"><div className="stat-info"><p className="stat-title">Rejected payments</p><h2>{summary.rejectedPayments}</h2></div></div>
              <div className="stat-card"><div className="stat-info"><p className="stat-title">Expiring in 30 days</p><h2>{summary.expiringMemberships}</h2></div></div>
              <div className="stat-card"><div className="stat-info"><p className="stat-title">Archived in period</p><h2>{summary.archivedMembers}</h2></div></div>
            </div>

            <div className="page-section">
              <h2>Revenue by payment method</h2>
              {report.revenueByMethod.length === 0 ? <p className="empty-text">No paid revenue in this period.</p> : (
                <div className="table-container"><table className="data-table"><thead><tr><th>Method</th><th>Payments</th><th>Revenue</th></tr></thead><tbody>{report.revenueByMethod.map((row) => <tr key={row._id}><td className="capitalize">{row._id}</td><td>{row.count}</td><td>{row.amount.toLocaleString()} ETB</td></tr>)}</tbody></table></div>
              )}
            </div>

            <div className="page-section">
              <h2>Daily activity</h2>
              <div className="table-container"><table className="data-table"><thead><tr><th>Date</th><th>Revenue</th><th>Paid payments</th><th>Check-ins</th><th>Overrides</th><th>Unique visitors</th></tr></thead><tbody>
                {Array.from(new Set([...report.revenueByDay.map((row) => row._id), ...report.attendanceByDay.map((row) => row._id)])).sort().map((date) => {
                  const revenue = report.revenueByDay.find((row) => row._id === date);
                  const attendance = report.attendanceByDay.find((row) => row._id === date);
                  return <tr key={date}><td>{new Date(`${date}T00:00:00`).toLocaleDateString()}</td><td>{(revenue?.amount || 0).toLocaleString()} ETB</td><td>{revenue?.count || 0}</td><td>{attendance?.checkIns || 0}</td><td>{attendance?.overrides || 0}</td><td>{attendance?.uniqueMembers || 0}</td></tr>;
                })}
              </tbody></table></div>
            </div>

            <div className="page-section">
              <h2>Memberships expiring soon</h2>
              {report.expiringMemberships.length === 0 ? <p className="empty-text">No memberships expire in the next 30 days.</p> : (
                <div className="table-container"><table className="data-table"><thead><tr><th>Member</th><th>Plan</th><th>Expires</th></tr></thead><tbody>{report.expiringMemberships.map((membership) => <tr key={membership._id}><td>{membership.member?.name || "Unknown member"}</td><td>{membership.plan?.name || "Membership"}</td><td>{new Date(membership.endDate).toLocaleDateString()}</td></tr>)}</tbody></table></div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
}

export default OwnerReports;