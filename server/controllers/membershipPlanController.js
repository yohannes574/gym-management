const MembershipPlan = require("../models/MembershipPlan");

// GET all membership plans
const getPlans = async (req, res) => {
  try {
    const plans = await MembershipPlan.find().sort({
      createdAt: -1,
    });

    res.json(plans);
  } catch (error) {
    console.error("Get membership plans error:", error);

    res.status(500).json({
      message: "Server error while getting membership plans.",
    });
  }
};

// CREATE membership plan
const createPlan = async (req, res) => {
  try {
    const { name, price, duration, description } = req.body;

    // Basic required-field validation
    if (!name || price === undefined || duration === undefined) {
      return res.status(400).json({
        message: "Name, price, and duration are required.",
      });
    }

    // Convert values to numbers
    const planPrice = Number(price);
    const planDuration = Number(duration);

    // Validate price
    if (Number.isNaN(planPrice)) {
      return res.status(400).json({
        message: "Price must be a valid number.",
      });
    }

    if (planPrice < 0) {
      return res.status(400).json({
        message: "Membership plan price cannot be negative.",
      });
    }

    // Validate duration
    if (Number.isNaN(planDuration)) {
      return res.status(400).json({
        message: "Duration must be a valid number.",
      });
    }

    if (planDuration < 1) {
      return res.status(400).json({
        message: "Membership plan duration must be at least 1 day.",
      });
    }

    // Create plan
    const plan = await MembershipPlan.create({
      name,
      price: planPrice,
      duration: planDuration,
      description,
    });

    res.status(201).json(plan);
  } catch (error) {
    console.error("Create membership plan error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err) => err.message
      );

      return res.status(400).json({
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      message: "Server error while creating membership plan.",
    });
  }
};

// DELETE membership plan
const deletePlan = async (req, res) => {
  try {
    const plan = await MembershipPlan.findByIdAndDelete(
      req.params.id
    );

    if (!plan) {
      return res.status(404).json({
        message: "Membership plan not found.",
      });
    }

    res.json({
      message: "Membership plan deleted successfully.",
    });
  } catch (error) {
    console.error("Delete membership plan error:", error);

    res.status(500).json({
      message: "Server error while deleting membership plan.",
    });
  }
};

module.exports = {
  getPlans,
  createPlan,
  deletePlan,
};