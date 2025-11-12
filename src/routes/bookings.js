const express = require("express");
const router = express.Router();
const bookingController = require("../controllers/bookingController");
const { authenticate, authorize } = require("../middlewares/auth");

// User routes
router.post(
  "/",
  authenticate,
  authorize("user"),
  bookingController.createBooking
);
router.post(
  "/verify-payment",
  authenticate,
  authorize("user"),
  bookingController.verifyPayment
);
router.get(
  "/my-bookings",
  authenticate,
  authorize("user"),
  bookingController.getUserBookings
);
router.get("/:id", authenticate, bookingController.getBookingById);
router.put(
  "/:id/reschedule",
  authenticate,
  authorize("user", "admin", "superadmin"),
  bookingController.rescheduleBooking
);
router.put("/:id/cancel", authenticate, bookingController.cancelBooking);

// Psychologist routes
router.get(
  "/psychologist/:psychologistId",
  authenticate,
  authorize("psychologist", "admin", "superadmin"),
  bookingController.getBookingsByPsychologist
);
router.put(
  "/:id/session-status",
  authenticate,
  authorize("psychologist", "admin", "superadmin"),
  bookingController.updateSessionStatus
);

// Admin routes
router.get(
  "/admin/all",
  authenticate,
  authorize("admin", "superadmin"),
  bookingController.getAllBookings
);
router.put(
  "/admin/:id",
  authenticate,
  authorize("admin", "superadmin"),
  bookingController.updateBooking
);
router.delete(
  "/admin/:id",
  authenticate,
  authorize("admin", "superadmin"),
  bookingController.deleteBooking
);

module.exports = router;
