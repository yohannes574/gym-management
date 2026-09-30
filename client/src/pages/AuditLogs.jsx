import { useEffect, useEffectEvent, useState } from "react";
import { ClipboardList, Search } from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

const actionOptions = [
  ["", "All actions"],
  ["payment.created", "Payment recorded"],
  ["payment.initialized", "Checkout started"],
  ["payment.approved", "Payment approved"],
  ["payment.rejected", "Payment rejected"],
  ["payment.chapa_confirmed", "Chapa payment confirmed"],
  ["membership.created", "Membership assigned"],
  ["membership.cancelled", "Membership cancelled"],
  ["membership.renewed", "Membership renewed"],
  ["member.archived", "Member archived"],
  ["member.restored", "Member restored"],
  ["attendance.checked_in", "Member checked in"],
  ["attendance.override", "Check-in override"],
];

function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const pageSize = 25;

  const fetchLogs = async (nextPage = page) => {
    try {
      setLoading(true);
      setMessage("");
      const params = new URLSearchParams({ page: String(nextPage), limit: String(pageSize) });
      if (action) params.set("action", action);
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const response = await apiFetch(`/owner/audit-logs?${params}`);
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.message || "Could not load audit history.");
        return;
      }

      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setPage(data.page || nextPage);
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  const loadInitialLogs = useEffectEvent(() => fetchLogs(1));

  useEffect(() => {
    queueMicrotask(() => loadInitialLogs());
  }, []);

  const applyFilters = (event) => {
    event.preventDefault();
    fetchLogs(1);
  };

  return (
    <Layout>
      <div className="dashboard-page">
        <div className="page-header">
          <div>
            <span className="page-header-kicker">Owner tools</span>
            <h1>Audit History</h1>
            <p>Staff and member activity recorded by the system.</p>
          </div>
        </div>

        {message && <p className="message">{message}</p>}

        <div className="page-section">
          <form className="form-grid" onSubmit={applyFilters}>
            <div>
              <label htmlFor="audit-action">Action</label>
              <select id="audit-action" value={action} onChange={(event) => setAction(event.target.value)}>
                {actionOptions.map(([value, label]) => (
                  <option key={value || "all"} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="audit-from">From</label>
              <input id="audit-from" type="date" value={from} onChange={(event) => setFrom(event.target.value)} />
            </div>
            <div>
              <label htmlFor="audit-to">Through</label>
              <input id="audit-to" type="date" value={to} onChange={(event) => setTo(event.target.value)} />
            </div>
            <div className="form-actions">
              <button className="primary-btn" type="submit"><Search /> Apply filters</button>
            </div>
          </form>
        </div>

        <div className="page-section">
          <div className="section-header">
            <h2><ClipboardList /> Activity ({total})</h2>
          </div>
          {loading ? (
            <p className="muted-text">Loading audit history...</p>
          ) : logs.length === 0 ? (
            <p className="empty-text">No activity matches these filters.</p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr><th>When</th><th>Actor</th><th>Action</th><th>Member</th><th>Details</th></tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log._id}>
                      <td>{new Date(log.createdAt).toLocaleString()}</td>
                      <td>{log.actor?.name || "System"}<br /><span className="muted-text">{log.actor?.role || log.actorRole}</span></td>
                      <td><span className="status-badge status-pending">{log.action.replaceAll(".", " ")}</span></td>
                      <td>{log.member?.name || "—"}</td>
                      <td>{log.summary}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="form-actions">
            <button className="secondary-btn" disabled={page <= 1 || loading} onClick={() => fetchLogs(page - 1)}>Previous</button>
            <span className="muted-text">Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
            <button className="secondary-btn" disabled={page * pageSize >= total || loading} onClick={() => fetchLogs(page + 1)}>Next</button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default AuditLogs;