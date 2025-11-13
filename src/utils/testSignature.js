const crypto = require("crypto");
require("dotenv").config({path:"../../.env"});

const orderId = "order_RerlwO3oNZ3VaK";   
const paymentId = "pay_test_123456789";   // fake payment id
const secret = process.env.RAZORPAY_KEY_SECRET;

const signature = crypto
  .createHmac("sha256", secret)
  .update(`${orderId}|${paymentId}`)
  .digest("hex");

console.log("paymentId:", paymentId);
console.log("signature:", signature);
