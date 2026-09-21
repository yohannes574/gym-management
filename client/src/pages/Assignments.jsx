import { useEffect, useState } from "react";
import { UserPlus, ClipboardList, Handshake, AlertCircle } from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [members, setMembers] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [memberId, setMemberId] = useState("");
  const [trainerId, setTrainerId] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      setMessage("");

      const [assignmentsRes, membersRes, trainersRes] =
        await Promise.all([
          apiFetch("/staff/assignments"),
          apiFetch("/members"),
          apiFetch("/staff/trainers?status=approved"),
        ]);

      const assignmentsData = await assignmentsRes.json();

      if (!assignmentsRes.ok) {
        setMessage(
          assignmentsData.message ||
            "Failed to load assignments."
        );
        return;
      }

      setAssignments(assignmentsData);
      setMembers(
        membersRes.ok ? await membersRes.json() : []
      );
      setTrainers(
        trainersRes.ok ? await trainersRes.json() : []
      );
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssign = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!memberId || !trainerId) {
      setMessage("Select a member and a trainer.");
      return;
    }

    try {
      const response = await apiFetch("/staff/assignments", {
        method: "POST",
        body: JSON.stringify({ memberId, trainerId, notes }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Could not assign the member."
        );
        return;
      }

      setMessage(data.message);
      setMemberId("");
      setTrainerId("");
      setNotes("");
      fetchData();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  const handleUnassign = async (id) => {
    setMessage("");

    try {
      const response = await apiFetch(
        `/staff/assignments/${id}/unassign`,
        {
          method: "PATCH",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Could not unassign the member."
        );
        return;
      }

      setMessage(data.message);
      fetchData();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <span className="page-header-kicker">Management</span>
          <h1>Trainer Assignments</h1>
          <p>
            Assign members to trainers for personal training.
          </p>
        </div>
      </div>

      {message && <p className="message"><AlertCircle />{message}</p>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      ) : (
        <>
          <div className="page-section">
            <h2><UserPlus /> Assign a Member</h2>

            <form
              className="form-grid"
              onSubmit={handleAssign}
            >
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                required
              >
                <option value="">Select member...</option>
                {members.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>

              <select
                value={trainerId}
                onChange={(e) => setTrainerId(e.target.value)}
                required
              >
                <option value="">Select trainer...</option>
                {trainers.map((trainer) => (
                  <option
                    key={trainer._id}
                    value={trainer._id}
                  >
                    {trainer.name} ({trainer.email})
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Notes (optional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />

              <button type="submit" className="primary-btn">
                <Handshake /> Assign
              </button>
            </form>
          </div>

          <div className="page-section">
            <h2><ClipboardList /> Current Assignments</h2>

            {assignments.length === 0 ? (
              <p className="empty-text">
                No assignments yet.
              </p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Member</th>
                      <th>Trainer</th>
                      <th>Assigned By</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment) => (
                      <tr key={assignment._id}>
                        <td>
                          {assignment.member?.name ||
                            "Deleted member"}
                        </td>
                        <td>
                          {assignment.trainer?.name ||
                            "Unknown"}
                        </td>
                        <td>
                          {assignment.assignedBy?.name ||
                            "-"}
                        </td>
                        <td>
                          {new Date(
                            assignment.createdAt
                          ).toLocaleDateString()}
                        </td>
                        <td>
                          <span
                            className={`status-badge ${assignment.status}`}
                          >
                            {assignment.status}
                          </span>
                        </td>
                        <td>
                          {assignment.status === "active" && (
                            <button
                              className="action-btn reject"
                              onClick={() =>
                                handleUnassign(assignment._id)
                              }
                            >
                              Unassign
                            </button>
                          )}
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

export default Assignments;