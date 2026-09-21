const mongoose = require("mongoose");

const trainerAssignmentSchema = new mongoose.Schema(
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

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Assigned by is required."],
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
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
  "TrainerAssignment",
  trainerAssignmentSchema
);