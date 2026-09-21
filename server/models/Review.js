const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member is required."],
    },
    rating: {
      type: Number,
      required: [true, "Rating is required."],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, "Review comment is required."],
      trim: true,
      maxlength: [1000, "Review cannot exceed 1000 characters."],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
