const mongoose = require("mongoose");
const Member = require("../models/Member");
const Membership = require("../models/Membership");
const TrainerAssignment = require("../models/TrainerAssignment");
const TrainingSession = require("../models/TrainingSession");
const {
  recordAuditEvent,
  withAuditTransaction,
} = require("../services/auditLogService");

// GET all members
const getMembers = async (req, res) => {
try {
const filter = req.query.includeArchived === "true"
  ? {}
  : { archivedAt: null };
const members = await Member.find(filter).sort({
createdAt: -1,
});


res.json(members);


} catch (error) {
console.error("Get members error:", error);


res.status(500).json({
  message: "Server error while getting members.",
});


}
};

// CREATE member
const createMember = async (req, res) => {
try {
const { name, email, phone, gender } = req.body;


if (!name || !email || !phone) {
  return res.status(400).json({
    message: "Name, email, and phone are required.",
  });
}

const existingMember = await Member.findOne({ email });

if (existingMember) {
  return res.status(400).json({
    message: "A member with this email already exists.",
  });
}

const member = await withAuditTransaction(async (session) => {
  const [createdMember] = await Member.create(
    [{ name, email, phone, gender }],
    { session }
  );

  await recordAuditEvent({
    actor: req.user.userId,
    actorRole: req.user.role,
    action: "member.created",
    subjectType: "Member",
    subjectId: createdMember._id,
    member: createdMember._id,
    summary: `${createdMember.name} added by staff.`,
  }, { session });

  return createdMember;
});

res.status(201).json(member);


} catch (error) {
console.error("Create member error:", error);


if (error.code === 11000) {
  return res.status(400).json({
    message: "A member with this email already exists.",
  });
}

if (error.name === "ValidationError") {
  const messages = Object.values(error.errors).map(
    (err) => err.message
  );

  return res.status(400).json({
    message: messages.join(", "),
  });
}

res.status(500).json({
  message: "Server error while creating member.",
});


}
};

// Archive member while preserving related history
const deleteMember = async (req, res) => {
  const session = await mongoose.startSession();
  let member;

  try {
    await session.withTransaction(async () => {
      member = await Member.findById(req.params.id).session(session);

      if (!member || member.archivedAt) return;

      member.status = "inactive";
      member.archivedAt = new Date();
      await member.save({ session });

      await Membership.updateMany(
        { member: member._id, status: "active" },
        { $set: { status: "cancelled" } },
        { session }
      );
      await TrainerAssignment.updateMany(
        { member: member._id, status: "active" },
        { $set: { status: "inactive" } },
        { session }
      );
      await TrainingSession.updateMany(
        { member: member._id, status: "scheduled" },
        { $set: { status: "cancelled" } },
        { session }
      );
      await recordAuditEvent({
        actor: req.user.userId,
        actorRole: req.user.role,
        action: "member.archived",
        subjectType: "Member",
        subjectId: member._id,
        member: member._id,
        summary: `${member.name} archived by staff.`,
      }, { session });
    });

    if (!member) {
      return res.status(404).json({ message: "Member not found." });
    }

    res.json({ message: "Member archived successfully.", member });
  } catch (error) {
    console.error("Archive member error:", error);
    res.status(500).json({
      message: "Server error while archiving member.",
    });
  } finally {
    await session.endSession();
  }
};

const updateMember = async (req, res) => {
try {
const { name, email, phone, status } = req.body;
const member = await withAuditTransaction(async (session) => {
  const currentMember = await Member.findById(req.params.id).session(session);
  if (!currentMember) return null;

  const wasArchived = Boolean(currentMember.archivedAt);
  if (name !== undefined) currentMember.name = name;
  if (email !== undefined) currentMember.email = email;
  if (phone !== undefined) currentMember.phone = phone;
  if (status !== undefined) currentMember.status = status;

  if (status === "active") currentMember.archivedAt = null;
  await currentMember.save({ session });

  if (wasArchived && currentMember.status === "active") {
    await recordAuditEvent({
      actor: req.user.userId,
      actorRole: req.user.role,
      action: "member.restored",
      subjectType: "Member",
      subjectId: currentMember._id,
      member: currentMember._id,
      summary: `${currentMember.name} restored by staff.`,
    }, { session });
  }

  return currentMember;
});

if (!member) {
  return res.status(404).json({
    message: "Member not found.",
  });
}

res.json(member);


} catch (error) {
console.error("Update member error:", error);


if (error.code === 11000) {
  return res.status(400).json({
    message: "A member with this email already exists.",
  });
}

if (error.name === "ValidationError") {
  const messages = Object.values(error.errors).map(
    (err) => err.message
  );

  return res.status(400).json({
    message: messages.join(", "),
  });
}

res.status(500).json({
  message: "Server error while updating member.",
});


}
};

const renewMembership = async (req, res) => {
try {
const membership = await Membership.findById(req.params.id)
.populate("plan");


if (!membership) {
  return res.status(404).json({
    message: "Membership not found.",
  });
}

// Start the renewed membership today
const newStartDate = new Date();

// Calculate new end date using plan duration
const newEndDate = new Date(newStartDate);

newEndDate.setDate(
  newEndDate.getDate() + membership.plan.duration
);

// Update membership
membership.startDate = newStartDate;
membership.endDate = newEndDate;
membership.status = "active";

await membership.save();

res.json({
  message: "Membership renewed successfully!",
  membership,
});


} catch (error) {
console.error("Renew membership error:", error);


res.status(500).json({
  message: "Server error while renewing membership.",
});


}
};

module.exports = {
getMembers,
createMember,
deleteMember,
updateMember,
renewMembership,
};
