const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member is required."],
    },

    checkInTime: {
      type: Date,
      default: Date.now,
    },

    isOverride: {
      type: Boolean,
      default: false,
    },

    overrideReason: {
      type: String,
      trim: true,
      maxlength: [500, "Override reason cannot exceed 500 characters."],
      default: null,
    },

    overrideBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;