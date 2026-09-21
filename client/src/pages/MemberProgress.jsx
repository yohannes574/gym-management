import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { apiFetch } from "../api/api";

const measurements = [
  ["chest", "Chest"],
  ["waist", "Waist"],
  ["hips", "Hips"],
  ["arm", "Arm"],
  ["thigh", "Thigh"],
  ["bodyFat", "Body fat"],
];

function MemberProgress() {
  const [progress, setProgress] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await apiFetch("/portal/member");
        const data = await response.json();

        if (!response.ok) {
          setMessage(data.message || "Failed to load your progress.");
          return;
        }

        setProgress(data.progress || []);
      } catch (error) {
        console.error(error);
        setMessage("Could not connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <h1>My Fitness Progress</h1>
        <p>Review progress records shared by your trainer.</p>
      </div>

      {message && <p className="form-message">{message}</p>}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading your progress...</p>
        </div>
      ) : progress.length === 0 ? (
        <div className="page-section">
          <p className="empty-text">No progress records have been added yet.</p>
        </div>
      ) : (
        progress.map((record) => (
          <div className="page-section" key={record._id}>
            <div className="section-header">
              <div>
                <h2>{new Date(record.date).toLocaleDateString()}</h2>
                <p className="muted-text">
                  Recorded by {record.recordedBy?.name || "your trainer"}
                </p>
              </div>
            </div>

            <div className="profile-grid">
              {record.weight != null && (
                <div>
                  <span className="profile-label">Weight</span>
                  <strong>{record.weight}</strong>
                </div>
              )}
              {measurements.map(([key, label]) =>
                record.measurements?.[key] != null ? (
                  <div key={key}>
                    <span className="profile-label">{label}</span>
                    <strong>{record.measurements[key]}</strong>
                  </div>
                ) : null
              )}
            </div>

            {record.fitnessResults?.length > 0 && (
              <div className="table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Fitness test</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {record.fitnessResults.map((result, index) => (
                      <tr key={`${record._id}-${index}`}>
                        <td>{result.name}</td>
                        <td>{result.value} {result.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {record.notes && <p className="muted-text">Notes: {record.notes}</p>}
          </div>
        ))
      )}
    </Layout>
  );
}

export default MemberProgress;
