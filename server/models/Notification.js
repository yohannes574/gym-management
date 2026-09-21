const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Notification recipient is required."],
    },
    type: {
      type: String,
      enum: ["announcement", "payment", "membership", "training", "general"],
      default: "general",
    },
    title: {
      type: String,
      required: [true, "Notification title is required."],
      trim: true,
    },
    message: {
      type: String,
      required: [true, "Notification message is required."],
      trim: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
