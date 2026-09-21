import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, UserRound, AlertCircle } from "lucide-react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";
import PlanAssignSection from "../components/trainer/PlanAssignSection";
import SessionsSection from "../components/trainer/SessionsSection";
import ProgressSection from "../components/trainer/ProgressSection";
import NotesSection from "../components/trainer/NotesSection";

function MemberProfile() {
  const { memberId } = useParams();

  const [profile, setProfile] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setMessage("");

        const response = await apiFetch(
          `/trainer/members/${memberId}`
        );

        const data = await response.json();

        if (!response.ok) {
          setMessage(
            data.message ||
              "Failed to load the member profile."
          );
          return;
        }

        setProfile(data);
      } catch (error) {
        console.error(error);
        setMessage("Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [memberId]);

  return (
    <Layout>
      <Link
        to="/dashboard/trainer/members"
        className="back-link"
      >
        <ArrowLeft /> Back to My Members
      </Link>

      {message && <p className="message"><AlertCircle />{message}</p>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading member profile...</p>
        </div>
      ) : (
        profile && (
          <>
            <div className="page-header">
              <h1>{profile.member.name}</h1>
              <p>
                Member profile and training workspace.
              </p>
            </div>

            <div className="page-section">
              <h2><UserRound /> Profile</h2>

              <div className="profile-grid">
                <div>
                  <span className="profile-label">
                    Email
                  </span>
                  <strong>{profile.member.email}</strong>
                </div>

                <div>
                  <span className="profile-label">
                    Phone
                  </span>
                  <strong>{profile.member.phone}</strong>
                </div>

                <div>
                  <span className="profile-label">
                    Gender
                  </span>
                  <strong>
                    {profile.member.gender}
                  </strong>
                </div>

                <div>
                  <span className="profile-label">
                    Status
                  </span>
                  <span
                    className={`status-badge ${profile.member.status}`}
                  >
                    {profile.member.status}
                  </span>
                </div>
              </div>

              {profile.assignment?.notes && (
                <p className="empty-text profile-notes">
                  Assignment notes:{" "}
                  {profile.assignment.notes}
                </p>
              )}
            </div>

            <PlanAssignSection memberId={memberId} />

            <SessionsSection memberId={memberId} />

            <ProgressSection memberId={memberId} />

            <NotesSection memberId={memberId} />
          </>
        )
      )}
    </Layout>
  );
}

export default MemberProfile;