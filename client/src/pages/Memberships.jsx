import { useEffect, useState } from "react";
//import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function Memberships() {
  //const navigate = useNavigate();

  const [plans, setPlans] = useState([]);
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [description, setDescription] = useState("");

  // GET all membership plans
  const fetchPlans = async () => {
    try {
      const response = await apiFetch("/membership-plans");

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to get membership plans.");
        return;
      }

      setPlans(data);
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  // CREATE membership plan
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await apiFetch("/membership-plans", {
        method: "POST",

        body: JSON.stringify({
          name,
          price: Number(price),
          duration: Number(duration),
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to create membership plan.");
        return;
      }

      setMessage("Membership plan created successfully!");

      // Clear form
      setName("");
      setPrice("");
      setDuration("");
      setDescription("");

      // Reload plans
      fetchPlans();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  // DELETE membership plan
  const handleDelete = async (id) => {
    try {
      const response = await apiFetch(
        `/membership-plans/${id}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to delete membership plan.");
        return;
      }

      setMessage("Membership plan deleted successfully!");

      fetchPlans();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Membership Plans</h1>
        <p>Create and manage your gym membership plans.</p>
      </div>

      {message && (
        <p className="message">
          {message}
        </p>
      )}

      {/* CREATE PLAN */}

      <div className="page-section">
        <h2>Create Membership Plan</h2>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">

            <input
              type="text"
              placeholder="Plan name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <input
              type="number"
              placeholder="Price (ETB)"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />

            <input
              type="number"
              placeholder="Duration (days)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />

            <textarea
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

          </div>

          <br />

          <button
            className="primary-btn"
            type="submit"
          >
            + Create Plan
          </button>
        </form>
      </div>

      {/* PLANS LIST */}

      <div className="page-section">
        <h2>All Membership Plans</h2>

        {plans.length === 0 ? (
          <p>No membership plans found.</p>
        ) : (
          <div className="table-container">

            <table className="data-table">

              <thead>
                <tr>
                  <th>Plan Name</th>
                  <th>Price</th>
                  <th>Duration</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>

                {plans.map((plan) => (
                  <tr key={plan._id}>

                    <td>{plan.name}</td>

                    <td>
                      {plan.price} ETB
                    </td>

                    <td>
                      {plan.duration} days
                    </td>

                    <td>
                      {plan.description || "-"}
                    </td>

                    <td>
                      {plan.active ? "Active" : "Inactive"}
                    </td>

                    <td>
                      <button
                        className="danger-btn"
                        onClick={() =>
                          handleDelete(plan._id)
                        }
                      >
                        Delete
                      </button>
                    </td>

                  </tr>
                ))}

              </tbody>

            </table>

          </div>
        )}
      </div>
    </Layout>
  );
}

export default Memberships;

