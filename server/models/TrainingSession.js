const mongoose = require("mongoose");

const trainingSessionSchema = new mongoose.Schema(
  {
    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Trainer is required."],
    },

    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member is required."],
    },

    scheduledAt: {
      type: Date,
      required: [true, "Session date and time are required."],
    },

    activity: {
      type: String,
      required: [true, "Session activity is required."],
      trim: true,
    },

    location: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["scheduled", "completed", "cancelled"],
      default: "scheduled",
    },

    completedAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "TrainingSession",
  trainingSessionSchema
);