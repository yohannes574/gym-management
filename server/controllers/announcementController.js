const Announcement = require("../models/Announcement");
const Member = require("../models/Member");
const Notification = require("../models/Notification");

const getAnnouncements = async (req, res) => {
  try {
    const announcements = await Announcement.find()
      .populate("createdBy", "name role")
      .sort({ publishedAt: -1 });

    res.json(announcements);
  } catch (error) {
    console.error("Get announcements error:", error);
    res.status(500).json({ message: "Server error while getting announcements." });
  }
};

const createAnnouncement = async (req, res) => {
  try {
    const { title, body } = req.body;

    if (!title?.trim() || !body?.trim()) {
      return res.status(400).json({
        message: "Announcement title and body are required.",
      });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      body: body.trim(),
      createdBy: req.user.userId,
    });

    const members = await Member.find({ user: { $ne: null } }).select("user");
    if (members.length > 0) {
      await Notification.insertMany(
        members.map((member) => ({
          recipient: member.user,
          type: "announcement",
          title: announcement.title,
          message: announcement.body,
        }))
      );
    }

    const populatedAnnouncement = await Announcement.findById(announcement._id)
      .populate("createdBy", "name role");

    res.status(201).json(populatedAnnouncement);
  } catch (error) {
    console.error("Create announcement error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: Object.values(error.errors)
          .map((validationError) => validationError.message)
          .join(", "),
      });
    }

    res.status(500).json({ message: "Server error while creating announcement." });
  }
};

module.exports = { getAnnouncements, createAnnouncement };
