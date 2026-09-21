const express = require("express");

const {
  getTrainers,
  approveTrainer,
  rejectTrainer,
  getStaffUsers,
  createStaff,
} = require("../controllers/staffController");

const {
  getAssignments,
  createAssignment,
  unassignAssignment,
} = require("../controllers/assignmentController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// Receptionists also need the trainer list
// to assign members to trainers
router.get(
  "/trainers",
  protect,
  authorize("owner", "receptionist"),
  getTrainers
);

router.patch(
  "/trainers/:id/approve",
  protect,
  authorize("owner"),
  approveTrainer
);

router.patch(
  "/trainers/:id/reject",
  protect,
  authorize("owner"),
  rejectTrainer
);

router.get(
  "/users",
  protect,
  authorize("owner"),
  getStaffUsers
);

router.post(
  "/users",
  protect,
  authorize("owner"),
  createStaff
);

// Member ↔ trainer assignments (owner + receptionist)
router.get(
  "/assignments",
  protect,
  authorize("owner", "receptionist"),
  getAssignments
);

router.post(
  "/assignments",
  protect,
  authorize("owner", "receptionist"),
  createAssignment
);

router.patch(
  "/assignments/:id/unassign",
  protect,
  authorize("owner", "receptionist"),
  unassignAssignment
);

module.exports = router;