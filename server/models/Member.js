const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    // Login account linked to this gym profile
    // (null for profiles created manually by staff)
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    name: {
      type: String,
      required: [true, "Member name is required."],
      trim: true,
      minlength: [2, "Member name must be at least 2 characters."],
    },

    email: {
      type: String,
      required: [true, "Email is required."],
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required."],
      trim: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
      default: "other",
    },

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },

    archivedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Member", memberSchema);