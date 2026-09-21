const mongoose = require("mongoose");

const planAssignmentSchema = new mongoose.Schema(
  {
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkoutPlan",
      required: [true, "Workout plan is required."],
    },

    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member is required."],
    },

    trainer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Trainer is required."],
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: ["active", "completed"],
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
  "PlanAssignment",
  planAssignmentSchema
);