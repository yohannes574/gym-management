const Member = require("../models/Member");
const Membership = require("../models/Membership");
const Payment = require("../models/Payment");
const Attendance = require("../models/Attendance");
const TrainerAssignment = require("../models/TrainerAssignment");
const TrainingSession = require("../models/TrainingSession");
const PlanAssignment = require("../models/PlanAssignment");
const ProgressRecord = require("../models/ProgressRecord");

// GET /api/portal/member — data for the logged-in member
const getMemberPortal = async (req, res) => {
  try {
    const member = await Member.findOne({
      user: req.user.userId,
    });

    if (!member) {
      return res.status(404).json({
        message:
          "No gym profile is linked to this account yet. Please contact the gym reception.",
      });
    }

    // Expire this member's finished memberships
    await Membership.updateMany(
      {
        member: member._id,
        status: "active",
        endDate: { $lt: new Date() },
      },
      { status: "expired" }
    );

    const memberships = await Membership.find({
      member: member._id,
    })
      .populate("plan", "name price duration")
      .sort({ startDate: -1 });

    const payments = await Payment.find({
      member: member._id,
    })
      .populate("plan", "name price duration")
      .populate({
        path: "membership",
        populate: {
          path: "plan",
          select: "name price",
        },
      })
      .sort({ paymentDate: -1 });

    const attendance = await Attendance.find({
      member: member._id,
    })
      .sort({ checkInTime: -1 })
      .limit(30);

    // Workout plans assigned to this member by their trainer(s)
    const planAssignments = await PlanAssignment.find({
      member: member._id,
    })
      .populate("plan")
      .populate("trainer", "name email")
      .sort({ createdAt: -1 });

    // Training sessions for this member
    const allSessions = await TrainingSession.find({
      member: member._id,
    })
      .sort({ scheduledAt: -1 })
      .limit(200);

    const upcomingSessions = allSessions
      .filter((s) => s.status === "scheduled")
      .sort(
        (a, b) =>
          new Date(a.scheduledAt) - new Date(b.scheduledAt)
      )
      .slice(0, 20);

    const pastSessions = allSessions
      .filter((s) => s.status !== "scheduled")
      .slice(0, 50);

    // Progress records (read-only for the member)
    const progress = await ProgressRecord.find({
      member: member._id,
    })
      .populate("recordedBy", "name role")
      .sort({ date: -1 })
      .limit(200);

    res.json({
      member,
      memberships,
      payments,
      attendance,
      planAssignments,
      upcomingSessions,
      pastSessions,
      progress,
    });
  } catch (error) {
    console.error("Member portal error:", error);

    res.status(500).json({
      message:
        "Server error while loading the member dashboard.",
    });
  }
};

// GET /api/portal/trainer — data for the logged-in trainer
const getTrainerPortal = async (req, res) => {
  try {
    // Start of today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start of tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayAttendance = await Attendance.find({
      checkInTime: { $gte: today, $lt: tomorrow },
    })
      .populate("member", "name email phone")
      .sort({ checkInTime: -1 });

    // Members actively assigned to this trainer
    const assignments = await TrainerAssignment.find({
      trainer: req.user.userId,
      status: "active",
    }).populate("member", "name email phone status");

    const assignedMembers = assignments
      .map((assignment) => assignment.member)
      .filter(Boolean)
      .sort((a, b) =>
        a.name && b.name
          ? a.name.localeCompare(b.name)
          : 0
      );

    // Next scheduled sessions for this trainer
    const upcomingSessions = await TrainingSession.find({
      trainer: req.user.userId,
      status: "scheduled",
    })
      .populate("member", "name email")
      .sort({ scheduledAt: 1 })
      .limit(5);

    // Sessions scheduled for today
    const todaySessions =
      await TrainingSession.countDocuments({
        trainer: req.user.userId,
        status: "scheduled",
        scheduledAt: { $gte: today, $lt: tomorrow },
      });

    res.json({
      stats: {
        todayCheckIns: todayAttendance.length,
        assignedMembers: assignedMembers.length,
        todaySessions,
        upcomingSessions: upcomingSessions.length,
      },
      todayAttendance,
      assignedMembers,
      upcomingSessions,
    });
  } catch (error) {
    console.error("Trainer portal error:", error);

    res.status(500).json({
      message:
        "Server error while loading the trainer dashboard.",
    });
  }
};

module.exports = {
  getMemberPortal,
  getTrainerPortal,
};