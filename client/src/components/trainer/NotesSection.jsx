import { useEffect, useState } from "react";
import { StickyNote, Plus } from "lucide-react";
import { apiFetch } from "../../api/api";

function NotesSection({ memberId }) {
  const [notes, setNotes] = useState([]);
  const [content, setContent] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchNotes = async () => {
    try {
      setLoading(true);

      const response = await apiFetch(
        `/trainer/members/${memberId}/notes`
      );

      setNotes(response.ok ? await response.json() : []);
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [memberId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!content.trim()) {
      setMessage("Write a note first.");
      return;
    }

    try {
      const response = await apiFetch(
        `/trainer/members/${memberId}/notes`,
        {
          method: "POST",
          body: JSON.stringify({ content }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        setMessage(
          data.message || "Could not add the note."
        );
        return;
      }

      setMessage("");
      setContent("");
      fetchNotes();
    } catch (error) {
      console.error(error);
      setMessage("Could not connect to the server.");
    }
  };

  return (
    <div className="page-section">
      <h2><StickyNote /> Training Notes</h2>

      <form className="inline-form" onSubmit={handleAdd}>
        <h3>Add a note about this member's training</h3>

        <textarea
          rows={3}
          className="note-textarea"
          placeholder="e.g. Struggles with squat form — focus on mobility next session..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <button type="submit" className="primary-btn">
          <Plus /> Add Note
        </button>
      </form>

      {message && <p className="form-message">{message}</p>}

      {loading ? (
        <p className="empty-text">Loading notes...</p>
      ) : notes.length === 0 ? (
        <p className="empty-text">No notes yet.</p>
      ) : (
        <div>
          {notes.map((note) => (
            <div className="note-item" key={note._id}>
              <span className="note-meta">
                {note.createdBy?.name || "Unknown"} ·{" "}
                {new Date(note.createdAt).toLocaleString()}
              </span>
              <p>{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default NotesSection;