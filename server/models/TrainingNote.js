const mongoose = require("mongoose");

const trainingNoteSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member is required."],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Created by is required."],
    },

    content: {
      type: String,
      required: [true, "Note content is required."],
      trim: true,
      minlength: [2, "Note content must be at least 2 characters."],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "TrainingNote",
  trainingNoteSchema
);