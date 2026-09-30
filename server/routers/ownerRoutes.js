const express = require("express");
const { getAuditLogs, getOwnerReports } = require("../controllers/ownerController");
const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

router.use(protect, authorize("owner"));
router.get("/audit-logs", getAuditLogs);
router.get("/reports", getOwnerReports);

module.exports = router;