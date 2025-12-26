require("dotenv").config();
const crypto = require("crypto");

const razorpayOrderId = "order_Rw8rc1U9DiAqvU";
const razorpayPaymentId = "pay_Rw8testPaymentId123";
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

if (!razorpayKeySecret) {
  console.error("Error: RAZORPAY_KEY_SECRET not found in .env file");
  process.exit(1);
}

const body = razorpayOrderId + "|" + razorpayPaymentId;
const signature = crypto
  .createHmac("sha256", razorpayKeySecret)
  .update(body.toString())
  .digest("hex");

console.log("\nPayment Verification Details:");
console.log("==============================");
console.log("razorpayOrderId:", razorpayOrderId);
console.log("razorpayPaymentId:", razorpayPaymentId);
console.log("razorpaySignature:", signature);
console.log("bookingId:", "694e2bb3f66525f4935a672e");
// f23ef7f76d8f2ee9a9aacf1531a8afb9a07d3c631f3fe17b881561049c93a223