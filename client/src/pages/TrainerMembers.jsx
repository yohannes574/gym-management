import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Search, ArrowRight, AlertCircle } from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function TrainerMembers() {
  const navigate = useNavigate();

  const [members, setMembers] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchMembers = async (searchText = "") => {
    try {
      setLoading(true);
      setMessage("");

      const query = searchText.trim()
        ? `?search=${encodeURIComponent(searchText.trim())}`
        : "";

      const response = await apiFetch(
        `/trainer/members${query}`
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Failed to load your members."
        );
        return;
      }

      setMembers(data);
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchMembers(search);
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <span className="page-header-kicker">Trainer Portal</span>
          <h1>My Members</h1>
          <p>Members assigned to you by the gym staff.</p>
        </div>
      </div>

      {message && <p className="message"><AlertCircle />{message}</p>}

      <form className="search-box" onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button type="submit" className="primary-btn">
          <Search /> Search
        </button>
      </form>

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading members...</p>
        </div>
      ) : (
        <div className="page-section">
          <h2>
            <Users /> Assigned Members ({members.length})
          </h2>

          {members.length === 0 ? (
            <p className="empty-text">
              No assigned members found. Members are
              assigned to you by the gym staff.
            </p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member._id}>
                      <td>{member.name}</td>
                      <td>{member.email}</td>
                      <td>{member.phone}</td>
                      <td>
                        <span
                          className={`status-badge ${member.status}`}
                        >
                          {member.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="member-link"
                          onClick={() =>
                            navigate(
                              `/dashboard/trainer/members/${member._id}`
                            )
                          }
                        >
                          View Profile <ArrowRight />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

export default TrainerMembers;