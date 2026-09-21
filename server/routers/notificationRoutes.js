const express = require("express");

const {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect, authorize("member"));
router.get("/", getNotifications);
router.patch("/read-all", markAllNotificationsRead);
router.patch("/:id/read", markNotificationRead);

module.exports = router;
