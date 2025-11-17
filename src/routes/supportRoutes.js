const express = require("express");
const { authenticate, authorize } = require("../middlewares/auth");
const supportController = require("../controllers/supportController");

const router = express.Router();

// User routes (authenticated users can create and manage their own support tickets)
router.post("/", authenticate, supportController.createSupport);
router.get("/my-tickets", authenticate, supportController.getMyTickets);
router.get("/:id", authenticate, supportController.getSupportById);
router.put("/:id", authenticate, supportController.updateSupport);
router.delete("/:id", authenticate, supportController.deleteSupport);

// Admin/Superadmin routes
router.get(
  "/admin/all",
  authenticate,
  authorize("admin", "superadmin"),
  supportController.getAllSupports
);
router.patch(
  "/:id/status",
  authenticate,
  authorize("admin", "superadmin"),
  supportController.updateStatus
);
router.put(
  "/:id/admin-update",
  authenticate,
  authorize("admin", "superadmin"),
  supportController.adminUpdateSupport
);
router.delete(
  "/:id/admin-delete",
  authenticate,
  authorize("admin", "superadmin"),
  supportController.adminDeleteSupport
);

router.get(
  "/admin/stats",
  authenticate,
  authorize("admin", "superadmin"),
  supportController.getSupportStats
);

module.exports = router;
