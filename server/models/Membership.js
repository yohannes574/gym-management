const mongoose = require("mongoose");

const membershipSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member is required."],
    },

    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MembershipPlan",
      required: [true, "Membership plan is required."],
    },

    startDate: {
      type: Date,
      required: [true, "Start date is required."],
      default: Date.now,
    },

    endDate: {
      type: Date,
      required: [true, "End date is required."],
    },

    status: {
      type: String,
      enum: ["active", "expired", "cancelled"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Membership", membershipSchema);

