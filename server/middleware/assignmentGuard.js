const mongoose = require("mongoose");
const TrainerAssignment = require("../models/TrainerAssignment");

// Ensures the :memberId param is actively assigned
// to the logged-in trainer before the action runs
const ensureAssignedMember = async (req, res, next) => {
  try {
    const { memberId } = req.params;

    if (!memberId || !mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({
        message: "Invalid member ID.",
      });
    }

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

    // Make the assignment available to the controller
    req.assignment = assignment;

    next();
  } catch (error) {
    console.error("Assignment guard error:", error.message);

    res.status(500).json({
      message: "Server error while checking the assignment.",
    });
  }
};

module.exports = ensureAssignedMember;