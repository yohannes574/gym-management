const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: [true, "Member is required."],
    },

    // Memberships created by staff always have a membership.
    // Self-service payments reference the selected plan.
    membership: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Membership",
      default: null,
    },

    // Plan the member chose when paying for themselves.
    plan: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MembershipPlan",
      default: null,
    },

    amount: {
      type: Number,
      required: [true, "Payment amount is required."],
      min: [0, "Payment amount cannot be negative."],
    },

    paymentMethod: {
      type: String,
      enum: {
        values: ["cash", "bank", "telebirr", "chapa", "other"],
        message: "Invalid payment method.",
      },
      default: "cash",
    },

    transactionReference: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
    },

    // Cloudinary secure URL for the payment proof image.
    proofImage: {
      type: String,
      trim: true,
      default: null,
    },

    // Cloudinary public ID used to delete the proof image.
    proofImagePublicId: {
      type: String,
      trim: true,
      default: null,
    },

    // Admin/staff decision on manually submitted payments.
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },

    paymentDate: {
      type: Date,
      default: Date.now,
    },

    status: {
      type: String,
      enum: {
        values: ["paid", "pending"],
        message: "Invalid payment status.",
      },
      default: "paid",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Payment", paymentSchema);