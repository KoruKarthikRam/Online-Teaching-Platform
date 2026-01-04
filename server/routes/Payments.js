const express = require("express");
const router = express.Router();

// Controllers
const {
  capturePayment,
  verifyPayment,
  sendPaymentSuccessEmail,
} = require("../controllers/Payments"); // fixed path

// Middleware
const { auth } = require("../middlewares/auth");

// ------------------- Payment Routes -------------------
router.post("/capturePayment", auth, capturePayment);
router.post("/verifyPayment", auth, verifyPayment);
router.post("/sendPaymentSuccessEmail", auth, sendPaymentSuccessEmail);

module.exports = router;
