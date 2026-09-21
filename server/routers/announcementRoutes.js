const express = require("express");

const {
  getAnnouncements,
  createAnnouncement,
} = require("../controllers/announcementController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  protect,
  authorize("owner", "receptionist", "member"),
  getAnnouncements
);

router.post(
  "/",
  protect,
  authorize("owner", "receptionist"),
  createAnnouncement
);

module.exports = router;
