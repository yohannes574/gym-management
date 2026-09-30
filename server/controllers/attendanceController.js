const Attendance = require("../models/Attendance");
const Member = require("../models/Member");
const Membership = require("../models/Membership");
const { isMembershipCurrent } = require("../utils/membershipRules");
const {
  recordAuditEvent,
  withAuditTransaction,
} = require("../services/auditLogService");

// GET all attendance records
const getAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate("member", "name email phone")
      .populate("overrideBy", "name")
      .sort({ checkInTime: -1 });

    res.json(attendance);
  } catch (error) {
    console.error("Get attendance error:", error);

    res.status(500).json({
      message: "Server error while getting attendance.",
    });
  }
};

// CHECK IN MEMBER
const checkInMember = async (req, res) => {
  try {
    const { memberId, overrideReason: rawOverrideReason } = req.body;
    const overrideReason =
      typeof rawOverrideReason === "string"
        ? rawOverrideReason.trim()
        : "";

    // Check if memberId was sent
    if (!memberId) {
      return res.status(400).json({
        message: "Member is required.",
      });
    }

    // Check if member ID is valid
    if (!require("mongoose").isValidObjectId(memberId)) {
      return res.status(400).json({
        message: "Invalid member ID.",
      });
    }

    // Check if member exists
    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({
        message: "Member not found.",
      });
    }

    if (member.status !== "active") {
      return res.status(403).json({
        message: "This member is inactive and cannot check in.",
      });
    }

    const now = new Date();
    const activeMembership = await Membership.findOne({
      member: memberId,
      status: "active",
      endDate: { $gte: now },
    });

    const hasCurrentMembership = isMembershipCurrent(activeMembership, now);
    const isOverride = Boolean(overrideReason);

    if (!hasCurrentMembership && !isOverride) {
      return res.status(403).json({
        message:
          "This member does not have a current membership. Provide a reason for a staff override.",
      });
    }

    if (isOverride && overrideReason.length < 8) {
      return res.status(400).json({
        message: "An override reason must be at least 8 characters.",
      });
    }

    if (overrideReason.length > 500) {
      return res.status(400).json({
        message: "An override reason cannot exceed 500 characters.",
      });
    }

    // Start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start of tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Check if member already checked in today
    const existingAttendance = await Attendance.findOne({
      member: memberId,
      checkInTime: {
        $gte: today,
        $lt: tomorrow,
      },
    });

    // If attendance already exists
    if (existingAttendance) {
      return res.status(400).json({
        message: "This member has already checked in today.",
      });
    }

    // Create attendance record
    const attendance = await withAuditTransaction(async (session) => {
      const [createdAttendance] = await Attendance.create(
        [{
          member: memberId,
          isOverride,
          overrideReason: isOverride ? overrideReason : null,
          overrideBy: isOverride ? req.user.userId : null,
        }],
        { session }
      );

      await recordAuditEvent({
        actor: req.user.userId,
        actorRole: req.user.role,
        action: isOverride
          ? "attendance.override"
          : "attendance.checked_in",
        subjectType: "Attendance",
        subjectId: createdAttendance._id,
        member: memberId,
        summary: isOverride
          ? `${member.name} checked in by staff override.`
          : `${member.name} checked in.`,
        metadata: isOverride ? { reason: overrideReason } : {},
      }, { session });

      return createdAttendance;
    });

    // Populate member information
    const populatedAttendance = await Attendance.findById(
      attendance._id
    )
      .populate("member", "name email phone")
      .populate("overrideBy", "name");

    res.status(201).json({
      ...populatedAttendance.toObject(),
      message: isOverride
        ? "Check-in recorded with staff override."
        : "Member checked in successfully.",
    });
  } catch (error) {
    console.error("Check-in error:", error);

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err) => err.message
      );

      return res.status(400).json({
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      message: "Server error while checking in member.",
    });
  }
};

module.exports = {
  getAttendance,
  checkInMember,
};