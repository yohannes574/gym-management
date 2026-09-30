const Membership = require("../models/Membership");
const Member = require("../models/Member");
const MembershipPlan = require("../models/MembershipPlan");
const {
  recordAuditEvent,
  withAuditTransaction,
} = require("../services/auditLogService");

// GET all memberships
const getMemberships = async (req, res) => {
  try {
    // Get all memberships
    const memberships = await Membership.find()
      .populate("member", "name email phone")
      .populate("plan", "name price duration")
      .sort({ createdAt: -1 });

    res.json(memberships);
  } catch (error) {
    console.error("Get memberships error:", error);

    res.status(500).json({
      message: "Server error while getting memberships.",
    });
  }
};

// CREATE membership
const createMembership = async (req, res) => {
  try {
    const { memberId, planId, startDate } = req.body;

    if (!memberId || !planId) {
      return res.status(400).json({
        message: "Member and membership plan are required.",
      });
    }

    // Check member exists
    const member = await Member.findById(memberId);

    if (!member) {
      return res.status(404).json({
        message: "Member not found.",
      });
    }

    // Check plan exists
    const plan = await MembershipPlan.findById(planId);

    if (!plan) {
      return res.status(404).json({
        message: "Membership plan not found.",
      });
    }

    // Use provided start date or today
    const membershipStartDate = startDate
      ? new Date(startDate)
      : new Date();

    // Calculate end date
    const membershipEndDate = new Date(membershipStartDate);

    membershipEndDate.setDate(
      membershipEndDate.getDate() + plan.duration
    );

    // Create membership
    const membership = await withAuditTransaction(async (session) => {
      const [createdMembership] = await Membership.create(
        [{
          member: memberId,
          plan: planId,
          startDate: membershipStartDate,
          endDate: membershipEndDate,
          status: "active",
        }],
        { session }
      );

      await recordAuditEvent({
        actor: req.user.userId,
        actorRole: req.user.role,
        action: "membership.created",
        subjectType: "Membership",
        subjectId: createdMembership._id,
        member: member._id,
        summary: `${plan.name} membership assigned to ${member.name}.`,
        metadata: { planId: plan._id, startDate: membershipStartDate },
      }, { session });

      return createdMembership;
    });

    // Populate member information
    const populatedMembership = await membership.populate(
      "member",
      "name email phone"
    );

    // Populate plan information
    await populatedMembership.populate(
      "plan",
      "name price duration"
    );

    res.status(201).json(populatedMembership);
  } catch (error) {
    console.error("Create membership error:", error);

    res.status(500).json({
      message: "Server error while creating membership.",
    });
  }
};

const cancelMembership = async (req, res) => {
  try {
    const membership = await withAuditTransaction(async (session) => {
      const currentMembership = await Membership.findById(
        req.params.id
      ).session(session);

      if (!currentMembership) return null;

      currentMembership.status = "cancelled";
      await currentMembership.save({ session });

      await recordAuditEvent({
        actor: req.user.userId,
        actorRole: req.user.role,
        action: "membership.cancelled",
        subjectType: "Membership",
        subjectId: currentMembership._id,
        member: currentMembership.member,
        summary: "Membership cancelled by staff.",
      }, { session });

      return currentMembership;
    });

    if (!membership) {
      return res.status(404).json({
        message: "Membership not found.",
      });
    }

    res.json({
      message: "Membership cancelled successfully.",
      membership,
    });
  } catch (error) {
    console.error("Cancel membership error:", error);

    res.status(500).json({
      message: "Server error while cancelling membership.",
    });
  }
};

const renewMembership = async (req, res) => {
  try {
    if (req.user.role === "member") {
      const self = await Member.findOne({ user: req.user.userId });
      const target = await Membership.findById(req.params.id).select("member");

      if (!self || !target || target.member.toString() !== self._id.toString()) {
        return res.status(403).json({
          message: "You can only renew your own membership.",
        });
      }
    }

    const membership = await withAuditTransaction(async (session) => {
      const currentMembership = await Membership.findById(req.params.id)
        .populate("plan")
        .session(session);

      if (!currentMembership) return null;

      const newStartDate = new Date();
      const newEndDate = new Date(newStartDate);
      newEndDate.setDate(
        newEndDate.getDate() + currentMembership.plan.duration
      );

      currentMembership.startDate = newStartDate;
      currentMembership.endDate = newEndDate;
      currentMembership.status = "active";
      await currentMembership.save({ session });

      await recordAuditEvent({
        actor: req.user.userId,
        actorRole: req.user.role,
        action: "membership.renewed",
        subjectType: "Membership",
        subjectId: currentMembership._id,
        member: currentMembership.member,
        summary: `${currentMembership.plan.name} membership renewed by staff.`,
        metadata: { startDate: newStartDate, endDate: newEndDate },
      }, { session });

      return currentMembership;
    });

    if (!membership) {
      return res.status(404).json({
        message: "Membership not found.",
      });
    }

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
  getMemberships,
  createMembership,
  cancelMembership,
  renewMembership,
};

