const express = require("express");
const { rateLimit } = require("express-rate-limit");

const {
  registerUser,
  loginUser,
  staffLogin,
  getMe,
  updateMe,
  changePassword,
} = require("../controllers/authController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Please try again later.",
  },
});

// Public
router.post("/register", registerUser);
router.post("/login", loginLimiter, loginUser);

// Secret staff portal login (requires staff access code)
router.post("/staff/login", loginLimiter, staffLogin);

// Current account info + self-service profile edits
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.put("/me/password", protect, changePassword);

module.exports = router;