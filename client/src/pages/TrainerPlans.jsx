import { useEffect, useState } from "react";
import {
  Pencil,
  Plus,
  X,
  ClipboardList,
  Handshake,
  Pin,
  Trash2,
} from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

const EMPTY_EXERCISE = {
  name: "",
  sets: 3,
  reps: "",
  duration: "",
  notes: "",
};

function TrainerPlans() {
  const [plans, setPlans] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [members, setMembers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("general");
  const [description, setDescription] = useState("");
  const [exercises, setExercises] = useState([
    { ...EMPTY_EXERCISE },
  ]);
  const [assignPlanId, setAssignPlanId] = useState("");
  const [assignMemberId, setAssignMemberId] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      setMessage("");

      const [plansRes, assignmentsRes, membersRes] =
        await Promise.all([
          apiFetch("/trainer/plans"),
          apiFetch("/trainer/plan-assignments"),
          apiFetch("/trainer/members"),
        ]);

      setPlans(plansRes.ok ? await plansRes.json() : []);
      setAssignments(
        assignmentsRes.ok ? await assignmentsRes.json() : []
      );
      setMembers(
        membersRes.ok ? await membersRes.json() : []
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

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setGoal("general");
    setDescription("");
    setExercises([{ ...EMPTY_EXERCISE }]);
  };

  const handleExerciseChange = (index, field, value) =>
    setExercises((prev) =>
      prev.map((exercise, i) =>
        i === index
          ? { ...exercise, [field]: value }
          : exercise
      )
    );

  const addExerciseRow = () =>
    setExercises((prev) => [...prev, { ...EMPTY_EXERCISE }]);

  const removeExerciseRow = (index) =>
    setExercises((prev) =>
      prev.filter((_, i) => i !== index)
    );

  const startEdit = (plan) => {
    setEditingId(plan._id);
    setName(plan.name);
    setGoal(plan.goal || "general");
    setDescription(plan.description || "");
    setExercises(
      plan.exercises && plan.exercises.length > 0
        ? plan.exercises.map((exercise) => ({
            ...exercise,
          }))
        : [{ ...EMPTY_EXERCISE }]
    );
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!name.trim()) {
      setMessage("Plan name is required.");
      return;
    }

    try {
      const response = await apiFetch(
        editingId
          ? `/trainer/plans/${editingId}`
          : "/trainer/plans",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify({
            name,
            goal,
            description,
            exercises,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Could not save the plan."
        );
        return;
      }

      setMessage(data.message);
      resetForm();
      fetchData();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  const handleDelete = async (id) => {
    setMessage("");

    try {
      const response = await apiFetch(
        `/trainer/plans/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Could not delete the plan."
        );
        return;
      }

      setMessage(data.message);
      if (editingId === id) resetForm();
      fetchData();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!assignPlanId || !assignMemberId) {
      setMessage("Choose a plan and a member.");
      return;
    }

    try {
      const response = await apiFetch(
        `/trainer/plans/${assignPlanId}/assign`,
        {
          method: "POST",
          body: JSON.stringify({
            memberId: assignMemberId,
            notes: assignNotes,
          }),
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
      setAssignPlanId("");
      setAssignMemberId("");
      setAssignNotes("");
      fetchData();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  const formatDate = (value) =>
    value ? new Date(value).toLocaleDateString() : "-";

  return (
    <Layout>
      <div className="page-header">
        <div>
          <span className="page-header-kicker">Trainer Portal</span>
          <h1>Workout Plans</h1>
          <p>
            Create workout plans and assign them to your
            members.
          </p>
        </div>
      </div>

      {message && <p className="form-message">{message}</p>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading plans...</p>
        </div>
      ) : (
        <>
          {/* CREATE / EDIT FORM */}
          <div className="page-section">
            <h2>
              {editingId ? (
                <>
                  <Pencil /> Edit Workout Plan
                </>
              ) : (
                <>
                  <Plus /> Create New Workout Plan
                </>
              )}
            </h2>

            <form
              className="inline-form"
              onSubmit={handleSave}
            >
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Plan name (e.g. Beginner Full Body)"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />

                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                >
                  <option value="general">General</option>
                  <option value="weight-loss">Weight loss</option>
                  <option value="muscle-gain">Muscle gain</option>
                  <option value="endurance">Endurance</option>
                  <option value="strength">Strength</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <textarea
                rows={2}
                className="note-textarea"
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <p className="field-label">Exercises</p>

              {exercises.map((exercise, index) => (
                <div
                  className="exercise-row"
                  key={index}
                >
                  <input
                    type="text"
                    placeholder="Exercise name"
                    value={exercise.name}
                    onChange={(e) =>
                      handleExerciseChange(
                        index,
                        "name",
                        e.target.value
                      )
                    }
                  />
                  <input
                    type="number"
                    min="1"
                    placeholder="Sets"
                    value={exercise.sets}
                    onChange={(e) =>
                      handleExerciseChange(
                        index,
                        "sets",
                        e.target.value
                      )
                    }
                  />
                  <input
                    type="text"
                    placeholder="Reps (e.g. 8-12)"
                    value={exercise.reps}
                    onChange={(e) =>
                      handleExerciseChange(
                        index,
                        "reps",
                        e.target.value
                      )
                    }
                  />
                  <input
                    type="text"
                    placeholder="Duration (e.g. 30s)"
                    value={exercise.duration}
                    onChange={(e) =>
                      handleExerciseChange(
                        index,
                        "duration",
                        e.target.value
                      )
                    }
                  />
                  <input
                    type="text"
                    placeholder="Notes"
                    value={exercise.notes}
                    onChange={(e) =>
                      handleExerciseChange(
                        index,
                        "notes",
                        e.target.value
                      )
                    }
                  />
                  <button
                    type="button"
                    className="remove-btn"
                    onClick={() => removeExerciseRow(index)}
                  >
                    <X />
                  </button>
                </div>
              ))}

              <button
                type="button"
                className="add-btn"
                onClick={addExerciseRow}
              >
                <Plus /> Add exercise
              </button>

              <div className="form-actions">
                <button type="submit" className="primary-btn">
                  {editingId ? "Save Changes" : "Create Plan"}
                </button>
                {editingId && (
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={resetForm}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>


          {/* PLANS LIST */}
          <div className="page-section">
            <h2><ClipboardList /> My Workout Plans ({plans.length})</h2>

            {plans.length === 0 ? (
              <p className="empty-text">
                You have not created any workout plans yet.
              </p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Goal</th>
                      <th>Exercises</th>
                      <th>Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {plans.map((plan) => (
                      <tr key={plan._id}>
                        <td>
                          <strong>{plan.name}</strong>
                          {plan.description && (
                            <p className="muted-text">
                              {plan.description}
                            </p>
                          )}
                        </td>
                        <td>{plan.goal || "general"}</td>
                        <td>{plan.exercises?.length || 0}</td>
                        <td>{formatDate(plan.createdAt)}</td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="action-btn approve"
                              onClick={() => startEdit(plan)}
                            >
                              <Pencil /> Edit
                            </button>
                            <button
                              className="action-btn reject"
                              onClick={() => {
                                if (
                                  window.confirm(
                                    `Delete the plan "${plan.name}"? This also removes it from any members.`
                                  )
                                ) {
                                  handleDelete(plan._id);
                                }
                              }}
                            >
                              <Trash2 /> Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ASSIGN PLAN */}
          <div className="page-section">
            <h2><Handshake /> Assign a Plan to a Member</h2>

            <form className="inline-form" onSubmit={handleAssign}>
              <div className="form-row">
                <select
                  value={assignPlanId}
                  onChange={(e) => setAssignPlanId(e.target.value)}
                >
                  <option value="">Choose a plan...</option>
                  {plans.map((plan) => (
                    <option key={plan._id} value={plan._id}>
                      {plan.name}
                    </option>
                  ))}
                </select>

                <select
                  value={assignMemberId}
                  onChange={(e) => setAssignMemberId(e.target.value)}
                >
                  <option value="">Choose a member...</option>
                  {members.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                />

                <button type="submit" className="primary-btn">
                  Assign Plan
                </button>
              </div>

              {plans.length === 0 && (
                <p className="empty-text">
                  Create a plan above before assigning one.
                </p>
              )}
            </form>
          </div>

          {/* ASSIGNMENTS LIST */}
          <div className="page-section">
            <h2><Pin /> Recent Assignments ({assignments.length})</h2>

            {assignments.length === 0 ? (
              <p className="empty-text">No plan assignments yet.</p>
            ) : (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Member</th>
                      <th>Start Date</th>
                      <th>Status</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assignments.map((assignment) => (
                      <tr key={assignment._id}>
                        <td>{assignment.plan?.name || "Deleted plan"}</td>
                        <td>{assignment.member?.name || "—"}</td>
                        <td>{formatDate(assignment.startDate)}</td>
                        <td>
                          <span className={`status-badge ${assignment.status}`}>
                            {assignment.status}
                          </span>
                        </td>
                        <td>{assignment.notes || "—"}</td>
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

export default TrainerPlans;
