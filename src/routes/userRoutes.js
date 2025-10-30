const express = require("express");
const userController = require("../controllers/userController");
const { authenticate, authorize } = require("../middlewares/auth");

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

router.get("/profile", userController.getProfile);
router.put("/profile", userController.updateProfile);
router.post("/change-password", userController.changePassword);
router.put("/notifications", userController.updateNotificationPrefs);
router.post("/delete-account", userController.requestAccountDeletion);
router.post("/confirm-deletion", userController.confirmAccountDeletion);
router.get("/booking-history", userController.getBookingHistory);

// Admin/Superadmin management routes
router.get(
  "/admin/list",
  authorize("admin", "superadmin"),
  userController.adminListUsers
);
router.patch(
  "/admin/:id/status",
  authorize("admin", "superadmin"),
  userController.adminSetUserActiveStatus
);
router.put(
  "/admin/:id",
  authorize("admin", "superadmin"),
  userController.adminUpdateUserProfile
);
router.delete(
  "/admin/:id",
  authorize("admin", "superadmin"),
  userController.adminDeleteUserAndRole
);
router.get(
  "/user/userDetails/:id",
  authorize("admin", "superadmin"),
  userController.getUserDetails
);

module.exports = router;
