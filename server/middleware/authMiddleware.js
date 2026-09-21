const jwt = require("jsonwebtoken");

const protect = (req, res, next) => {
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
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Attach authenticated user to request
    req.user = decoded;

    next();
  } catch (error) {
    console.error(
      "Authentication error:",
      error.message
    );

    return res.status(401).json({
      message: "Not authorized. Invalid or expired token.",
    });
  }
};

module.exports = protect;