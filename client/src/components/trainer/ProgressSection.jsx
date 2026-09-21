import { useEffect, useState } from "react";
import { TrendingUp, Plus, X } from "lucide-react";
import { apiFetch } from "../../api/api";

const EMPTY_MEASUREMENTS = {
  chest: "",
  waist: "",
  hips: "",
  arm: "",
  thigh: "",
  bodyFat: "",
};

function ProgressSection({ memberId }) {
  const [records, setRecords] = useState([]);
  const [date, setDate] = useState("");
  const [weight, setWeight] = useState("");
  const [measurements, setMeasurements] = useState(
    EMPTY_MEASUREMENTS
  );
  const [results, setResults] = useState([]);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchRecords = async () => {
    try {
      setLoading(true);

      const response = await apiFetch(
        `/trainer/members/${memberId}/progress`
      );

      setRecords(
        response.ok ? await response.json() : []
      );
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [memberId]);

  const handleMeasurement = (key, value) =>
    setMeasurements((prev) => ({
      ...prev,
      [key]: value,
    }));

  const handleResultChange = (index, field, value) =>
    setResults((prev) =>
      prev.map((result, i) =>
        i === index
          ? { ...result, [field]: value }
          : result
      )
    );

  const addResultRow = () =>
    setResults((prev) => [
      ...prev,
      { name: "", value: "", unit: "" },
    ]);

  const removeResultRow = (index) =>
    setResults((prev) =>
      prev.filter((_, i) => i !== index)
    );

  const handleAdd = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const response = await apiFetch(
        `/trainer/members/${memberId}/progress`,
        {
          method: "POST",
          body: JSON.stringify({
            date: date || undefined,
            weight: weight || undefined,
            measurements,
            fitnessResults: results,
            notes,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Could not record progress."
        );
        return;
      }

      setMessage(data.message);
      setDate("");
      setWeight("");
      setMeasurements(EMPTY_MEASUREMENTS);
      setResults([]);
      setNotes("");
      fetchRecords();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  // Weight trend data (oldest → newest)
  const weightPoints = records
    .filter((record) => record.weight)
    .slice()
    .reverse();

  const maxWeight = Math.max(
    ...weightPoints.map((point) => point.weight),
    0
  );

  return (
    <div className="page-section">
      <h2><TrendingUp /> Member Progress</h2>

      <form className="inline-form" onSubmit={handleAdd}>
        <h3>Record progress</h3>

        <div className="form-row">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />

          <input
            type="number"
            step="0.1"
            min="0"
            placeholder="Weight (kg)"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </div>

        <p className="field-label">Measurements (cm)</p>

        <div className="form-row">
          <input type="number" step="0.1" min="0" placeholder="Chest" value={measurements.chest} onChange={(e) => handleMeasurement("chest", e.target.value)} />
          <input type="number" step="0.1" min="0" placeholder="Waist" value={measurements.waist} onChange={(e) => handleMeasurement("waist", e.target.value)} />
          <input type="number" step="0.1" min="0" placeholder="Hips" value={measurements.hips} onChange={(e) => handleMeasurement("hips", e.target.value)} />
          <input type="number" step="0.1" min="0" placeholder="Arm" value={measurements.arm} onChange={(e) => handleMeasurement("arm", e.target.value)} />
          <input type="number" step="0.1" min="0" placeholder="Thigh" value={measurements.thigh} onChange={(e) => handleMeasurement("thigh", e.target.value)} />
          <input type="number" step="0.1" min="0" max="100" placeholder="Body fat (%)" value={measurements.bodyFat} onChange={(e) => handleMeasurement("bodyFat", e.target.value)} />
        </div>

        <p className="field-label">Fitness results</p>

        {results.map((result, index) => (
          <div className="exercise-row" key={index}>
            <input type="text" placeholder="Result (e.g. Push-ups)" value={result.name} onChange={(e) => handleResultChange(index, "name", e.target.value)} />
            <input type="text" placeholder="Value" value={result.value} onChange={(e) => handleResultChange(index, "value", e.target.value)} />
            <input type="text" placeholder="Unit" value={result.unit} onChange={(e) => handleResultChange(index, "unit", e.target.value)} />
            <button type="button" className="remove-btn" onClick={() => removeResultRow(index)}><X /></button>
          </div>
        ))}

        <button type="button" className="add-btn" onClick={addResultRow}>
          <Plus /> Add result
        </button>

        <textarea
          rows={2}
          className="note-textarea"
          placeholder="Notes (optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <button type="submit" className="primary-btn">
          Save Progress
        </button>
      </form>

      {message && <p className="form-message">{message}</p>}

      {loading ? (
        <p className="empty-text">Loading progress...</p>
      ) : (
        <>
          {/* WEIGHT TREND */}
          {weightPoints.length > 0 && (
            <div className="progress-chart">
              {weightPoints.map((point) => (
                <div
                  className="progress-column"
                  key={point._id}
                >
                  <span className="progress-value">
                    {point.weight}
                  </span>

                  <div
                    className="progress-bar"
                    style={{
                      height: `${
                        maxWeight
                          ? (point.weight / maxWeight) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>

                  <span className="progress-label">
                    {new Date(
                      point.date
                    ).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* HISTORY TABLE */}
          {records.length === 0 ? (
            <p className="empty-text">
              No progress recorded yet.
            </p>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Weight</th>
                    <th>Waist</th>
                    <th>Chest</th>
                    <th>Body Fat</th>
                    <th>Results</th>
                    <th>Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record._id}>
                      <td>
                        {new Date(
                          record.date
                        ).toLocaleDateString()}
                      </td>
                      <td>
                        {record.weight
                          ? `${record.weight} kg`
                          : "-"}
                      </td>
                      <td>
                        {record.measurements?.waist ||
                          "-"}
                      </td>
                      <td>
                        {record.measurements?.chest ||
                          "-"}
                      </td>
                      <td>
                        {record.measurements?.bodyFat
                          ? `${record.measurements.bodyFat}%`
                          : "-"}
                      </td>
                      <td>
                        {record.fitnessResults?.length >
                        0
                          ? record.fitnessResults
                              .map(
                                (result) =>
                                  `${result.name}: ${result.value}${
                                    result.unit
                                      ? ` ${result.unit}`
                                      : ""
                                  }`
                              )
                              .join(", ")
                          : "-"}
                      </td>
                      <td>
                        {record.recordedBy?.name || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ProgressSection;