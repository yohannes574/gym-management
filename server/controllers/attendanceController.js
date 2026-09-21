const Attendance = require("../models/Attendance");
const Member = require("../models/Member");

// GET all attendance records
const getAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.find()
      .populate("member", "name email phone")
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
    const { memberId } = req.body;

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
    const attendance = await Attendance.create({
      member: memberId,
    });

    // Populate member information
    const populatedAttendance = await Attendance.findById(
      attendance._id
    ).populate("member", "name email phone");

    res.status(201).json(populatedAttendance);
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