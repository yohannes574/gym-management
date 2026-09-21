import { useEffect, useState } from "react";
import { ClipboardList, UserPlus } from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function MemberMemberships() {

  const [members, setMembers] = useState([]);

  const [plans, setPlans] = useState([]);

  const [memberships, setMemberships] = useState([]);

  const [memberId, setMemberId] = useState("");

  const [planId, setPlanId] = useState("");

  const [startDate, setStartDate] = useState("");

  const [message, setMessage] = useState("");

  // Fetch members

  const fetchMembers = async () => {

    try {

      const response = await apiFetch("/members");

      const data = await response.json();

      if (response.ok) {

        setMembers(data);

      }

    } catch (error) {

      console.error(error);

    }

  };

  // Fetch membership plans

  const fetchPlans = async () => {

    try {

      const response = await apiFetch("/membership-plans");

      const data = await response.json();

      if (response.ok) {

        setPlans(data);

      }

    } catch (error) {

      console.error(error);

    }

  };

  // Fetch memberships

  const fetchMemberships = async () => {

    try {

      const response = await apiFetch("/memberships");

      const data = await response.json();

      if (!response.ok) {

        setMessage(data.message || "Failed to load memberships.");

        return;

      }

      setMemberships(data);

    } catch (error) {

      console.error(error);

      setMessage("Could not connect to the server.");

    }

  };

  // Load everything

  useEffect(() => {

    fetchMembers();

    fetchPlans();

    fetchMemberships();

  }, []);

  // Assign membership

  const handleSubmit = async (e) => {

    e.preventDefault();

    if (!memberId || !planId) {

      setMessage("Please select a member and membership plan.");

      return;

    }

    try {

      const response = await apiFetch("/memberships", {

        method: "POST",

        body: JSON.stringify({

          memberId,

          planId,

          startDate: startDate || undefined,

        }),

      });

      const data = await response.json();

      if (!response.ok) {

        setMessage(data.message || "Failed to assign membership.");

        return;

      }

      setMessage("Membership assigned successfully!");

      setMemberId("");

      setPlanId("");

      setStartDate("");

      fetchMemberships();

    } catch (error) {

      console.error(error);

      setMessage("Could not connect to the server.");

    }

  };

  // Cancel membership

  const handleCancel = async (id) => {

    try {

      const response = await apiFetch(
        `/memberships/${id}/cancel`,
        {

          method: "PUT",

        }
      );

      const data = await response.json();

      if (!response.ok) {

        setMessage(data.message || "Failed to cancel membership.");

        return;

      }

      setMessage("Membership cancelled successfully.");

      fetchMemberships();

    } catch (error) {

      console.error(error);

      setMessage("Could not connect to the server.");

    }

  };

  // Renew membership

  const handleRenew = async (id) => {

    try {

      const response = await apiFetch(
        `/memberships/${id}/renew`,
        {

          method: "PUT",

        }
      );

      const data = await response.json();

      if (!response.ok) {

        setMessage(data.message || "Failed to renew membership.");

        return;

      }

      setMessage("Membership renewed successfully!");

      fetchMemberships();

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
          <h1>Member Memberships</h1>
          <p>
            Assign membership plans and manage member subscriptions.
          </p>
        </div>

      </div>

      {message && (

        <p className="message">

          {message}

        </p>

      )}

      {/* ASSIGN MEMBERSHIP */}

      <div className="page-section">

        <h2><UserPlus /> Assign Membership Plan</h2>

        <form onSubmit={handleSubmit}>

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

            <select

              value={planId}

              onChange={(e) => setPlanId(e.target.value)}

            >

              <option value="">

                Select Membership Plan

              </option>

              {plans.map((plan) => (

                <option

                  key={plan._id}

                  value={plan._id}

                >

                  {plan.name} — {plan.price} ETB (

                  {plan.duration} days)

                </option>

              ))}

            </select>

            <input

              type="date"

              value={startDate}

              onChange={(e) =>

                setStartDate(e.target.value)

              }

            />

          </div>

          <br />

          <button

            className="primary-btn"

            type="submit"

          >

            <UserPlus /> Assign Membership

          </button>

        </form>

      </div>

      {/* MEMBERSHIP LIST */}

      <div className="page-section">

        <h2><ClipboardList /> All Memberships</h2>

        {memberships.length === 0 ? (

          <p>No memberships assigned yet.</p>

        ) : (

          <div className="table-container">

            <table className="data-table">

              <thead>

                <tr>

                  <th>Member</th>

                  <th>Plan</th>

                  <th>Price</th>

                  <th>Start Date</th>

                  <th>End Date</th>

                  <th>Status</th>

                  <th>Action</th>

                </tr>

              </thead>

              <tbody>

                {memberships.map((membership) => (

                  <tr key={membership._id}>

                    <td>

                      {membership.member?.name || "-"}

                    </td>

                    <td>

                      {membership.plan?.name || "-"}

                    </td>

                    <td>

                      {membership.plan?.price || 0} ETB

                    </td>

                    <td>

                      {new Date(

                        membership.startDate

                      ).toLocaleDateString()}

                    </td>

                    <td>

                      {new Date(

                        membership.endDate

                      ).toLocaleDateString()}

                    </td>

                    <td>

                      <span

                        className={`status-badge ${

                          membership.status === "active"

                            ? "status-active"

                            : "status-cancelled"

                        }`}

                      >

                        {membership.status}

                      </span>

                    </td>

                    <td>

                      <div className="action-buttons">

                        {membership.status ===

                        "active" ? (

                          <button

                            className="danger-btn"

                            onClick={() =>

                              handleCancel(

                                membership._id

                              )

                            }

                          >

                            Cancel

                          </button>

                        ) : (

                          <button

                            className="primary-btn"

                            onClick={() =>

                              handleRenew(

                                membership._id

                              )

                            }

                          >

                            Renew

                          </button>

                        )}

                      </div>

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

export default MemberMemberships;

