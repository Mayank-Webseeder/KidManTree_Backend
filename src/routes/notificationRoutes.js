const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const notificationAutomationController = require("../controllers/notificationAutomationController");
const { authenticate, authorize } = require("../middlewares/auth");

router.get("/", authenticate, notificationController.getNotifications);
router.put("/mark-all/read", authenticate, notificationController.markAllAsRead);
router.put("/:id/read", authenticate, notificationController.markAsRead);

router.post(
  "/automation/session-reminders",
  authenticate,
  authorize("admin", "superadmin"),
  notificationAutomationController.sendSessionReminders
);
router.post(
  "/automation/weekly-mood",
  authenticate,
  authorize("admin", "superadmin"),
  notificationAutomationController.sendWeeklyMoodSummaries
);
router.post(
  "/automation/mood-journal",
  authenticate,
  authorize("admin", "superadmin"),
  notificationAutomationController.sendMoodJournalReminders
);
router.post(
  "/automation/community-suggestion",
  authenticate,
  authorize("admin", "superadmin"),
  notificationAutomationController.broadcastCommunitySuggestion
);

module.exports = router;

