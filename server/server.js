const dotenv = require("dotenv");
dotenv.config();

const connectDB = require("./config/db");
const app = require("./app");
const Notification = require("./models/Notification");
const NotificationOutbox = require("./models/NotificationOutbox");
const AuditLog = require("./models/AuditLog");
const { startMembershipLifecycle } = require("./jobs/membershipLifecycle");
const { startNotificationOutbox } = require("./services/notificationOutboxService");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();
  await Promise.all([
    Notification.init(),
    NotificationOutbox.init(),
    AuditLog.init(),
  ]);
  startMembershipLifecycle();
  startNotificationOutbox();

  return app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
};

if (require.main === module) {
  startServer();
}

module.exports = startServer;