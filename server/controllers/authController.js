const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Member = require("../models/Member");

// Roles that must sign in through the secret staff portal
const STAFF_ROLES = ["owner", "receptionist"];

// Roles allowed to self-register from the public form
const PUBLIC_REGISTRATION_ROLES = ["member", "trainer"];

// Create a signed JWT for a user
const generateToken = (user) =>
  jwt.sign(
    {
      userId: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );

const registerUser = async (req, res) => {
  try {
    const { name, email, password, phone, gender, role } = req.body;

    // Check required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required.",
      });
    }

    // Public registration is only for members and trainers.
    // Staff accounts (owner / receptionist) are created by the owner.
    const requestedRole = role || "member";

    if (!PUBLIC_REGISTRATION_ROLES.includes(requestedRole)) {
      return res.status(400).json({
        message:
          "Invalid role. Public registration is only available for members and trainers.",
      });
    }

    // Members need a phone number for their gym profile
    if (requestedRole === "member" && !phone) {
      return res.status(400).json({
        message: "Phone number is required for member registration.",
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        message: "User with this email already exists.",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Trainers need owner approval before they can sign in
    const approvalStatus =
      requestedRole === "trainer" ? "pending" : "approved";

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: requestedRole,
      approvalStatus,
    });

    // Members get a linked gym profile for the member portal
    if (requestedRole === "member") {
      const existingMember = await Member.findOne({ email });

      if (existingMember && existingMember.user) {
        // That gym profile is already linked to another login
        await User.findByIdAndDelete(user._id);

        return res.status(400).json({
          message:
            "A member account with this email already exists.",
        });
      }

      if (existingMember) {
        // Claim the gym profile that staff created earlier
        existingMember.user = user._id;
        await existingMember.save();
      } else {
        await Member.create({
          user: user._id,
          name,
          email,
          phone,
          gender,
        });
      }
    }

    const responseUser = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      approvalStatus: user.approvalStatus,
    };

    if (user.approvalStatus === "pending") {
      return res.status(201).json({
        message:
          "Trainer account created. It is pending approval by the gym owner. You will be able to sign in once it is approved.",
        user: responseUser,
      });
    }

    res.status(201).json({
      message: "User registered successfully.",
      user: responseUser,
    });
  } catch (error) {
    console.error("Registration error:", error);

    res.status(500).json({
      message: "Server error during registration.",
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check required fields
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Compare password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Staff must sign in through the secret staff portal
    if (STAFF_ROLES.includes(user.role)) {
      return res.status(403).json({
        message:
          "Staff accounts must sign in through the staff portal.",
      });
    }

    // Trainers must be approved before signing in
    if (
      user.approvalStatus &&
      user.approvalStatus !== "approved"
    ) {
      return res.status(403).json({
        message:
          user.approvalStatus === "pending"
            ? "Your trainer account is pending approval by the gym owner. Please try again later."
            : "Your account registration was rejected. Please contact the gym.",
      });
    }

    // Create JWT
    const token = generateToken(user);

    res.json({
      message: "Login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Server error during login.",
    });
  }
};

const staffLogin = async (req, res) => {
  try {
    const { email, password, staffCode } = req.body;

    // Check required fields
    if (!email || !password || !staffCode) {
      return res.status(400).json({
        message:
          "Email, password, and staff access code are required.",
      });
    }

    // Validate the secret staff access code
    if (
      !process.env.STAFF_ACCESS_CODE ||
      staffCode !== process.env.STAFF_ACCESS_CODE
    ) {
      return res.status(401).json({
        message: "Invalid staff access code.",
      });
    }

    // Find user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Compare password
    const isPasswordCorrect = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordCorrect) {
      return res.status(401).json({
        message: "Invalid email or password.",
      });
    }

    // Only owner and receptionist accounts can use this portal
    if (!STAFF_ROLES.includes(user.role)) {
      return res.status(403).json({
        message: "This account does not have staff access.",
      });
    }

    // Create JWT
    const token = generateToken(user);

    res.json({
      message: "Staff login successful.",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Staff login error:", error);

    res.status(500).json({
      message: "Server error during staff login.",
    });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "-password"
    );

    if (!user) {
      return res.status(404).json({
        message: "User not found.",
      });
    }

    // Members also get their linked gym profile
    let member = null;

    if (user.role === "member") {
      member = await Member.findOne({ user: user._id });
    }

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
      },
      member,
    });
  } catch (error) {
    console.error("Get me error:", error);

    res.status(500).json({
      message: "Server error while getting account.",
    });
  }
};

// PUT /api/auth/me — update own profile (member self-service)
const updateMe = async (req, res) => {
  try {
    const { name, email, phone, gender } = req.body;

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "Account not found.",
      });
    }

    // If the email is being changed, make sure it's not taken
    if (email && email.toLowerCase() !== user.email) {
      const existing = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: user._id },
      });

      if (existing) {
        return res.status(400).json({
          message: "That email is already in use.",
        });
      }
    }

    if (name && name.trim()) {
      user.name = name.trim();
    }

    if (email && email.trim()) {
      user.email = email.toLowerCase().trim();
    }

    await user.save();

    // Keep the linked gym profile in sync for members
    if (user.role === "member") {
      const update = {};
      if (name && name.trim()) update.name = name.trim();
      if (email && email.trim()) update.email = email.toLowerCase().trim();
      if (phone !== undefined) update.phone = (phone || "").trim();
      if (gender !== undefined) update.gender = gender;

      await Member.findOneAndUpdate(
        { user: user._id },
        update,
        { runValidators: true }
      );
    }

    res.json({
      message: "Profile updated successfully.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Update me error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (err) => err.message
      );
      return res.status(400).json({ message: messages.join(", ") });
    }

    res.status(500).json({
      message: "Server error while updating profile.",
    });
  }
};

// PUT /api/auth/me/password — change own password
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "New password must be at least 6 characters.",
      });
    }

    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({
        message: "Account not found.",
      });
    }

    const matches = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!matches) {
      return res.status(401).json({
        message: "Current password is incorrect.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed successfully." });
  } catch (error) {
    console.error("Change password error:", error);

    res.status(500).json({
      message: "Server error while changing password.",
    });
  }
};

module.exports = {
  registerUser,
  loginUser,
  staffLogin,
  getMe,
  updateMe,
  changePassword,
};