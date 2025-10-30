const express = require("express");
const reportController = require("../controllers/reportController");
const { authenticate, authorize } = require("../middlewares/auth");
const { validate } = require("../middlewares/validation");
const {
  reportCreateSchema,
  reportStatusUpdateSchema,
} = require("../utils/validators");

const router = express.Router();

// User: create a report
router.post(
  "/",
  authenticate,
  validate(reportCreateSchema),
  reportController.create
);

// User: list own reports
router.get("/mine", authenticate, reportController.mine);

// User or Admin: delete a report (owner can delete own, admin/superadmin can delete any)
router.delete("/:id", authenticate, reportController.delete);

// Admin: list all reports with filters
router.get(
  "/admin",
  authenticate,
  authorize("admin", "superadmin"),
  reportController.listAll
);

// Admin: update status (pending/resolved)
router.patch(
  "/:id/status",
  authenticate,
  authorize("admin", "superadmin"),
  validate(reportStatusUpdateSchema),
  reportController.updateStatus
);

module.exports = router;
