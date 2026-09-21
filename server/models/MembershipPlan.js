const mongoose = require("mongoose");

const membershipPlanSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Membership plan name is required."],
      trim: true,
      minlength: [2, "Membership plan name must be at least 2 characters."],
    },

    price: {
      type: Number,
      required: [true, "Membership plan price is required."],
      min: [0, "Membership plan price cannot be negative."],
    },

    duration: {
      type: Number,
      required: [true, "Membership plan duration is required."],
      min: [1, "Membership plan duration must be at least 1 day."],
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

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
  "MembershipPlan",
  membershipPlanSchema
);