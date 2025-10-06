const express = require("express");
const { authenticate, authorize } = require("../middlewares/auth");
const pollController = require("../controllers/pollController");

const router = express.Router();

// Public routes
router.get("/", pollController.getAllPolls);
router.get("/:id", pollController.getPollById);

// Authenticated user routes
router.post("/", authenticate, pollController.createPoll);
router.get("/my/polls", authenticate, pollController.getMyPolls);
router.put("/:id", authenticate, pollController.updatePoll);
router.delete("/:id", authenticate, pollController.deletePoll);
router.post("/:id/vote", authenticate, pollController.voteOnPoll);
router.delete("/:id/vote", authenticate, pollController.removeVote);

// Admin/Superadmin routes
router.get(
  "/admin/all",
  authenticate,
  authorize("admin", "superadmin"),
  pollController.getAdminPolls
);
router.put(
  "/:id/admin-update",
  authenticate,
  authorize("admin", "superadmin"),
  pollController.adminUpdatePoll
);
router.delete(
  "/:id/admin-delete",
  authenticate,
  authorize("admin", "superadmin"),
  pollController.adminDeletePoll
);

module.exports = router;
