import { useEffect, useState } from "react";
import {
  Users,
  CheckCircle2,
  CalendarCheck,
  Wallet,
  Bell,
  CircleAlert,
  AlertTriangle,
  BarChart3,
  CreditCard,
} from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function Dashboard() {
const [stats, setStats] = useState({
totalMembers: 0,
activeMemberships: 0,
todayAttendance: 0,
totalRevenue: 0,
});

const [recentPayments, setRecentPayments] = useState([]);

const [recentAttendance, setRecentAttendance] = useState([]);

const [revenueByMethod, setRevenueByMethod] = useState([]);

const [attendanceLast7Days, setAttendanceLast7Days] =
useState([]);

const [expiredMemberships, setExpiredMemberships] =
useState([]);

const [
expiringSoonMemberships,
setExpiringSoonMemberships,
] = useState([]);

const [message, setMessage] = useState("");

const [loading, setLoading] = useState(true);

const fetchDashboard = async () => {
try {
setLoading(true);
setMessage("");


  const response = await apiFetch("/dashboard");

  const data = await response.json();

  if (!response.ok) {
    setMessage(
      data.message || "Failed to load dashboard."
    );
    return;
  }

  setStats(data.stats);

  setRecentPayments(data.recentPayments || []);

  setRecentAttendance(data.recentAttendance || []);

  setRevenueByMethod(data.revenueByMethod || []);

  setAttendanceLast7Days(
    data.attendanceLast7Days || []
  );

  setExpiredMemberships(
    data.expiredMemberships || []
  );

  setExpiringSoonMemberships(
    data.expiringSoonMemberships || []
  );
} catch (error) {
  console.error(error);
  setMessage("Could not connect to the server.");
} finally {
  setLoading(false);
}


};

useEffect(() => {
fetchDashboard();
}, []);

const formatDate = (date) => {
return new Date(date).toLocaleDateString();
};

const formatTime = (date) => {
return new Date(date).toLocaleTimeString([], {
hour: "2-digit",
minute: "2-digit",
});
};

const formatMethod = (method) => {
if (!method) return "-";


return (
  method.charAt(0).toUpperCase() +
  method.slice(1)
);


};

return ( <Layout> <div className="dashboard-page">

    {/* HEADER */}
    <div className="page-header">

      <div>
        <span className="page-header-kicker">Overview</span>

        <h1>Dashboard Overview</h1>

        <p>
          Welcome back! Here's what's happening in your gym today.
        </p>
      </div>

    </div>

    {loading ? (
      <div className="loading-container">

        <div className="spinner"></div>

        <p>Loading dashboard...</p>

      </div>
    ) : (
      <>
        {message && (
          <p className="message">
            {message}
          </p>
        )}

        {/* NOTIFICATIONS */}

        {(expiredMemberships.length > 0 ||
          expiringSoonMemberships.length > 0) && (
          <div className="notifications-section">

            <div className="notification-header">
              <h2><Bell /> Notifications</h2>

              <span className="notification-count">
                {expiredMemberships.length +
                  expiringSoonMemberships.length}
              </span>
            </div>

            {/* EXPIRED MEMBERSHIPS */}

            {expiredMemberships.length > 0 && (
              <div className="notification-group">

                <h3>
                  <CircleAlert /> Expired Memberships (
                  {expiredMemberships.length})
                </h3>

                {expiredMemberships.map(
                  (membership) => (
                    <div
                      className="notification-item expired"
                      key={membership._id}
                    >

                      <div>
                        <strong>
                          {membership.member?.name ||
                            "Unknown Member"}
                        </strong>

                        <p>
                          Membership expired on{" "}
                          {new Date(
                            membership.endDate
                          ).toLocaleDateString()}
                        </p>
                      </div>

                      <span className="notification-plan">
                        {membership.plan?.name ||
                          "Membership"}
                      </span>

                    </div>
                  )
                )}

              </div>
            )}

            {/* EXPIRING SOON */}

            {expiringSoonMemberships.length > 0 && (
              <div className="notification-group">

                <h3>
                  <AlertTriangle /> Expiring Soon (
                  {expiringSoonMemberships.length})
                </h3>

                {expiringSoonMemberships.map(
                  (membership) => (
                    <div
                      className="notification-item warning"
                      key={membership._id}
                    >

                      <div>
                        <strong>
                          {membership.member?.name ||
                            "Unknown Member"}
                        </strong>

                        <p>
                          Membership expires on{" "}
                          {new Date(
                            membership.endDate
                          ).toLocaleDateString()}
                        </p>
                      </div>

                      <span className="notification-plan">
                        {membership.plan?.name ||
                          "Membership"}
                      </span>

                    </div>
                  )
                )}

              </div>
            )}

          </div>
        )}

        {/* STAT CARDS */}
        <div className="stats-grid">

          <div className="stat-card">
            <div className="stat-icon"><Users /></div>

            <div className="stat-info">
              <p className="stat-title">
                Total Members
              </p>

              <h2>{stats.totalMembers}</h2>
            </div>
          </div>

          <div className="stat-card accent-green">
            <div className="stat-icon"><CheckCircle2 /></div>

            <div className="stat-info">
              <p className="stat-title">
                Active Memberships
              </p>

              <h2>
                {stats.activeMemberships}
              </h2>
            </div>
          </div>

          <div className="stat-card accent-blue">
            <div className="stat-icon"><CalendarCheck /></div>

            <div className="stat-info">
              <p className="stat-title">
                Today's Attendance
              </p>

              <h2>
                {stats.todayAttendance}
              </h2>
            </div>
          </div>

          <div className="stat-card accent-violet">
            <div className="stat-icon"><Wallet /></div>

            <div className="stat-info">
              <p className="stat-title">
                Total Revenue
              </p>

              <h2>
                {stats.totalRevenue} ETB
              </h2>
            </div>
          </div>

        </div>

        {/* ANALYTICS */}
        <div className="dashboard-analytics">

          {/* ATTENDANCE */}
          <div className="page-section analytics-card">

            <div className="section-header">

              <div>
                <h2>
                  Attendance — Last 7 Days
                </h2>

                <p>
                  Member check-ins over the past week.
                </p>
              </div>

            </div>

            {attendanceLast7Days.length === 0 ? (
              <div className="empty-chart">

                <BarChart3 />

                <p>No attendance data yet.</p>

              </div>
            ) : (
              <div className="attendance-chart">

                {attendanceLast7Days.map((day) => (
                  <div
                    className="chart-column"
                    key={day._id}
                  >

                    <div className="chart-value">
                      {day.count}
                    </div>

                    <div
                      className="chart-bar"
                      style={{
                        height: `${Math.max(
                          day.count * 25,
                          20
                        )}px`,
                      }}
                    ></div>

                    <div className="chart-label">
                      {new Date(
                        `${day._id}T00:00:00`
                      ).toLocaleDateString([], {
                        weekday: "short",
                      })}
                    </div>

                  </div>
                ))}

              </div>
            )}

          </div>

          {/* REVENUE */}
          <div className="page-section analytics-card">

            <div className="section-header">

              <div>
                <h2>Revenue by Method</h2>

                <p>
                  How members are paying.
                </p>
              </div>

            </div>

            {revenueByMethod.length === 0 ? (
              <div className="empty-chart">

                <Wallet />

                <p>No payment data yet.</p>

              </div>
            ) : (
              <div className="revenue-list">

                {revenueByMethod.map((item) => (
                  <div
                    className="revenue-row"
                    key={item._id}
                  >

                    <div className="revenue-method">

                      <span className="method-icon">
                        <CreditCard />
                      </span>

                      <span>
                        {formatMethod(item._id)}
                      </span>

                    </div>

                    <strong>
                      {Number(
                        item.total
                      ).toLocaleString()} ETB
                    </strong>

                  </div>
                ))}

              </div>
            )}

          </div>

        </div>

        {/* RECENT ACTIVITY */}
        <div className="dashboard-activity">

          {/* RECENT PAYMENTS */}
          <div className="page-section">

            <div className="section-header">

              <div>
                <h2>Recent Payments</h2>

                <p>
                  Latest successful payments.
                </p>
              </div>

            </div>

            {recentPayments.length === 0 ? (
              <p className="empty-text">
                No payments found.
              </p>
            ) : (
              <div className="table-container">

                <table className="data-table">

                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Amount</th>
                      <th>Method</th>
                      <th>Date</th>
                    </tr>
                  </thead>

                  <tbody>

                    {recentPayments.map(
                      (payment) => (
                        <tr key={payment._id}>

                          <td>
                            <strong>
                              {payment.member?.name ||
                                "-"}
                            </strong>
                          </td>

                          <td>
                            {Number(
                              payment.amount
                            ).toLocaleString()}{" "}
                            ETB
                          </td>

                          <td>
                            {formatMethod(
                              payment.paymentMethod
                            )}
                          </td>

                          <td>
                            {formatDate(
                              payment.paymentDate
                            )}
                          </td>

                        </tr>
                      )
                    )}

                  </tbody>

                </table>

              </div>
            )}

          </div>

          {/* RECENT ATTENDANCE */}
          <div className="page-section">

            <div className="section-header">

              <div>
                <h2>Recent Attendance</h2>

                <p>
                  Latest gym check-ins.
                </p>
              </div>

            </div>

            {recentAttendance.length === 0 ? (
              <p className="empty-text">
                No attendance records found.
              </p>
            ) : (
              <div className="recent-attendance-list">

                {recentAttendance.map((record) => (
                  <div
                    className="attendance-item"
                    key={record._id}
                  >

                    <div className="attendance-avatar">
                      {(record.member?.name || "?")
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </div>

                    <div className="attendance-member">

                      <strong>
                        {record.member?.name || "-"}
                      </strong>

                      <span>
                        {record.member?.email || ""}
                      </span>

                    </div>

                    <div className="attendance-time">

                      <strong>
                        {formatTime(
                          record.checkInTime
                        )}
                      </strong>

                      <span>
                        {formatDate(
                          record.checkInTime
                        )}
                      </span>

                    </div>

                  </div>
                ))}

              </div>
            )}

          </div>

        </div>

      </>
    )}

  </div>
</Layout>

);
}

export default Dashboard;
