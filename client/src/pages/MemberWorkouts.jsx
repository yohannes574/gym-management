import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function MemberWorkouts() {
  const [planAssignments, setPlanAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await apiFetch("/portal/member");
        const data = await response.json();

        if (!response.ok) {
          setError(
            data.message || "Failed to load your workout plans."
          );
          return;
        }

        setPlanAssignments(data.planAssignments || []);
      } catch (err) {
        console.error(err);
        setError("Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <span className="page-header-kicker">Fitness</span>
          <h1>My Workout Plans</h1>
          <p>
            Workout plans your trainer has assigned to you.
          </p>
        </div>
      </div>

      {error && <p className="form-message">{error}</p>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your workout plans...</p>
        </div>
      ) : planAssignments.length === 0 ? (
        <div className="page-section">
          <p className="empty-text">
            Your trainer has not assigned a workout plan to you
            yet. Reach out to your trainer to get one.
          </p>
        </div>
      ) : (
        planAssignments.map((assignment) => {
          const plan = assignment.plan;
          const exercises = plan?.exercises || [];
          const active = assignment.status === "active";

          return (
            <div className="page-section" key={assignment._id}>
              <div className="plan-card-header">
                <div>
                  <h2>
                    {plan?.name || "Workout Plan"}
                  </h2>
                  {plan?.description && (
                    <p className="muted-text">
                      {plan.description}
                    </p>
                  )}
                  <p className="muted-text">
                    Assigned by{" "}
                    {assignment.trainer?.name || "your trainer"}{" "}
                    on{" "}
                    {new Date(
                      assignment.startDate
                    ).toLocaleDateString()}
                  </p>
                </div>

                <span
                  className={`status-badge ${assignment.status}`}
                >
                  {assignment.status}
                </span>
              </div>

              {plan?.goal && (
                <p className="plan-goal">
                  <strong>Goal:</strong> {plan.goal}
                </p>
              )}

              {exercises.length === 0 ? (
                <p className="empty-text">
                  No exercises listed in this plan.
                </p>
              ) : (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Exercise</th>
                        <th>Sets</th>
                        <th>Reps</th>
                        <th>Duration</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exercises.map((exercise, idx) => (
                        <tr key={idx}>
                          <td>{idx + 1}</td>
                          <td>
                            <strong>
                              {exercise.name}
                            </strong>
                          </td>
                          <td>{exercise.sets || "—"}</td>
                          <td>{exercise.reps || "—"}</td>
                          <td>{exercise.duration || "—"}</td>
                          <td>{exercise.notes || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {assignment.notes && (
                <p className="assignment-note">
                  <strong>Trainer note:</strong>{" "}
                  {assignment.notes}
                </p>
              )}

              {!active && (
                <p className="muted-text plan-complete">
                  <CheckCircle2 style={{ width: 14, height: 14, verticalAlign: -2, marginRight: 5 }} />
                  Plan completed
                </p>
              )}
            </div>
          );
        })
      )}
    </Layout>
  );
}

export default MemberWorkouts;