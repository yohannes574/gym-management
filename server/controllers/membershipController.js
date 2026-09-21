const Membership = require("../models/Membership");
const Member = require("../models/Member");
const MembershipPlan = require("../models/MembershipPlan");

// GET all memberships
const getMemberships = async (req, res) => {
  try {
    // Automatically expire old memberships
    await Membership.updateMany(
      {
        status: "active",
        endDate: {
          $lt: new Date(),
        },
      },
      {
        $set: {
          status: "expired",
        },
      }
    );

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
    const membership = await Membership.create({
      member: memberId,
      plan: planId,
      startDate: membershipStartDate,
      endDate: membershipEndDate,
      status: "active",
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
    const membership = await Membership.findByIdAndUpdate(
      req.params.id,
      {
        status: "cancelled",
      },
      {
        new: true,
      }
    );

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
    const membership = await Membership.findById(req.params.id)
      .populate("plan");

    if (!membership) {
      return res.status(404).json({
        message: "Membership not found.",
      });
    }

    // Members can only renew their own membership
    if (req.user.role === "member") {
      const self = await Member.findOne({
        user: req.user.userId,
      });

      if (
        !self ||
        membership.member.toString() !== self._id.toString()
      ) {
        return res.status(403).json({
          message:
            "You can only renew your own membership.",
        });
      }
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
  getMemberships,
  createMembership,
  cancelMembership,
  renewMembership,
};

