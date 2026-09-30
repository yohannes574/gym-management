const jwt = require("jsonwebtoken");
const Member = require("../models/Member");

const protect = async (req, res, next) => {
  let decoded;

  try {
    const authHeader = req.headers.authorization;

    // Check for Authorization header
    if (!authHeader) {
      return res.status(401).json({
        message: "Not authorized. No token provided.",
      });
    }

    // Check Bearer format
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Not authorized. Invalid authorization format.",
      });
    }

    // Extract token
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Not authorized. Invalid token.",
      });
    }

    // Verify token
    decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );
  } catch (error) {
    console.error(
      "Authentication error:",
      error.message
    );

    return res.status(401).json({
      message: "Not authorized. Invalid or expired token.",
    });
  }

  if (decoded.role === "member") {
    try {
      const member = await Member.findOne({
        user: decoded.userId,
      }).select("status archivedAt");

      if (member && (member.status !== "active" || member.archivedAt)) {
        return res.status(403).json({
          message: "This member account is inactive. Please contact the gym.",
        });
      }
    } catch (error) {
      console.error("Member account status check failed:", error.message);
      return res.status(500).json({
        message: "Could not verify member account status.",
      });
    }
  }

  req.user = decoded;
  next();
};

module.exports = protect;