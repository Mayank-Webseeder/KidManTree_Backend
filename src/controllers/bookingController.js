const Booking = require("../models/Booking");
const Psychologist = require("../models/Psychologist");
const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/response");
const logger = require("../utils/logger");
const Razorpay = require("razorpay");
const crypto = require("crypto");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const MEETING_LINK_TEMPLATE =
  process.env.MEETING_LINK_TEMPLATE || "https://meet.jit.si/kidmantree-{id}";

const generateMeetingLink = (bookingId) => {
  const id = bookingId?.toString() || "";
  if (MEETING_LINK_TEMPLATE.includes("{id}")) {
    return MEETING_LINK_TEMPLATE.replace("{id}", id);
  }
  const base = MEETING_LINK_TEMPLATE.endsWith("/")
    ? MEETING_LINK_TEMPLATE.slice(0, -1)
    : MEETING_LINK_TEMPLATE;
  return `${base}/${id}`;
};

class BookingController {
  // Create booking and Razorpay order
  async createBooking(req, res) {
    try {
      const {
        psychologistId,
        slotDate,
        slotDay,
        slotStartTime,
        slotEndTime,
        notes,
      } = req.body;
      const userId = req.user.id;

      if (
        !psychologistId ||
        !slotDate ||
        !slotDay ||
        !slotStartTime ||
        !slotEndTime
      ) {
        return errorResponse(res, "All slot details are required", 400);
      }

      // Check if psychologist exists and is active
      const psychologist = await Psychologist.findOne({
        _id: psychologistId,
        isActive: true,
        status: "selected",
      });

      if (!psychologist) {
        return errorResponse(res, "Psychologist not found or inactive", 404);
      }

      // Verify slot availability
      const slotExists = psychologist.schedule.find(
        (s) =>
          new Date(s.date).toISOString().split("T")[0] === slotDate &&
          s.startTime === slotStartTime &&
          s.endTime === slotEndTime &&
          s.isAvailable
      );

      if (!slotExists) {
        return errorResponse(res, "Selected slot is not available", 400);
      }

      // Check for existing booking at same time
      const existingBooking = await Booking.findOne({
        psychologist: psychologistId,
        slotDate: new Date(slotDate),
        slotStartTime,
        slotEndTime,
        status: { $nin: ["cancelled"] },
      });

      if (existingBooking) {
        return errorResponse(res, "Slot already booked", 409);
      }

      // Create booking
      const booking = new Booking({
        user: userId,
        psychologist: psychologistId,
        slotDate: new Date(slotDate),
        slotDay,
        slotStartTime,
        slotEndTime,
        sessionRate: psychologist.sessionRate || 500,
        notes,
        status: "pending",
        paymentStatus: "pending",
      });
      booking.meetingLink = generateMeetingLink(booking._id);
      await booking.save();

      // Create Razorpay order
      const razorpayOrder = await razorpay.orders.create({
        amount: booking.sessionRate * 100, // Amount in paise
        currency: "INR",
        receipt: `booking_${booking._id}`,
        notes: {
          bookingId: booking._id.toString(),
          userId: userId.toString(),
          psychologistId: psychologistId.toString(),
        },
      });

      // Update booking with Razorpay order ID
      booking.razorpayOrderId = razorpayOrder.id;
      await booking.save();

      const populatedBooking = await Booking.findById(booking._id)
        .populate(
          "psychologist",
          "name firstName lastName specializations rating"
        )
        .populate("user", "name email contact");

      return successResponse(
        res,
        {
          booking: populatedBooking,
          razorpayOrder: {
            id: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
          },
          razorpayKeyId: process.env.RAZORPAY_KEY_ID,
        },
        "Booking created successfully",
        201
      );
    } catch (error) {
      logger.error("Create booking error:", error);
      return errorResponse(res, "Failed to create booking", 500);
    }
  }

  // Verify Razorpay payment
  async verifyPayment(req, res) {
    try {
      const {
        razorpayOrderId,
        razorpayPaymentId,
        razorpaySignature,
        bookingId,
      } = req.body;

      if (
        !razorpayOrderId ||
        !razorpayPaymentId ||
        !razorpaySignature ||
        !bookingId
      ) {
        return errorResponse(res, "All payment details are required", 400);
      }

      // Verify signature
      const body = razorpayOrderId + "|" + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

      const isAuthentic = expectedSignature === razorpaySignature;

      if (!isAuthentic) {
        // Mark payment as failed
        await Booking.findByIdAndUpdate(bookingId, {
          paymentStatus: "failed",
        });
        return errorResponse(res, "Payment verification failed", 400);
      }

      // Update booking
      const booking = await Booking.findByIdAndUpdate(
        bookingId,
        {
          razorpayPaymentId,
          razorpaySignature,
          paymentStatus: "paid",
          status: "confirmed",
        },
        { new: true }
      )
        .populate("psychologist", "name firstName lastName specializations")
        .populate("user", "name email contact");

      if (!booking) {
        return errorResponse(res, "Booking not found", 404);
      }

      // Increment psychologist's total sessions
      await Psychologist.findByIdAndUpdate(booking.psychologist._id, {
        $inc: { totalSessions: 1 },
      });

      return successResponse(
        res,
        { booking },
        "Payment verified and booking confirmed"
      );
    } catch (error) {
      logger.error("Verify payment error:", error);
      return errorResponse(res, "Failed to verify payment", 500);
    }
  }

  // Get user's bookings
  async getUserBookings(req, res) {
    try {
      const userId = req.user.id;
      const { status, page = 1, limit = 10 } = req.query;

      const query = { user: userId };
      if (status) query.status = status;

      const bookings = await Booking.find(query)
        .populate(
          "psychologist",
          "name firstName lastName specializations rating profileImage"
        )
        .sort({ slotDate: -1, createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Booking.countDocuments(query);

      return successResponse(res, {
        bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        },
      });
    } catch (error) {
      logger.error("Get user bookings error:", error);
      return errorResponse(res, "Failed to retrieve bookings", 500);
    }
  }

  // Get bookings by psychologist ID
  async getBookingsByPsychologist(req, res) {
    try {
      const { psychologistId } = req.params;
      const { status, sessionStatus, page = 1, limit = 10 } = req.query;

      const query = { psychologist: psychologistId };
      if (status) query.status = status;
      if (sessionStatus) query.sessionStatus = sessionStatus;

      const bookings = await Booking.find(query)
        .populate("user", "name email contact profile.avatar")
        .sort({ slotDate: -1, createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Booking.countDocuments(query);

      return successResponse(res, {
        bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        },
      });
    } catch (error) {
      logger.error("Get psychologist bookings error:", error);
      return errorResponse(res, "Failed to retrieve bookings", 500);
    }
  }

  // Get single booking details
  async getBookingById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const userRole = req.user.role;

      const booking = await Booking.findById(id)
        .populate(
          "psychologist",
          "name firstName lastName specializations rating profileImage contact"
        )
        .populate("user", "name email contact profile.avatar");

      if (!booking) {
        return errorResponse(res, "Booking not found", 404);
      }

      // Check authorization
      const isPsychologist =
        userRole === "psychologist" &&
        booking.psychologist._id.toString() === userId;
      const isOwner = booking.user._id.toString() === userId;
      const isAdmin = ["admin", "superadmin"].includes(userRole);

      if (!isOwner && !isPsychologist && !isAdmin) {
        return errorResponse(res, "Unauthorized to view this booking", 403);
      }

      return successResponse(res, { booking });
    } catch (error) {
      logger.error("Get booking by ID error:", error);
      return errorResponse(res, "Failed to retrieve booking", 500);
    }
  }

  // Update booking (admin only)
  async updateBooking(req, res) {
    try {
      const { id } = req.params;
      const updateData = req.body;

      const booking = await Booking.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("psychologist", "name firstName lastName specializations")
        .populate("user", "name email contact");

      if (!booking) {
        return errorResponse(res, "Booking not found", 404);
      }

      return successResponse(res, { booking }, "Booking updated successfully");
    } catch (error) {
      logger.error("Update booking error:", error);
      return errorResponse(res, "Failed to update booking", 500);
    }
  }

  // Cancel booking
  async cancelBooking(req, res) {
    try {
      const { id } = req.params;
      const { cancellationReason } = req.body;
      const userId = req.user.id;
      const userRole = req.user.role;

      const booking = await Booking.findById(id);

      if (!booking) {
        return errorResponse(res, "Booking not found", 404);
      }

      // Check authorization
      const isOwner = booking.user.toString() === userId;
      const isPsychologist = userRole === "psychologist";
      const isAdmin = ["admin", "superadmin"].includes(userRole);

      if (!isOwner && !isPsychologist && !isAdmin) {
        return errorResponse(res, "Unauthorized to cancel this booking", 403);
      }

      if (booking.status === "cancelled") {
        return errorResponse(res, "Booking already cancelled", 400);
      }

      if (booking.status === "completed") {
        return errorResponse(res, "Cannot cancel completed booking", 400);
      }

      booking.status = "cancelled";
      booking.cancellationReason = cancellationReason;
      booking.cancelledBy = isAdmin
        ? "admin"
        : isPsychologist
        ? "psychologist"
        : "user";
      booking.cancelledAt = new Date();

      // Handle refund if payment was made
      if (booking.paymentStatus === "paid") {
        booking.paymentStatus = "refunded";
        // Implement actual refund logic with Razorpay here
      }

      await booking.save();

      return successResponse(
        res,
        { booking },
        "Booking cancelled successfully"
      );
    } catch (error) {
      logger.error("Cancel booking error:", error);
      return errorResponse(res, "Failed to cancel booking", 500);
    }
  }

  // Reschedule booking
  async rescheduleBooking(req, res) {
    try {
      const { id } = req.params;
      const { slotDate, slotDay, slotStartTime, slotEndTime } = req.body;
      const userId = req.user.id;

      if (!slotDate || !slotDay || !slotStartTime || !slotEndTime) {
        return errorResponse(res, "All new slot details are required", 400);
      }

      const booking = await Booking.findById(id);

      if (!booking) {
        return errorResponse(res, "Booking not found", 404);
      }

      // Check authorization
      if (
        booking.user.toString() !== userId &&
        !["admin", "superadmin"].includes(req.user.role)
      ) {
        return errorResponse(
          res,
          "Unauthorized to reschedule this booking",
          403
        );
      }

      if (["cancelled", "completed"].includes(booking.status)) {
        return errorResponse(
          res,
          "Cannot reschedule cancelled or completed booking",
          400
        );
      }

      // Check new slot availability
      const psychologist = await Psychologist.findById(booking.psychologist);
      const slotExists = psychologist.schedule.find(
        (s) =>
          s.day === slotDay &&
          s.startTime === slotStartTime &&
          s.endTime === slotEndTime &&
          s.isAvailable
      );

      if (!slotExists) {
        return errorResponse(res, "Selected slot is not available", 400);
      }

      // Check for conflicts
      const conflictBooking = await Booking.findOne({
        psychologist: booking.psychologist,
        slotDate: new Date(slotDate),
        slotStartTime,
        slotEndTime,
        status: { $nin: ["cancelled"] },
        _id: { $ne: id },
      });

      if (conflictBooking) {
        return errorResponse(res, "New slot already booked", 409);
      }

      // Update booking
      booking.slotDate = new Date(slotDate);
      booking.slotDay = slotDay;
      booking.slotStartTime = slotStartTime;
      booking.slotEndTime = slotEndTime;
      booking.status = "rescheduled";

      await booking.save();

      const populatedBooking = await Booking.findById(booking._id)
        .populate("psychologist", "name firstName lastName specializations")
        .populate("user", "name email contact");

      return successResponse(
        res,
        { booking: populatedBooking },
        "Booking rescheduled successfully"
      );
    } catch (error) {
      logger.error("Reschedule booking error:", error);
      return errorResponse(res, "Failed to reschedule booking", 500);
    }
  }

  // Update session status (psychologist/admin)
  async updateSessionStatus(req, res) {
    try {
      const { id } = req.params;
      const { sessionStatus } = req.body;
      const userRole = req.user.role;

      if (!["pending", "completed"].includes(sessionStatus)) {
        return errorResponse(res, "Invalid session status", 400);
      }

      if (!["psychologist", "admin", "superadmin"].includes(userRole)) {
        return errorResponse(res, "Unauthorized to update session status", 403);
      }

      const booking = await Booking.findById(id);

      if (!booking) {
        return errorResponse(res, "Booking not found", 404);
      }

      if (booking.status !== "confirmed") {
        return errorResponse(
          res,
          "Only confirmed bookings can be marked as completed",
          400
        );
      }

      booking.sessionStatus = sessionStatus;
      if (sessionStatus === "completed") {
        booking.status = "completed";
      }

      await booking.save();

      const populatedBooking = await Booking.findById(booking._id)
        .populate("psychologist", "name firstName lastName")
        .populate("user", "name email");

      return successResponse(
        res,
        { booking: populatedBooking },
        "Session status updated successfully"
      );
    } catch (error) {
      logger.error("Update session status error:", error);
      return errorResponse(res, "Failed to update session status", 500);
    }
  }

  // Delete booking (admin only)
  async deleteBooking(req, res) {
    try {
      const { id } = req.params;

      const booking = await Booking.findByIdAndDelete(id);

      if (!booking) {
        return errorResponse(res, "Booking not found", 404);
      }

      return successResponse(res, null, "Booking deleted successfully");
    } catch (error) {
      logger.error("Delete booking error:", error);
      return errorResponse(res, "Failed to delete booking", 500);
    }
  }

  // Get all bookings (admin)
  async getAllBookings(req, res) {
    try {
      const {
        status,
        paymentStatus,
        sessionStatus,
        page = 1,
        limit = 10,
      } = req.query;

      const query = {};
      if (status) query.status = status;
      if (paymentStatus) query.paymentStatus = paymentStatus;
      if (sessionStatus) query.sessionStatus = sessionStatus;

      const bookings = await Booking.find(query)
        .populate(
          "psychologist",
          "name firstName lastName specializations role"
        )
        .populate("user", "name email contact")
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Booking.countDocuments(query);

      return successResponse(res, {
        bookings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        },
      });
    } catch (error) {
      logger.error("Get all bookings error:", error);
      return errorResponse(res, "Failed to retrieve bookings", 500);
    }
  }
}

module.exports = new BookingController();
