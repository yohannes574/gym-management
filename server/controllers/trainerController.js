const Member = require("../models/Member");
const TrainerAssignment = require("../models/TrainerAssignment");
const PlanAssignment = require("../models/PlanAssignment");
const TrainingSession = require("../models/TrainingSession");
const ProgressRecord = require("../models/ProgressRecord");
const TrainingNote = require("../models/TrainingNote");

// Escape user input before building a RegExp
const escapeRegex = (text) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET /api/trainer/members?search=
const getMyMembers = async (req, res) => {
  try {
    const { search } = req.query;

    // Members actively assigned to this trainer
    const assignments = await TrainerAssignment.find({
      trainer: req.user.userId,
      status: "active",
    });

    const memberIds = assignments.map(
      (assignment) => assignment.member
    );

    const filter = { _id: { $in: memberIds } };

    // Server-side search on name / email / phone
    if (search && search.trim()) {
      const regex = new RegExp(
        escapeRegex(search.trim()),
        "i"
      );

      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
      ];
    }

    const members = await Member.find(filter)
      .select("name email phone gender status")
      .sort({ name: 1 });

    res.json(members);
  } catch (error) {
    console.error("Get trainer members error:", error);

    res.status(500).json({
      message:
        "Server error while getting your assigned members.",
    });
  }
};

// GET /api/trainer/members/:memberId (assignment guarded)
const getMemberProfile = async (req, res) => {
  try {
    const member = await Member.findById(
      req.params.memberId
    ).select("-__v");

    if (!member) {
      return res.status(404).json({
        message: "Member not found.",
      });
    }

    // Plans this trainer assigned to the member
    const planAssignments = await PlanAssignment.find({
      member: member._id,
      trainer: req.user.userId,
    })
      .populate("plan")
      .sort({ createdAt: -1 });

    // Sessions between this trainer and the member
    const sessions = await TrainingSession.find({
      member: member._id,
      trainer: req.user.userId,
    })
      .sort({ scheduledAt: -1 })
      .limit(100);

    // Full progress history for the member
    const progress = await ProgressRecord.find({
      member: member._id,
    })
      .populate("recordedBy", "name role")
      .sort({ date: -1 })
      .limit(100);

    // Training notes about the member
    const notes = await TrainingNote.find({
      member: member._id,
    })
      .populate("createdBy", "name role")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({
      member,
      assignment: req.assignment,
      planAssignments,
      sessions,
      progress,
      notes,
    });
  } catch (error) {
    console.error("Get member profile error:", error);

    res.status(500).json({
      message:
        "Server error while loading the member profile.",
    });
  }
};

module.exports = {
  getMyMembers,
  getMemberProfile,
};