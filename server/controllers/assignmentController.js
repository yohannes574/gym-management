const mongoose = require("mongoose");
const User = require("../models/User");
const Member = require("../models/Member");
const TrainerAssignment = require("../models/TrainerAssignment");

const populateFields = [
  { path: "trainer", select: "name email role" },
  { path: "member", select: "name email phone status" },
  { path: "assignedBy", select: "name role" },
];

// GET /api/staff/assignments?status=active|inactive
const getAssignments = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};

    if (status === "active" || status === "inactive") {
      filter.status = status;
    }

    const assignments = await TrainerAssignment.find(filter)
      .populate(populateFields)
      .sort({ createdAt: -1 });

    res.json(assignments);
  } catch (error) {
    console.error("Get assignments error:", error);

    res.status(500).json({
      message: "Server error while getting assignments.",
    });
  }
};

// POST /api/staff/assignments  { memberId, trainerId, notes }
const createAssignment = async (req, res) => {
  try {
    const { memberId, trainerId, notes } = req.body;

    if (!memberId || !trainerId) {
      return res.status(400).json({
        message: "Member and trainer are required.",
      });
    }

    if (
      !mongoose.isValidObjectId(memberId) ||
      !mongoose.isValidObjectId(trainerId)
    ) {
      return res.status(400).json({
        message: "Invalid member or trainer ID.",
      });
    }

    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({
        message: "Member not found.",
      });
    }

    const trainer = await User.findOne({
      _id: trainerId,
      role: "trainer",
    });

    if (!trainer) {
      return res.status(404).json({
        message: "Trainer not found.",
      });
    }

    if (
      trainer.approvalStatus &&
      trainer.approvalStatus !== "approved"
    ) {
      return res.status(400).json({
        message:
          "This trainer account has not been approved yet.",
      });
    }

    // Check for an existing active assignment
    const existing = await TrainerAssignment.findOne({
      member: memberId,
      status: "active",
    });

    if (existing) {
      if (existing.trainer.toString() === trainerId) {
        return res.status(400).json({
          message:
            "This member is already assigned to this trainer.",
        });
      }

      // Reassignment: deactivate the old assignment
      existing.status = "inactive";
      await existing.save();
    }

    const assignment = await TrainerAssignment.create({
      trainer: trainerId,
      member: memberId,
      assignedBy: req.user.userId,
      notes: (notes || "").trim(),
    });

    const populated = await TrainerAssignment.findById(
      assignment._id
    ).populate(populateFields);

    res.status(201).json({
      message: "Member assigned to trainer successfully.",
      assignment: populated,
    });
  } catch (error) {
    console.error("Create assignment error:", error);

    res.status(500).json({
      message: "Server error while creating the assignment.",
    });
  }
};

// PATCH /api/staff/assignments/:id/unassign
const unassignAssignment = async (req, res) => {
  try {
    const assignment = await TrainerAssignment.findOne({
      _id: req.params.id,
      status: "active",
    });

    if (!assignment) {
      return res.status(404).json({
        message: "Active assignment not found.",
      });
    }

    assignment.status = "inactive";
    await assignment.save();

    res.json({
      message: "Member unassigned successfully.",
    });
  } catch (error) {
    console.error("Unassign error:", error);

    res.status(500).json({
      message: "Server error while unassigning the member.",
    });
  }
};

module.exports = {
  getAssignments,
  createAssignment,
  unassignAssignment,
};