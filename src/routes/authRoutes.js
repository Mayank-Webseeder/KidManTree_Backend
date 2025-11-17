const express = require("express");
const authController = require("../controllers/authController");
const { authenticate, authorize } = require("../middlewares/auth");

const router = express.Router();

// Public routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.post("/verify-contact-otp", authController.verifyContactOTP);
router.post("/verify-email-otp", authController.verifyEmailOTP);
router.post("/resend-otp", authController.resendOTP);

// Forgot Password routes
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password", authController.resetPassword);

router.post("/parent/init", authController.initiateParentConsent);
router.post("/parent/verify-email-otp", authController.verifyParentEmailOTP);
router.post(
  "/parent/verify-contact-otp",
  authController.verifyParentContactOTP
);
router.post("/parent/resend-otp", authController.resendParentOTP);

// Admin routes
router.post(
  "/admin/invite",
  authenticate,
  authorize("admin", "superadmin"),
  authController.inviteAdmin
);
router.get("/admin/verify-invite", authController.verifyAdminInvite);
router.post("/admin/verify-invite", authController.verifyAdminInvite);

// Protected routes (require authentication)
router.get("/profile", authenticate, authController.getProfile);
router.post("/change-password", authenticate, authController.changePassword);

module.exports = router;
