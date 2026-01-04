const Razorpay = require("razorpay");

let instance = null;

if (
  process.env.RAZORPAY_KEY &&
  process.env.RAZORPAY_SECRET
) {
  instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY,
    key_secret: process.env.RAZORPAY_SECRET,
  });
  console.log("✅ Razorpay initialized");
} else {
  console.log("⚠ Razorpay keys not found – running in MOCK mode");
}

module.exports = { instance };
