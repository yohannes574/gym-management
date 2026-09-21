import { useEffect, useState } from "react";
import { UserCheck, History, AlertCircle } from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function Attendance() {
const [members, setMembers] = useState([]);
const [attendance, setAttendance] = useState([]);
const [memberId, setMemberId] = useState("");
const [message, setMessage] = useState("");

// Fetch all members
const fetchMembers = async () => {
try {
const response = await apiFetch("/members");


  const data = await response.json();

  if (!response.ok) {
    setMessage(data.message || "Failed to load members.");
    return;
  }

  setMembers(data);
} catch (error) {
  console.error(error);
  setMessage("Could not connect to the server.");
}


};

// Fetch attendance records
const fetchAttendance = async () => {
try {
const response = await apiFetch("/attendance");


  const data = await response.json();

  if (!response.ok) {
    setMessage(data.message || "Failed to load attendance.");
    return;
  }

  setAttendance(data);
} catch (error) {
  console.error(error);
  setMessage("Could not connect to the server.");
}


};

// Load data
useEffect(() => {
fetchMembers();
fetchAttendance();
}, []);

// Check in member
const handleCheckIn = async (e) => {
e.preventDefault();


if (!memberId) {
  setMessage("Please select a member.");
  return;
}

try {
  const response = await apiFetch("/attendance", {
    method: "POST",
    body: JSON.stringify({
      memberId,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    setMessage(data.message || "Failed to check in member.");
    return;
  }

  setMessage("Member checked in successfully!");

  setMemberId("");

  fetchAttendance();
} catch (error) {
  console.error(error);
  setMessage("Could not connect to the server.");
}


};

return ( <Layout> <div className="dashboard-page"> <div className="page-header">


    <div>
      <span className="page-header-kicker">Management</span>
      <h1>Attendance</h1>
      <p>
        Track and manage your gym member attendance.
      </p>
    </div>

  </div>

  {message && (
    <p className="message">
      <AlertCircle />
      {message}
    </p>
  )}

  {/* CHECK-IN FORM */}
  <div className="page-section">
    <h2><UserCheck /> Check In Member</h2>

    <form onSubmit={handleCheckIn}>
      <div className="form-grid">
        <select
          value={memberId}
          onChange={(e) => setMemberId(e.target.value)}
        >
          <option value="">
            Select Member
          </option>

          {members.map((member) => (
            <option
              key={member._id}
              value={member._id}
            >
              {member.name} — {member.email}
            </option>
          ))}
        </select>
      </div>

      <br />

      <button
        className="primary-btn"
        type="submit"
      >
        <UserCheck /> Check In
      </button>
    </form>
  </div>

  {/* ATTENDANCE LIST */}
  <div className="page-section">
    <h2><History /> Attendance History</h2>

    {attendance.length === 0 ? (
      <p className="empty-text">No attendance records found.</p>
    ) : (
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Member</th>
              <th>Email</th>
              <th>Check-In Date</th>
              <th>Check-In Time</th>
            </tr>
          </thead>

          <tbody>
            {attendance.map((record) => {
              const checkInDate = new Date(
                record.checkInTime || record.createdAt
              );

              return (
                <tr key={record._id}>
                  <td>
                    {record.member?.name || "-"}
                  </td>

                  <td>
                    {record.member?.email || "-"}
                  </td>

                  <td>
                    {checkInDate.toLocaleDateString()}
                  </td>

                  <td>
                    {checkInDate.toLocaleTimeString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
  </div>
</Layout>


);
}

export default Attendance;
