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
  },
  {
    timestamps: true,
  }
);

const Attendance = mongoose.model("Attendance", attendanceSchema);

module.exports = Attendance;