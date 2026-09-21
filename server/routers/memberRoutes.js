const express = require("express");

const {
  getMembers,
  createMember,
  deleteMember,
  updateMember,
  renewMembership,
} = require("../controllers/memberController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  protect,
  authorize("owner", "receptionist"),
  getMembers
);

router.post(
  "/",
  protect,
  authorize("owner", "receptionist"),
  createMember
);

router.put(
  "/:id",
  protect,
  authorize("owner", "receptionist"),
  updateMember
);

router.put(
  "/:id/renew",
  protect,
  authorize("owner", "receptionist"),
  renewMembership
);

router.delete(
  "/:id",
  protect,
  authorize("owner", "receptionist"),
  deleteMember
);

module.exports = router;