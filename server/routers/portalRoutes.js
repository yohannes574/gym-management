const express = require("express");

const {
  getMemberPortal,
  getTrainerPortal,
} = require("../controllers/portalController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// Member's own dashboard data
router.get(
  "/member",
  protect,
  authorize("member"),
  getMemberPortal
);

// Trainer's own dashboard data
router.get(
  "/trainer",
  protect,
  authorize("trainer"),
  getTrainerPortal
);

module.exports = router;