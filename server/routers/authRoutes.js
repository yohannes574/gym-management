const express = require("express");

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

// Public
router.post("/register", registerUser);
router.post("/login", loginUser);

// Secret staff portal login (requires staff access code)
router.post("/staff/login", staffLogin);

// Current account info + self-service profile edits
router.get("/me", protect, getMe);
router.put("/me", protect, updateMe);
router.put("/me/password", protect, changePassword);

module.exports = router;