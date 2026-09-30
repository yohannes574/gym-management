const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    actorRole: {
      type: String,
      enum: ["owner", "receptionist", "trainer", "member", "system"],
      required: true,
    },
    action: {
      type: String,
      enum: [
        "payment.created",
        "payment.initialized",
        "payment.approved",
        "payment.rejected",
        "payment.chapa_confirmed",
        "membership.created",
        "membership.cancelled",
        "membership.renewed",
        "member.archived",
        "member.restored",
        "member.created",
        "attendance.checked_in",
        "attendance.override",
      ],
      required: true,
    },
    subjectType: {
      type: String,
      enum: ["Payment", "Membership", "Member", "Attendance"],
      required: true,
    },
    subjectId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },
    summary: {
      type: String,
      required: true,
      maxlength: 300,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

auditLogSchema.index({ createdAt: -1, _id: -1 });
auditLogSchema.index({ actor: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);