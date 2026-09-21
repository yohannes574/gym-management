const dotenv = require("dotenv");
dotenv.config();

const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

const authRoutes = require("./routers/authRoutes");
const dashboardRoutes = require("./routers/dashboardRoutes");
const memberRoutes = require("./routers/memberRoutes");
const membershipPlanRoutes = require(
  "./routers/membershipPlanRoutes"
);
const membershipRoutes = require("./routers/membershipRoutes");
const paymentRoutes = require("./routers/paymentRoutes");
const attendanceRoutes = require("./routers/attendanceRoutes");
const staffRoutes = require("./routers/staffRoutes");
const portalRoutes = require("./routers/portalRoutes");
const trainerRoutes = require("./routers/trainerRoutes");
const announcementRoutes = require("./routers/announcementRoutes");
const reviewRoutes = require("./routers/reviewRoutes");
const notificationRoutes = require("./routers/notificationRoutes");

const {
  notFound,
  errorHandler,
} = require("./middleware/errorMiddleware");

const app = express();

connectDB();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Gym Management API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/members", memberRoutes);
app.use(
  "/api/membership-plans",
  membershipPlanRoutes
);
app.use("/api/memberships", membershipRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/portal", portalRoutes);
app.use("/api/trainer", trainerRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);

// Handle unknown routes
app.use(notFound);

// Handle application errors
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});