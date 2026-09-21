const ProgressRecord = require("../models/ProgressRecord");
const TrainingNote = require("../models/TrainingNote");

const MEASUREMENT_KEYS = [
  "chest",
  "waist",
  "hips",
  "arm",
  "thigh",
  "bodyFat",
];

const toPositiveNumber = (raw) => {
  if (raw === undefined || raw === null || raw === "") {
    return null;
  }

  const num = Number(raw);

  return Number.isNaN(num) || num <= 0 ? null : num;
};

// POST /api/trainer/members/:memberId/progress
const addProgress = async (req, res) => {
  try {
    const {
      date,
      weight,
      measurements,
      fitnessResults,
      notes,
    } = req.body;

    // The assignment guard already verified access
    const record = {
      member: req.params.memberId,
      recordedBy: req.user.userId,
    };

    if (date) {
      const parsed = new Date(date);

      if (isNaN(parsed.getTime())) {
        return res.status(400).json({
          message: "Invalid date.",
        });
      }

      record.date = parsed;
    }

    const parsedWeight = toPositiveNumber(weight);

    if (weight !== undefined && weight !== "" && !parsedWeight) {
      return res.status(400).json({
        message: "Weight must be a positive number.",
      });
    }

    if (parsedWeight) {
      record.weight = parsedWeight;
    }

    if (
      measurements &&
      typeof measurements === "object"
    ) {
      record.measurements = {};

      MEASUREMENT_KEYS.forEach((key) => {
        const value = toPositiveNumber(measurements[key]);

        if (value) {
          record.measurements[key] = value;
        }
      });
    }

    if (Array.isArray(fitnessResults)) {
      record.fitnessResults = fitnessResults
        .filter(
          (result) =>
            result &&
            result.name &&
            result.name.trim() &&
            result.value !== undefined &&
            result.value !== ""
        )
        .map((result) => ({
          name: result.name.trim(),
          value: String(result.value).trim(),
          unit: (result.unit || "").trim(),
        }));
    }

    if (notes && notes.trim()) {
      record.notes = notes.trim();
    }

    const progress = await ProgressRecord.create(record);

    const populated = await ProgressRecord.findById(
      progress._id
    ).populate("recordedBy", "name role");

    res.status(201).json({
      message: "Progress recorded successfully.",
      progress: populated,
    });
  } catch (error) {
    console.error("Add progress error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err) => err.message
      );

      return res.status(400).json({
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      message: "Server error while recording progress.",
    });
  }
};

// GET /api/trainer/members/:memberId/progress
const getProgress = async (req, res) => {
  try {
    const progress = await ProgressRecord.find({
      member: req.params.memberId,
    })
      .populate("recordedBy", "name role")
      .sort({ date: -1 });

    res.json(progress);
  } catch (error) {
    console.error("Get progress error:", error);

    res.status(500).json({
      message:
        "Server error while getting progress history.",
    });
  }
};

// POST /api/trainer/members/:memberId/notes
const addNote = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        message: "Note content is required.",
      });
    }

    const note = await TrainingNote.create({
      member: req.params.memberId,
      createdBy: req.user.userId,
      content: content.trim(),
    });

    const populated = await TrainingNote.findById(
      note._id
    ).populate("createdBy", "name role");

    res.status(201).json({
      message: "Training note added successfully.",
      note: populated,
    });
  } catch (error) {
    console.error("Add note error:", error);

    res.status(500).json({
      message: "Server error while adding the note.",
    });
  }
};

// GET /api/trainer/members/:memberId/notes
const getNotes = async (req, res) => {
  try {
    const notes = await TrainingNote.find({
      member: req.params.memberId,
    })
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 });

    res.json(notes);
  } catch (error) {
    console.error("Get notes error:", error);

    res.status(500).json({
      message: "Server error while getting notes.",
    });
  }
};

module.exports = {
  addProgress,
  getProgress,
  addNote,
  getNotes,
};