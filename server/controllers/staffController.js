const bcrypt = require("bcryptjs");
const User = require("../models/User");

const TRAINER_STATUSES = [
  "pending",
  "approved",
  "rejected",
];

// GET all trainers (optionally filtered by approval status)
const getTrainers = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = { role: "trainer" };

    if (status && TRAINER_STATUSES.includes(status)) {
      filter.approvalStatus = status;
    }

    const trainers = await User.find(filter)
      .select("name email approvalStatus createdAt")
      .sort({ createdAt: -1 });

    res.json(trainers);
  } catch (error) {
    console.error("Get trainers error:", error);

    res.status(500).json({
      message: "Server error while getting trainers.",
    });
  }
};

// Shared logic for approve / reject
const setTrainerStatus = (newStatus) => {
  return async (req, res) => {
    try {
      const trainer = await User.findOne({
        _id: req.params.id,
        role: "trainer",
      });

      if (!trainer) {
        return res.status(404).json({
          message: "Trainer not found.",
        });
      }

      trainer.approvalStatus = newStatus;

      await trainer.save();

      res.json({
        message:
          newStatus === "approved"
            ? "Trainer approved successfully. They can now sign in."
            : "Trainer registration rejected.",
        trainer: {
          id: trainer._id,
          name: trainer.name,
          email: trainer.email,
          approvalStatus: trainer.approvalStatus,
        },
      });
    } catch (error) {
      console.error("Update trainer status error:", error);

      res.status(500).json({
        message:
          "Server error while updating the trainer.",
      });
    }
  };
};

const approveTrainer = setTrainerStatus("approved");

const rejectTrainer = setTrainerStatus("rejected");

// GET all staff accounts (owners and receptionists)
const getStaffUsers = async (req, res) => {
  try {
    const staff = await User.find({
      role: { $in: ["owner", "receptionist"] },
    })
      .select("name email role createdAt")
      .sort({ createdAt: -1 });

    res.json(staff);
  } catch (error) {
    console.error("Get staff users error:", error);

    res.status(500).json({
      message:
        "Server error while getting staff accounts.",
    });
  }
};

// CREATE a staff account (receptionist)
const createStaff = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required.",
      });
    }

    // The owner creates receptionist accounts here.
    // Trainers register themselves and get approved.
    if (role !== "receptionist") {
      return res.status(400).json({
        message: "Role must be receptionist.",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User with this email already exists.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create staff user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "receptionist",
      approvalStatus: "approved",
    });

    res.status(201).json({
      message: "Staff account created successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Create staff error:", error);

    res.status(500).json({
      message:
        "Server error while creating staff account.",
    });
  }
};

module.exports = {
  getTrainers,
  approveTrainer,
  rejectTrainer,
  getStaffUsers,
  createStaff,
};