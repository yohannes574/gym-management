const Notification = require("../models/Notification");

const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipient: req.user.userId,
    }).sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    console.error("Get notifications error:", error);
    res.status(500).json({ message: "Server error while getting notifications." });
  }
};

const markNotificationRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user.userId },
      { readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    res.json(notification);
  } catch (error) {
    console.error("Mark notification read error:", error);
    res.status(500).json({ message: "Server error while updating notification." });
  }
};

const markAllNotificationsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.userId, readAt: null },
      { readAt: new Date() }
    );

    res.json({ message: "Notifications marked as read." });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    res.status(500).json({ message: "Server error while updating notifications." });
  }
};

module.exports = {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
