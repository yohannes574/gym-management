const express = require("express");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const Member = require("../models/Member");

const Membership = require("../models/Membership");

const Payment = require("../models/Payment");

const Attendance = require("../models/Attendance");

const router = express.Router();

router.get(
"/",
protect,
authorize("owner", "receptionist"),
async (req, res) => {
try {
// --------------------------------
// UPDATE EXPIRED MEMBERSHIPS
// --------------------------------

  const now = new Date();

  await Membership.updateMany(
    {
      status: "active",
      endDate: {
        $lt: now,
      },
    },
    {
      status: "expired",
    }
  );

  // --------------------------------
  // BASIC STATISTICS
  // --------------------------------

  const totalMembers = await Member.countDocuments();

  const activeMemberships = await Membership.countDocuments({
    status: "active",
  });

  // --------------------------------
  // TODAY
  // --------------------------------

  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);

  tomorrow.setDate(tomorrow.getDate() + 1);

  const todayAttendance = await Attendance.countDocuments({
    checkInTime: {
      $gte: today,
      $lt: tomorrow,
    },
  });

  // --------------------------------
  // TOTAL REVENUE
  // --------------------------------

  const revenueResult = await Payment.aggregate([
    {
      $match: {
        status: "paid",
      },
    },
    {
      $group: {
        _id: null,
        totalRevenue: {
          $sum: "$amount",
        },
      },
    },
  ]);

  const totalRevenue =
    revenueResult.length > 0
      ? revenueResult[0].totalRevenue
      : 0;

  // --------------------------------
  // RECENT PAYMENTS
  // --------------------------------

  const recentPayments = await Payment.find({
    status: "paid",
  })
    .populate("member", "name email")
    .sort({ paymentDate: -1 })
    .limit(5);

  // --------------------------------
  // RECENT ATTENDANCE
  // --------------------------------

  const recentAttendance = await Attendance.find()
    .populate("member", "name email")
    .sort({ checkInTime: -1 })
    .limit(5);

  // --------------------------------
  // REVENUE BY PAYMENT METHOD
  // --------------------------------

  const revenueByMethod = await Payment.aggregate([
    {
      $match: {
        status: "paid",
      },
    },
    {
      $group: {
        _id: "$paymentMethod",
        total: {
          $sum: "$amount",
        },
      },
    },
    {
      $sort: {
        total: -1,
      },
    },
  ]);

  // --------------------------------
  // ATTENDANCE LAST 7 DAYS
  // --------------------------------

  const sevenDaysAgo = new Date();

  sevenDaysAgo.setHours(0, 0, 0, 0);

  sevenDaysAgo.setDate(
    sevenDaysAgo.getDate() - 6
  );

  const attendanceLast7Days =
    await Attendance.aggregate([
      {
        $match: {
          checkInTime: {
            $gte: sevenDaysAgo,
            $lt: tomorrow,
          },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$checkInTime",
            },
          },
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

  // --------------------------------
  // MEMBERSHIP EXPIRATION ALERTS
  // --------------------------------

  // Start of today
  const todayStart = new Date();

  todayStart.setHours(0, 0, 0, 0);

  // 7 days from today
  const sevenDaysFromNow = new Date(todayStart);

  sevenDaysFromNow.setDate(
    sevenDaysFromNow.getDate() + 7
  );

  // Expired memberships
  const expiredMemberships =
    await Membership.find({
      endDate: {
        $lt: todayStart,
      },
      status: "active",
    })
      .populate("member", "name email")
      .populate("plan", "name")
      .sort({ endDate: 1 });

  // Memberships expiring within 7 days
  const expiringSoonMemberships =
    await Membership.find({
      endDate: {
        $gte: todayStart,
        $lte: sevenDaysFromNow,
      },
      status: "active",
    })
      .populate("member", "name email")
      .populate("plan", "name")
      .sort({ endDate: 1 });

  // --------------------------------
  // RESPONSE
  // --------------------------------

  res.json({
    message: "Welcome to the Gym Dashboard!",

    user: req.user,

    stats: {
      totalMembers,
      activeMemberships,
      todayAttendance,
      totalRevenue,
    },

    recentPayments,

    recentAttendance,

    revenueByMethod,

    attendanceLast7Days,

    expiredMemberships,

    expiringSoonMemberships,
  });
} catch (error) {
  console.error("Dashboard error:", error);

  res.status(500).json({
    message: "Server error while loading dashboard.",
  });
}


}
);

module.exports = router;
