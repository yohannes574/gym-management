import { useEffect, useState } from "react";
import { Dumbbell, Handshake } from "lucide-react";
import { apiFetch } from "../../api/api";

function PlanAssignSection({ memberId }) {
  const [assignments, setAssignments] = useState([]);
  const [plans, setPlans] = useState([]);
  const [planId, setPlanId] = useState("");
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [assignmentsRes, plansRes] = await Promise.all([
        apiFetch(
          `/trainer/plan-assignments?memberId=${memberId}`
        ),
        apiFetch("/trainer/plans"),
      ]);

      setAssignments(
        assignmentsRes.ok ? await assignmentsRes.json() : []
      );
      setPlans(plansRes.ok ? await plansRes.json() : []);
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [memberId]);

  const handleAssign = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!planId) {
      setMessage("Choose a workout plan first.");
      return;
    }

    try {
      const response = await apiFetch(
        `/trainer/plans/${planId}/assign`,
        {
          method: "POST",
          body: JSON.stringify({ memberId, notes }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Could not assign the plan."
        );
        return;
      }

      setMessage(data.message);
      setPlanId("");
      setNotes("");
      fetchData();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  return (
    <div className="page-section">
      <h2><Dumbbell /> Workout Plans</h2>

      <form className="inline-form" onSubmit={handleAssign}>
        <h3>Assign a workout plan to this member</h3>

        <div className="form-row">
          <select
            value={planId}
            onChange={(e) => setPlanId(e.target.value)}
          >
            <option value="">Choose a plan...</option>
            {plans.map((plan) => (
              <option key={plan._id} value={plan._id}>
                {plan.name}
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
            <Handshake /> Assign Plan
          </button>
        </div>

        {plans.length === 0 && (
          <p className="empty-text">
            You have no plans yet — create one under
            "Workout Plans".
          </p>
        )}
      </form>

      {message && <p className="form-message">{message}</p>}

      {loading ? (
        <p className="empty-text">Loading plans...</p>
      ) : assignments.length === 0 ? (
        <p className="empty-text">
          No workout plans assigned to this member yet.
        </p>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Start Date</th>
                <th>Status</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment._id}>
                  <td>
                    {assignment.plan?.name ||
                      "Deleted plan"}
                  </td>
                  <td>
                    {new Date(
                      assignment.startDate
                    ).toLocaleDateString()}
                  </td>
                  <td>
                    <span
                      className={`status-badge ${assignment.status}`}
                    >
                      {assignment.status}
                    </span>
                  </td>
                  <td>{assignment.notes || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default PlanAssignSection;