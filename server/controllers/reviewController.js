const Review = require("../models/Review");
const Member = require("../models/Member");

const getMember = async (req) =>
  Member.findOne({ user: req.user.userId });

const getReviews = async (req, res) => {
  try {
    const filter = req.user.role === "member"
      ? { member: (await getMember(req))?._id }
      : {};

    if (req.user.role === "member" && !filter.member) {
      return res.json([]);
    }

    const reviews = await Review.find(filter)
      .populate("member", "name email")
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    console.error("Get reviews error:", error);
    res.status(500).json({ message: "Server error while getting reviews." });
  }
};

const createReview = async (req, res) => {
  try {
    const member = await getMember(req);
    const { rating, comment } = req.body;
    const numericRating = Number(rating);

    if (!member) {
      return res.status(404).json({ message: "No member profile is linked to this account." });
    }

    if (!Number.isInteger(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ message: "Rating must be an integer from 1 to 5." });
    }

    if (!comment?.trim()) {
      return res.status(400).json({ message: "Review comment is required." });
    }

    const review = await Review.create({
      member: member._id,
      rating: numericRating,
      comment: comment.trim(),
    });

    res.status(201).json(await review.populate("member", "name email"));
  } catch (error) {
    console.error("Create review error:", error);
    res.status(500).json({ message: "Server error while creating review." });
  }
};

const updateReviewStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid review status." });
    }

    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true }
    ).populate("member", "name email");

    if (!review) {
      return res.status(404).json({ message: "Review not found." });
    }

    res.json(review);
  } catch (error) {
    console.error("Update review status error:", error);
    res.status(500).json({ message: "Server error while updating review." });
  }
};

module.exports = { getReviews, createReview, updateReviewStatus };
