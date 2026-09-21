const express = require("express");

const {
  getPlans,
  createPlan,
  deletePlan,
} = require("../controllers/membershipPlanController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// Members can read the plan list (for renewal / new sign-up).
// Only staff can create or delete plans.
router.get(
  "/",
  protect,
  authorize("owner", "receptionist", "member"),
  getPlans
);

router.post(
  "/",
  protect,
  authorize("owner", "receptionist"),
  createPlan
);

router.delete(
  "/:id",
  protect,
  authorize("owner", "receptionist"),
  deletePlan
);

module.exports = router;