const express = require("express");

const {
  getMemberships,
  createMembership,
  cancelMembership,
  renewMembership,
} = require("../controllers/membershipController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  protect,
  authorize("owner", "receptionist"),
  getMemberships
);

router.post(
  "/",
  protect,
  authorize("owner", "receptionist"),
  createMembership
);

router.put(
  "/:id/cancel",
  protect,
  authorize("owner", "receptionist"),
  cancelMembership
);

// Renewal is also open to the member who owns the membership.
router.put(
  "/:id/renew",
  protect,
  authorize("owner", "receptionist"),
  renewMembership
);

module.exports = router;