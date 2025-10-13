const express = require("express");
const router = express.Router();
const userPanelController = require("../controllers/userPanelController");
const { authenticate, authorize } = require("../middlewares/auth");

// Create a new user-panel account
router.post(
  "/",
  authenticate,
  authorize("admin", "superadmin"),
  userPanelController.createUserPanel
);

// Get all user-panel accounts with pagination and search
router.get(
  "/",
  authenticate,
  authorize("admin", "superadmin"),
  userPanelController.getUserPanels
);

// Get available modules
router.get(
  "/modules",
  authenticate,
  authorize("admin", "superadmin"),
  userPanelController.getAvailableModules
);

// Get a specific user-panel account
router.get(
  "/:id",
  authenticate,
  authorize("admin", "superadmin"),
  userPanelController.getUserPanel
);

// Update user-panel account
router.put(
  "/:id",
  authenticate,
  authorize("admin", "superadmin"),
  userPanelController.updateUserPanel
);

// Update modules for user-panel account
router.patch(
  "/:id/modules",
  authenticate,
  authorize("admin", "superadmin"),
  userPanelController.updateModules
);

// Toggle active status
router.patch(
  "/:id/toggle-active",
  authenticate,
  authorize("admin", "superadmin"),
  userPanelController.toggleActiveStatus
);

// Delete user-panel account
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "superadmin"),
  userPanelController.deleteUserPanel
);

module.exports = router;
