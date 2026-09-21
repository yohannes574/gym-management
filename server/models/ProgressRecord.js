const mongoose = require("mongoose");

const progressRecordSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member is required."],
    },

    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Recorded by is required."],
    },

    date: {
      type: Date,
      default: Date.now,
    },

    weight: {
      type: Number,
      min: [0, "Weight cannot be negative."],
      default: null,
    },

    measurements: {
      chest: { type: Number, min: 0, default: null },
      waist: { type: Number, min: 0, default: null },
      hips: { type: Number, min: 0, default: null },
      arm: { type: Number, min: 0, default: null },
      thigh: { type: Number, min: 0, default: null },
      bodyFat: { type: Number, min: 0, max: 100, default: null },
    },

    fitnessResults: [
      {
        name: {
          type: String,
          required: [true, "Result name is required."],
          trim: true,
        },
        value: {
          type: String,
          required: [true, "Result value is required."],
          trim: true,
        },
        unit: {
          type: String,
          trim: true,
          default: "",
        },
      },
    ],

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
  "ProgressRecord",
  progressRecordSchema
);