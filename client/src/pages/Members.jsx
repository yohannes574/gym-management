import { useEffect, useState } from "react";
import {
  UserPlus,
  Users,
  Pencil,
  Archive,
  ArchiveRestore,
  Search,
  AlertCircle,
} from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

function Members() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("male");

  const [editingMember, setEditingMember] = useState(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState("active");

  const fetchMembers = async (includeArchived = showArchived) => {
    try {
      setLoading(true);

      const endpoint = includeArchived
        ? "/members?includeArchived=true"
        : "/members";
      const response = await apiFetch(endpoint);
      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          setMessage(
            "Access denied. You do not have permission to manage members."
          );
        } else if (response.status === 401) {
          setMessage("Your session has expired. Please log in again.");
        } else {
          setMessage(data.message || "Failed to get members.");
        }

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
    fetchMembers(false);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await apiFetch("/members", {
        method: "POST",
        body: JSON.stringify({ name, email, phone, gender }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to create member.");
        return;
      }

      setMessage("Member added successfully!");

      setName("");
      setEmail("");
      setPhone("");
      setGender("male");

      fetchMembers();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await apiFetch(`/members/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to delete member.");
        return;
      }

      setMessage("Member archived successfully.");
      fetchMembers();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  const handleRestore = async (member) => {
    try {
      const response = await apiFetch(`/members/${member._id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: member.name,
          email: member.email,
          phone: member.phone,
          status: "active",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to restore member.");
        return;
      }

      setMessage("Member restored. Assign a membership and trainer as needed.");
      fetchMembers();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  const toggleArchived = () => {
    const includeArchived = !showArchived;
    setShowArchived(includeArchived);
    fetchMembers(includeArchived);
  };

  const filteredMembers = members.filter((member) => {
    const searchText = search.toLowerCase();

    return (
      member.name?.toLowerCase().includes(searchText) ||
      member.email?.toLowerCase().includes(searchText) ||
      member.phone?.toLowerCase().includes(searchText)
    );
  });

  const handleEdit = (member) => {
    setEditingMember(member);
    setEditName(member.name || "");
    setEditEmail(member.email || "");
    setEditPhone(member.phone || "");
    setEditStatus(member.status || "active");
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const response = await apiFetch(`/members/${editingMember._id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone: editPhone,
          status: editStatus,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Failed to update member.");
        return;
      }

      setMessage("Member updated successfully!");
      setEditingMember(null);
      fetchMembers();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  return (
    <Layout>
      <div className="dashboard-page">
        <div className="page-header">
          <div>
            <span className="page-header-kicker">Management</span>
            <h1>Members</h1>
            <p>Manage your gym members and their information.</p>
          </div>
        </div>

        {message && (
          <p className="message">
            <AlertCircle />
            {message}
          </p>
        )}

        {/* ADD MEMBER */}
        <div className="page-section">
          <h2>
            <UserPlus /> Add New Member
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div>
                <label>Name</label>
                <input
                  type="text"
                  placeholder="Member name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label>Email</label>
                <input
                  type="email"
                  placeholder="member@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <label>Phone</label>
                <input
                  type="text"
                  placeholder="Phone number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div>
                <label>Gender</label>
                <select value={gender} onChange={(e) => setGender(e.target.value)}>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div className="form-actions">
              <button className="primary-btn" type="submit">
                <UserPlus /> Add Member
              </button>
            </div>
          </form>
        </div>

        {/* EDIT MEMBER */}
        {editingMember && (
          <div className="page-section">
            <h2>
              <Pencil /> Edit Member
            </h2>

            <form onSubmit={handleUpdate}>
              <div className="form-grid">
                <div>
                  <label>Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label>Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label>Phone</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label>Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="form-actions">
                <button className="primary-btn" type="submit">
                  Update Member
                </button>

                <button
                  className="secondary-btn"
                  type="button"
                  onClick={() => setEditingMember(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MEMBERS LIST */}
        <div className="page-section">
          <div className="section-header">
            <div>
              <h2>
                <Users /> All Members
              </h2>
              <p>{members.length} member{members.length === 1 ? "" : "s"} shown</p>
            </div>
            <button className="secondary-btn" onClick={toggleArchived}>
              {showArchived ? <ArchiveRestore /> : <Archive />}
              {showArchived ? "Hide archived" : "Show archived"}
            </button>
          </div>

          <div className="search-box">
            <Search className="search-box-icon" />
            <input
              className="search-input"
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {loading ? (
            <p className="muted-text">Loading members...</p>
          ) : filteredMembers.length === 0 ? (
            <p className="empty-text">
              {members.length === 0
                ? "No members found yet. Add your first member above."
                : "No members match your search."}
            </p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Gender</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMembers.map((member) => (
                    <tr key={member._id}>
                      <td>
                        <strong>{member.name}</strong>
                      </td>
                      <td>{member.email}</td>
                      <td>{member.phone}</td>
                      <td className="capitalize">{member.gender}</td>
                      <td>
                        <span className={`status-badge ${member.archivedAt ? "inactive" : member.status}`}>
                          {member.archivedAt ? "archived" : member.status}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="secondary-btn"
                            onClick={() => handleEdit(member)}
                          >
                            <Pencil /> Edit
                          </button>

                          {member.archivedAt ? (
                            <button
                              className="primary-btn"
                              onClick={() => handleRestore(member)}
                            >
                              <ArchiveRestore /> Restore
                            </button>
                          ) : (
                            <button
                              className="danger-btn"
                              onClick={() => handleDelete(member._id)}
                            >
                              <Archive /> Archive
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
      </div>
    </Layout>
  );
}

export default Members;
