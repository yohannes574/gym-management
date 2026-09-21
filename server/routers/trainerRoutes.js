const express = require("express");

const {
  getMyMembers,
  getMemberProfile,
} = require("../controllers/trainerController");

const {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  assignPlan,
  getPlanAssignments,
} = require("../controllers/trainerPlanController");

const {
  getSessions,
  createSession,
  completeSession,
  cancelSession,
} = require("../controllers/trainerSessionController");

const {
  addProgress,
  getProgress,
  addNote,
  getNotes,
} = require("../controllers/trainerProgressController");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");
const ensureAssignedMember = require("../middleware/assignmentGuard");

const router = express.Router();

// All trainer routes require the trainer role

// Assigned members
router.get(
  "/members",
  protect,
  authorize("trainer"),
  getMyMembers
);

router.get(
  "/members/:memberId",
  protect,
  authorize("trainer"),
  ensureAssignedMember,
  getMemberProfile
);

// Progress
router.get(
  "/members/:memberId/progress",
  protect,
  authorize("trainer"),
  ensureAssignedMember,
  getProgress
);

router.post(
  "/members/:memberId/progress",
  protect,
  authorize("trainer"),
  ensureAssignedMember,
  addProgress
);

// Training notes
router.get(
  "/members/:memberId/notes",
  protect,
  authorize("trainer"),
  ensureAssignedMember,
  getNotes
);

router.post(
  "/members/:memberId/notes",
  protect,
  authorize("trainer"),
  ensureAssignedMember,
  addNote
);

// Workout plans
router.get(
  "/plans",
  protect,
  authorize("trainer"),
  getPlans
);

router.post(
  "/plans",
  protect,
  authorize("trainer"),
  createPlan
);

router.put(
  "/plans/:id",
  protect,
  authorize("trainer"),
  updatePlan
);

router.delete(
  "/plans/:id",
  protect,
  authorize("trainer"),
  deletePlan
);

router.post(
  "/plans/:id/assign",
  protect,
  authorize("trainer"),
  assignPlan
);

router.get(
  "/plan-assignments",
  protect,
  authorize("trainer"),
  getPlanAssignments
);

// Training sessions
router.get(
  "/sessions",
  protect,
  authorize("trainer"),
  getSessions
);

router.post(
  "/sessions",
  protect,
  authorize("trainer"),
  createSession
);

router.patch(
  "/sessions/:id/complete",
  protect,
  authorize("trainer"),
  completeSession
);

router.patch(
  "/sessions/:id/cancel",
  protect,
  authorize("trainer"),
  cancelSession
);

module.exports = router;