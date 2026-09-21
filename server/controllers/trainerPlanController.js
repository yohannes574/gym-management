const mongoose = require("mongoose");
const WorkoutPlan = require("../models/WorkoutPlan");
const PlanAssignment = require("../models/PlanAssignment");
const TrainerAssignment = require("../models/TrainerAssignment");

// Convert raw exercise rows into clean schema data
const sanitizeExercises = (exercises) => {
  if (!Array.isArray(exercises)) {
    return undefined;
  }

  return exercises
    .filter(
      (exercise) =>
        exercise && exercise.name && exercise.name.trim()
    )
    .map((exercise) => ({
      name: exercise.name.trim(),
      sets:
        Number(exercise.sets) > 0
          ? Number(exercise.sets)
          : 3,
      reps: (exercise.reps || "").toString().trim(),
      duration: (exercise.duration || "").toString().trim(),
      notes: (exercise.notes || "").toString().trim(),
    }));
};

// GET /api/trainer/plans — the trainer's own plans
const getPlans = async (req, res) => {
  try {
    const plans = await WorkoutPlan.find({
      createdBy: req.user.userId,
    }).sort({ createdAt: -1 });

    res.json(plans);
  } catch (error) {
    console.error("Get plans error:", error);

    res.status(500).json({
      message: "Server error while getting workout plans.",
    });
  }
};

// POST /api/trainer/plans
const createPlan = async (req, res) => {
  try {
    const { name, description, goal, exercises } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Plan name is required.",
      });
    }

    const plan = await WorkoutPlan.create({
      name: name.trim(),
      description: (description || "").trim(),
      goal,
      createdBy: req.user.userId,
      ...(sanitizeExercises(exercises)
        ? { exercises: sanitizeExercises(exercises) }
        : {}),
    });

    res.status(201).json({
      message: "Workout plan created successfully.",
      plan,
    });
  } catch (error) {
    console.error("Create plan error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err) => err.message
      );

      return res.status(400).json({
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      message: "Server error while creating the plan.",
    });
  }
};

// PUT /api/trainer/plans/:id — own plans only
const updatePlan = async (req, res) => {
  try {
    const plan = await WorkoutPlan.findOne({
      _id: req.params.id,
      createdBy: req.user.userId,
    });

    if (!plan) {
      return res.status(404).json({
        message: "Workout plan not found.",
      });
    }

    const { name, description, goal, exercises } = req.body;

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          message: "Plan name cannot be empty.",
        });
      }

      plan.name = name.trim();
    }

    if (description !== undefined) {
      plan.description = (description || "").trim();
    }

    if (goal !== undefined) {
      plan.goal = goal;
    }

    const sanitized = sanitizeExercises(exercises);

    if (sanitized !== undefined) {
      plan.exercises = sanitized;
    }

    await plan.save();

    res.json({
      message: "Workout plan updated successfully.",
      plan,
    });
  } catch (error) {
    console.error("Update plan error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err) => err.message
      );

      return res.status(400).json({
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      message: "Server error while updating the plan.",
    });
  }
};

// DELETE /api/trainer/plans/:id — own plans only
const deletePlan = async (req, res) => {
  try {
    const plan = await WorkoutPlan.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user.userId,
    });

    if (!plan) {
      return res.status(404).json({
        message: "Workout plan not found.",
      });
    }

    // Remove member assignments of the deleted plan
    await PlanAssignment.deleteMany({ plan: plan._id });

    res.json({
      message: "Workout plan deleted successfully.",
    });
  } catch (error) {
    console.error("Delete plan error:", error);

    res.status(500).json({
      message: "Server error while deleting the plan.",
    });
  }
};

// POST /api/trainer/plans/:id/assign { memberId, notes, startDate }
const assignPlan = async (req, res) => {
  try {
    const { memberId, notes, startDate } = req.body;

    if (!memberId || !mongoose.isValidObjectId(memberId)) {
      return res.status(400).json({
        message: "A valid member is required.",
      });
    }

    const plan = await WorkoutPlan.findOne({
      _id: req.params.id,
      createdBy: req.user.userId,
    });

    if (!plan) {
      return res.status(404).json({
        message: "Workout plan not found.",
      });
    }

    // The member must be actively assigned to this trainer
    const assignment = await TrainerAssignment.findOne({
      trainer: req.user.userId,
      member: memberId,
      status: "active",
    });

    if (!assignment) {
      return res.status(403).json({
        message: "This member is not assigned to you.",
      });
    }

    let start = new Date();

    if (startDate) {
      start = new Date(startDate);

      if (isNaN(start.getTime())) {
        return res.status(400).json({
          message: "Invalid start date.",
        });
      }
    }

    const planAssignment = await PlanAssignment.create({
      plan: plan._id,
      member: memberId,
      trainer: req.user.userId,
      startDate: start,
      notes: (notes || "").trim(),
    });

    const populated = await PlanAssignment.findById(
      planAssignment._id
    )
      .populate("plan", "name goal")
      .populate("member", "name email");

    res.status(201).json({
      message: "Workout plan assigned successfully.",
      planAssignment: populated,
    });
  } catch (error) {
    console.error("Assign plan error:", error);

    res.status(500).json({
      message:
        "Server error while assigning the workout plan.",
    });
  }
};

// GET /api/trainer/plan-assignments?memberId=
const getPlanAssignments = async (req, res) => {
  try {
    const { memberId } = req.query;

    const filter = { trainer: req.user.userId };

    if (memberId && mongoose.isValidObjectId(memberId)) {
      filter.member = memberId;
    }

    const assignments = await PlanAssignment.find(filter)
      .populate("plan", "name goal")
      .populate("member", "name email")
      .sort({ createdAt: -1 });

    res.json(assignments);
  } catch (error) {
    console.error("Get plan assignments error:", error);

    res.status(500).json({
      message:
        "Server error while getting plan assignments.",
    });
  }
};

module.exports = {
  getPlans,
  createPlan,
  updatePlan,
  deletePlan,
  assignPlan,
  getPlanAssignments,
};