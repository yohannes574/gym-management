const mongoose = require("mongoose");
const AuditLog = require("../models/AuditLog");
const Attendance = require("../models/Attendance");
const Member = require("../models/Member");
const Membership = require("../models/Membership");
const Payment = require("../models/Payment");

const parseDateRange = (query) => {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 29);

  const from = query.from ? new Date(query.from) : defaultFrom;
  const through = query.to ? new Date(query.to) : now;

  if (
    Number.isNaN(from.getTime()) ||
    Number.isNaN(through.getTime()) ||
    from > through
  ) {
    return null;
  }

  const toExclusive = new Date(through);
  toExclusive.setDate(toExclusive.getDate() + 1);

  return { from, toExclusive };
};

const getAuditLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 25)
    );
    const filter = {};

    if (
      req.query.action &&
      !AuditLog.schema.path("action").enumValues.includes(req.query.action)
    ) {
      return res.status(400).json({ message: "Invalid audit action." });
    }
    if (req.query.action) filter.action = req.query.action;
    if (req.query.actor && !mongoose.isValidObjectId(req.query.actor)) {
      return res.status(400).json({ message: "Invalid audit actor." });
    }
    if (req.query.actor) {
      filter.actor = req.query.actor;
    }
    if (req.query.from || req.query.to) {
      const dateRange = parseDateRange(req.query);
      if (!dateRange) {
        return res.status(400).json({ message: "Invalid audit date range." });
      }
      filter.createdAt = {
        $gte: dateRange.from,
        $lt: dateRange.toExclusive,
      };
    }

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate("actor", "name email role")
        .populate("member", "name email")
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    res.json({ logs, page, limit, total });
  } catch (error) {
    console.error("Audit log query failed:", error);
    res.status(500).json({ message: "Could not load audit history." });
  }
};

const getOwnerReports = async (req, res) => {
  try {
    const dateRange = parseDateRange(req.query);
    if (!dateRange) {
      return res.status(400).json({ message: "Invalid report date range." });
    }

    const { from, toExclusive } = dateRange;
    const paymentMatch = {
      status: "paid",
      paymentDate: { $gte: from, $lt: toExclusive },
    };
    const attendanceMatch = {
      checkInTime: { $gte: from, $lt: toExclusive },
    };

    const [
      revenueByMethod,
      revenueByDay,
      attendanceByDay,
      paymentStatusCounts,
      activeMembers,
      activeMemberships,
      expiringMemberships,
      archivedMembers,
    ] = await Promise.all([
      Payment.aggregate([
        { $match: paymentMatch },
        {
          $group: {
            _id: "$paymentMethod",
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { amount: -1 } },
      ]),
      Payment.aggregate([
        { $match: paymentMatch },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$paymentDate" },
            },
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Attendance.aggregate([
        { $match: attendanceMatch },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$checkInTime" },
            },
            checkIns: { $sum: 1 },
            overrides: { $sum: { $cond: ["$isOverride", 1, 0] } },
            members: { $addToSet: "$member" },
          },
        },
        {
          $project: {
            checkIns: 1,
            overrides: 1,
            uniqueMembers: { $size: "$members" },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Payment.aggregate([
        { $match: { createdAt: { $gte: from, $lt: toExclusive } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Member.countDocuments({ archivedAt: null, status: "active" }),
      Membership.countDocuments({ status: "active", endDate: { $gte: new Date() } }),
      Membership.find({
        status: "active",
        endDate: {
          $gte: new Date(),
          $lt: new Date(Date.now() + 31 * 24 * 60 * 60 * 1000),
        },
      })
        .populate("member", "name email")
        .populate("plan", "name")
        .sort({ endDate: 1 })
        .limit(100),
      Member.countDocuments({
        archivedAt: { $gte: from, $lt: toExclusive },
      }),
    ]);

    const totalRevenue = revenueByMethod.reduce(
      (sum, item) => sum + item.amount,
      0
    );
    const paymentStatuses = Object.fromEntries(
      paymentStatusCounts.map(({ _id, count }) => [_id, count])
    );

    res.json({
      range: { from, to: new Date(toExclusive.getTime() - 1) },
      summary: {
        totalRevenue,
        paidPayments: paymentStatuses.paid || 0,
        pendingPayments: paymentStatuses.pending || 0,
        rejectedPayments: paymentStatuses.rejected || 0,
        activeMembers,
        activeMemberships,
        expiringMemberships: expiringMemberships.length,
        archivedMembers,
      },
      revenueByMethod,
      revenueByDay,
      attendanceByDay,
      expiringMemberships,
    });
  } catch (error) {
    console.error("Owner reports query failed:", error);
    res.status(500).json({ message: "Could not load owner reports." });
  }
};

module.exports = { getAuditLogs, getOwnerReports };