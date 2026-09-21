const express = require("express");

const {
  getReviews,
  createReview,
  updateReviewStatus,
} = require("../controllers/reviewController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  protect,
  authorize("owner", "receptionist", "member"),
  getReviews
);

router.post(
  "/",
  protect,
  authorize("member"),
  createReview
);

router.patch(
  "/:id/status",
  protect,
  authorize("owner", "receptionist"),
  updateReviewStatus
);

module.exports = router;
