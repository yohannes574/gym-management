const mongoose = require("mongoose");
const TrainingSession = require("../models/TrainingSession");
const TrainerAssignment = require("../models/TrainerAssignment");

// GET /api/trainer/sessions?filter=upcoming|completed|cancelled&memberId=
const getSessions = async (req, res) => {
  try {
    const { filter, memberId } = req.query;

    const query = { trainer: req.user.userId };

    if (
      memberId &&
      mongoose.isValidObjectId(memberId)
    ) {
      query.member = memberId;
    }

    if (
      filter === "upcoming" ||
      filter === "completed" ||
      filter === "cancelled"
    ) {
      query.status =
        filter === "upcoming" ? "scheduled" : filter;
    }

    const sessions = await TrainingSession.find(query)
      .populate("member", "name email phone")
      .sort(
        filter === "upcoming"
          ? { scheduledAt: 1 }
          : { scheduledAt: -1 }
      )
      .limit(100);

    res.json(sessions);
  } catch (error) {
    console.error("Get sessions error:", error);

    res.status(500).json({
      message: "Server error while getting sessions.",
    });
  }
};

// POST /api/trainer/sessions { memberId, scheduledAt, activity, location, notes }
const createSession = async (req, res) => {
  try {
    const { memberId, scheduledAt, activity, location, notes } =
      req.body;

    if (!memberId || !mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({
        message: "A valid member is required.",
      });
    }

    if (!scheduledAt || !activity || !activity.trim()) {
      return res.status(400).json({
        message:
          "Date/time and activity are required.",
      });
    }

    const date = new Date(scheduledAt);

    if (isNaN(date.getTime())) {
      return res.status(400).json({
        message: "Invalid date/time.",
      });
    }

    // The member must be actively assigned to this trainer
    const assignment = await TrainerAssignment.findOne({
      trainer: req.user.userId,
      member: memberId,
      status: "active",
    });

    if (!assignment) {
      return res.status(403).json({
        message: "This member is not assigned to you.",
      });
    }

    const session = await TrainingSession.create({
      trainer: req.user.userId,
      member: memberId,
      scheduledAt: date,
      activity: activity.trim(),
      location: (location || "").trim(),
      notes: (notes || "").trim(),
    });

    const populated = await TrainingSession.findById(
      session._id
    ).populate("member", "name email phone");

    res.status(201).json({
      message: "Training session scheduled successfully.",
      session: populated,
    });
  } catch (error) {
    console.error("Create session error:", error);

    res.status(500).json({
      message:
        "Server error while scheduling the session.",
    });
  }
};

// PATCH /api/trainer/sessions/:id/complete
const completeSession = async (req, res) => {
  try {
    const session = await TrainingSession.findOne({
      _id: req.params.id,
      trainer: req.user.userId,
      status: "scheduled",
    });

    if (!session) {
      return res.status(404).json({
        message: "Scheduled session not found.",
      });
    }

    session.status = "completed";
    session.completedAt = new Date();

    if (req.body && req.body.notes) {
      session.notes = req.body.notes.trim();
    }

    await session.save();

    const populated = await TrainingSession.findById(
      session._id
    ).populate("member", "name email phone");

    res.json({
      message: "Session marked as completed.",
      session: populated,
    });
  } catch (error) {
    console.error("Complete session error:", error);

    res.status(500).json({
      message:
        "Server error while completing the session.",
    });
  }
};

// PATCH /api/trainer/sessions/:id/cancel
const cancelSession = async (req, res) => {
  try {
    const session = await TrainingSession.findOne({
      _id: req.params.id,
      trainer: req.user.userId,
      status: "scheduled",
    });

    if (!session) {
      return res.status(404).json({
        message: "Scheduled session not found.",
      });
    }

    session.status = "cancelled";
    await session.save();

    const populated = await TrainingSession.findById(
      session._id
    ).populate("member", "name email phone");

    res.json({
      message: "Session cancelled.",
      session: populated,
    });
  } catch (error) {
    console.error("Cancel session error:", error);

    res.status(500).json({
      message: "Server error while cancelling the session.",
    });
  }
};

module.exports = {
  getSessions,
  createSession,
  completeSession,
  cancelSession,
};