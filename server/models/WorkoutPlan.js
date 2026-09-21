const mongoose = require("mongoose");

const workoutPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Plan name is required."],
      trim: true,
      minlength: [2, "Plan name must be at least 2 characters."],
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    goal: {
      type: String,
      enum: [
        "general",
        "weight-loss",
        "muscle-gain",
        "endurance",
        "strength",
        "other",
      ],
      default: "general",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by is required."],
    },

    exercises: [
      {
        name: {
          type: String,
          required: [true, "Exercise name is required."],
          trim: true,
        },
        sets: {
          type: Number,
          min: [1, "Sets must be at least 1."],
          default: 3,
        },
        reps: {
          type: String,
          trim: true,
          default: "",
        },
        duration: {
          type: String,
          trim: true,
          default: "",
        },
        notes: {
          type: String,
          trim: true,
          default: "",
        },
      },
    ],

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "WorkoutPlan",
  workoutPlanSchema
);