const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Announcement title is required."],
      trim: true,
      maxlength: [120, "Announcement title cannot exceed 120 characters."],
    },

    body: {
      type: String,
      required: [true, "Announcement body is required."],
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Announcement author is required."],
    },

    publishedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);
