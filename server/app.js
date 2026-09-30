const express = require("express");
const cors = require("cors");

const authRoutes = require("./routers/authRoutes");
const dashboardRoutes = require("./routers/dashboardRoutes");
const memberRoutes = require("./routers/memberRoutes");
const membershipPlanRoutes = require("./routers/membershipPlanRoutes");
const membershipRoutes = require("./routers/membershipRoutes");
const paymentRoutes = require("./routers/paymentRoutes");
const attendanceRoutes = require("./routers/attendanceRoutes");
const staffRoutes = require("./routers/staffRoutes");
const portalRoutes = require("./routers/portalRoutes");
const trainerRoutes = require("./routers/trainerRoutes");
const announcementRoutes = require("./routers/announcementRoutes");
const reviewRoutes = require("./routers/reviewRoutes");
const notificationRoutes = require("./routers/notificationRoutes");
const ownerRoutes = require("./routers/ownerRoutes");

const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const app = express();
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || allowedOrigins.includes(origin));
    },
  })
);
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "Gym Management API is running" });
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/membership-plans", membershipPlanRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/portal", portalRoutes);
app.use("/api/trainer", trainerRoutes);
app.use("/api/announcements", announcementRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/owner", ownerRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;