const express = require("express");

const {
  getPayments,
  getPaymentById,
  createPayment,
  initializeChapaPayment,
  chapaCallback,
  getPaymentProof,
  verifyPayment,
} = require("../controllers/paymentController");

const {
  uploadPaymentProof,
  handleUploadErrors,
} = require("../middleware/uploadMiddleware");

const protect = require("../middleware/authMiddleware");
const authorize = require("../middleware/roleMiddleware");

const router = express.Router();

// Staff see all payments; members see only their own (handled in controller).
router.get(
  "/",
  protect,
  authorize("owner", "receptionist", "member"),
  getPayments
);

router.post(
  "/chapa/initialize",
  protect,
  authorize("member"),
  initializeChapaPayment
);

router.get("/chapa/callback", chapaCallback);
router.post("/chapa/callback", chapaCallback);

// Members attach a transfer screenshot for bank / Telebirr payments.
router.post(
  "/",
  protect,
  authorize("owner", "receptionist", "member"),
  uploadPaymentProof.single("proofImage"),
  handleUploadErrors,
  createPayment
);

// Staff approve or reject pending member payments.
router.patch(
  "/:id/verify",
  protect,
  authorize("owner", "receptionist"),
  verifyPayment
);

// Transfer screenshot for a payment (auth required, scoped in controller).
router.get(
  "/:id/proof",
  protect,
  authorize("owner", "receptionist", "member"),
  getPaymentProof
);

router.get(
  "/:id",
  protect,
  authorize("owner", "receptionist", "member"),
  getPaymentById
);

module.exports = router;