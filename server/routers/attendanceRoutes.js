const express = require("express");

const {
  getAttendance,
  checkInMember,
} = require("../controllers/attendanceController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  protect,
  authorize("owner", "receptionist"),
  getAttendance
);

router.post(
  "/",
  protect,
  authorize("owner", "receptionist"),
  checkInMember
);

module.exports = router;