const mongoose = require("mongoose");

const notificationOutboxSchema = new mongoose.Schema(
  {
    eventKey: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["announcement", "payment", "membership", "training", "general"],
      default: "general",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    nextAttemptAt: {
      type: Date,
      default: Date.now,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    lockToken: {
      type: String,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

notificationOutboxSchema.index({
  deliveredAt: 1,
  nextAttemptAt: 1,
  lockedUntil: 1,
  createdAt: 1,
});

module.exports = mongoose.model("NotificationOutbox", notificationOutboxSchema);