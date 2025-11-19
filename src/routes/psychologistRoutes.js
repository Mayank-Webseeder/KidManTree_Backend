const express = require("express");
const Psychologist = require("../models/Psychologist");
const User = require("../models/User");
const Booking = require("../models/Booking");
const { authenticate, authorize } = require("../middlewares/auth");
const { successResponse, errorResponse } = require("../utils/response");
const logger = require("../utils/logger");

const MEETING_LINK_TEMPLATE =
  process.env.MEETING_LINK_TEMPLATE || "https://meet.jit.si/kidmantree-{id}";

const getMeetingLink = (booking) => {
  if (!booking) return "";
  if (booking.meetingLink) return booking.meetingLink;
  const id = booking._id?.toString() || "";
  if (MEETING_LINK_TEMPLATE.includes("{id}")) {
    return MEETING_LINK_TEMPLATE.replace("{id}", id);
  }
  const base = MEETING_LINK_TEMPLATE.endsWith("/")
    ? MEETING_LINK_TEMPLATE.slice(0, -1)
    : MEETING_LINK_TEMPLATE;
  return `${base}/${id}`;
};

const router = express.Router();

// Get all psychologists (public)
router.get("/", async (req, res) => {
  try {
    const { specialization, search } = req.query;
    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const limitRaw = parseInt(req.query.limit || "10", 10) || 10;
    const limit = Math.min(Math.max(limitRaw, 1), 100);

    const query = { isActive: true, status: "selected" };

    if (specialization) {
      query.specializations = { $in: [specialization] };
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { specializations: { $regex: search, $options: "i" } },
      ];
    }

    const psychologists = await Psychologist.find(query)
      .populate("reviews.user", "name profile.avatar")
      .sort({ rating: -1, name: 1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Psychologist.countDocuments(query);

    return successResponse(res, {
      psychologists,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    logger.error("Get psychologists error:", error);
    return errorResponse(res, "Failed to retrieve psychologists", 500);
  }
});

// Public application to become a psychologist/counselor
router.post("/public/apply", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      degree,
      experience,
      about,
      specializations,
      languages,
      sessionRate,
      city,
      contactNumber,
      role,
      aadharNumber,
      aadharDocument,
      uploadDocuments,
      schedule,
      profileImage,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !degree ||
      experience === undefined ||
      !city ||
      !contactNumber ||
      !aadharNumber ||
      !aadharDocument
    ) {
      return errorResponse(
        res,
        "firstName, lastName, email, degree, experience, city, contactNumber, aadharNumber, aadharDocument are required",
        400
      );
    }

    const existingByEmail = await Psychologist.findOne({ email });
    if (existingByEmail) {
      return errorResponse(
        res,
        "Application already exists with this email",
        409
      );
    }

    const existingAadhar = await Psychologist.findOne({ aadharNumber });
    if (existingAadhar) {
      return errorResponse(
        res,
        "Application already exists with this Aadhar number",
        409
      );
    }

    const fullName = `${firstName} ${lastName}`.trim();

    const created = await Psychologist.create({
      name: fullName,
      firstName,
      lastName,
      email,
      degree,
      experience,
      about,
      specializations,
      languages,
      sessionRate,
      city,
      contactNumber,
      role: role || "psychologist",
      aadharNumber,
      aadharDocument,
      uploadDocuments: uploadDocuments || [],
      schedule: Array.isArray(schedule) ? schedule : [],
      profileImage,
      isActive: true,
      status: "pending",
    });

    return successResponse(
      res,
      { applicationId: created._id, status: created.status },
      "Application submitted successfully",
      201
    );
  } catch (error) {
    logger.error("Public psychologist application error:", error);
    return errorResponse(
      res,
      error.message || "Failed to submit application",
      500
    );
  }
});

// Get all psychologists without any filters (public)
router.get("/getallphycologist", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const limitRaw = parseInt(req.query.limit || "10", 10) || 10;
    const limit = Math.min(Math.max(limitRaw, 1), 100);

    const query = { isActive: true, status: "selected" };

    const psychologists = await Psychologist.find(query)
      .sort({ rating: -1, name: 1 })
      .limit(limit)
      .skip((page - 1) * limit);

    const total = await Psychologist.countDocuments(query);

    return successResponse(res, {
      psychologists,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    logger.error("Get all psychologists (no filter) error:", error);
    return errorResponse(res, "Failed to retrieve psychologists", 500);
  }
});

// Get psychologist by ID
router.get("/:id([a-fA-F0-9]{24})", async (req, res) => {
  try {
    const psychologist = await Psychologist.findOne({
      _id: req.params.id,
      isActive: true,
      status: "selected",
    }).populate("reviews.user", "name profile.avatar");

    if (!psychologist) {
      return errorResponse(res, "Psychologist not found", 404);
    }

    return successResponse(res, { psychologist });
  } catch (error) {
    logger.error("Get psychologist error:", error);
    return errorResponse(res, "Failed to retrieve psychologist", 500);
  }
});

// Public: Get reviews for a psychologist
router.get("/:id/reviews", async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
    const limitRaw = parseInt(req.query.limit || "10", 10) || 10;
    const limit = Math.min(Math.max(limitRaw, 1), 100);

    const psych = await Psychologist.findOne({
      _id: req.params.id,
      isActive: true,
    });
    if (!psych) return errorResponse(res, "Psychologist not found", 404);

    const start = (page - 1) * limit;
    const end = start + limit;
    const total = psych.reviews.length;
    const reviews = psych.reviews
      .slice()
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(start, end);

    return successResponse(res, {
      reviews,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
      },
    });
  } catch (error) {
    logger.error("Get psychologist reviews error:", error);
    return errorResponse(res, "Failed to retrieve reviews", 500);
  }
});

// Users can create or update their rating/comment for a psychologist
router.post(
  "/:id/reviews",
  authenticate,
  authorize("user", "superadmin"),
  async (req, res) => {
    try {
      const { rating, comment } = req.body;
      const numericRating = Number(rating);
      if (!numericRating || numericRating < 1 || numericRating > 5) {
        return errorResponse(res, "rating must be an integer 1-5", 400);
      }

      const psych = await Psychologist.findOne({
        _id: req.params.id,
        isActive: true,
      });
      if (!psych) return errorResponse(res, "Psychologist not found", 404);

      const existingIndex = psych.reviews.findIndex(
        (r) => String(r.user) === String(req.user.id)
      );
      if (existingIndex >= 0) {
        psych.reviews[existingIndex].rating = numericRating;
        psych.reviews[existingIndex].comment = comment;
        psych.reviews[existingIndex].createdAt = new Date();
      } else {
        psych.reviews.push({
          user: req.user.id,
          rating: numericRating,
          comment,
        });
      }

      // Update aggregate rating field to match virtual average
      const sum = psych.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
      const avg = psych.reviews.length
        ? Math.round((sum / psych.reviews.length) * 10) / 10
        : 0;
      psych.rating = avg;

      await psych.save();

      return successResponse(
        res,
        { averageRating: psych.averageRating, rating: psych.rating },
        "Review saved"
      );
    } catch (error) {
      logger.error("Upsert psychologist review error:", error);
      return errorResponse(res, "Failed to submit review", 500);
    }
  }
);

// Psychologist profile management (authenticated psychologist)
router.get(
  "/profile/me",
  authenticate,
  authorize("psychologist"),
  async (req, res) => {
    try {
      const psychologist = await Psychologist.findOne({
        email: req.user.email,
      });

      if (!psychologist) {
        return errorResponse(res, "Psychologist profile not found", 404);
      }

      return successResponse(res, { psychologist });
    } catch (error) {
      logger.error("Get psychologist profile error:", error);
      return errorResponse(res, "Failed to retrieve psychologist profile", 500);
    }
  }
);

router.put(
  "/profile/me",
  authenticate,
  authorize("psychologist"),
  async (req, res) => {
    try {
      const psychologist = await Psychologist.findOneAndUpdate(
        { email: req.user.email },
        req.body,
        { new: true, runValidators: true }
      );

      if (!psychologist) {
        return errorResponse(res, "Psychologist profile not found", 404);
      }

      return successResponse(
        res,
        { psychologist },
        "Profile updated successfully"
      );
    } catch (error) {
      logger.error("Update psychologist profile error:", error);
      return errorResponse(res, "Failed to update psychologist profile", 500);
    }
  }
);

const normalizeTime = (time) => {
  time = time.trim().toUpperCase(); // "02:00 PM"

  const [hourMin, ampm] = time.split(" ");
  let [hour, minute] = hourMin.split(":").map(Number);

  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  return `${hour.toString().padStart(2, "0")}:${minute
    .toString()
    .padStart(2, "0")}`;
};


const timeToMinutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const isOverlapping = (start1, end1, start2, end2) => {
  return start1 < end2 && start2 < end1;
};

router.post(
  "/profile/me/slots",
  authenticate,
  authorize("psychologist"),
  async (req, res) => {
    try {
      let { dates, timeSlots, isAvailable = true } = req.body;

      if (!Array.isArray(dates) || dates.length === 0) {
        return errorResponse(res, "dates must be a non-empty array", 400);
      }

      if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
        return errorResponse(res, "timeSlots must be a non-empty array", 400);
      }

      // Normalize all times
      timeSlots = timeSlots.map((slot) => ({
        startTime: normalizeTime(slot.startTime),
        endTime: normalizeTime(slot.endTime),
      }));

      const psychologist = await Psychologist.findOne({
        email: req.user.email,
      });

      if (!psychologist) {
        return errorResponse(res, "Psychologist profile not found", 404);
      }

      // Check overlap with existing slots
      for (const date of dates) {
        for (const newSlot of timeSlots) {
          const startMin = timeToMinutes(newSlot.startTime);
          const endMin = timeToMinutes(newSlot.endTime);

          for (const slot of psychologist.schedule) {
            if (slot.date === date) {
              const s = timeToMinutes(slot.startTime);
              const e = timeToMinutes(slot.endTime);

              if (isOverlapping(startMin, endMin, s, e)) {
                return errorResponse(
                  res,
                  `Overlap on ${date}: (${newSlot.startTime} - ${newSlot.endTime}) conflicts with existing slot (${slot.startTime} - ${slot.endTime})`,
                  400
                );
              }
            }
          }
        }
      }

      // Insert all dates × timeSlots combinations
      for (const date of dates) {
        for (const slot of timeSlots) {
          psychologist.schedule.push({
            date,
            startTime: slot.startTime,
            endTime: slot.endTime,
            isAvailable,
          });
        }
      }

      await psychologist.save();

      return successResponse(
        res,
        { schedule: psychologist.schedule },
        "Multiple slots added successfully"
      );
    } catch (error) {
      console.error("Add schedule slot error:", error);
      return errorResponse(res, "Failed to add schedule slot", 500);
    }
  }
);

// Admin routes for managing psychologists
// Admin list of applications/profiles with filters
router.get(
  "/admin",
  authenticate,
  authorize("admin", "superadmin"),
  async (req, res) => {
    try {
      const { status, role, search } = req.query;
      const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
      const limitRaw = parseInt(req.query.limit || "10", 10) || 10;
      const limit = Math.min(Math.max(limitRaw, 1), 100);

      const query = {};
      if (status) query.status = status;
      if (role) query.role = role;
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
          { contactNumber: { $regex: search, $options: "i" } },
          { city: { $regex: search, $options: "i" } },
        ];
      }

      const items = await Psychologist.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip((page - 1) * limit);
      const total = await Psychologist.countDocuments(query);

      return successResponse(res, {
        items,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalItems: total,
        },
      });
    } catch (error) {
      logger.error("Admin list psychologists error:", error);
      return errorResponse(
        res,
        "Failed to retrieve psychologists for admin",
        500
      );
    }
  }
);

// Admin get single application/profile by id (any status)
router.get(
  "/admin/:id",
  authenticate,
  authorize("admin", "superadmin"),
  async (req, res) => {
    try {
      const item = await Psychologist.findById(req.params.id);
      if (!item) return errorResponse(res, "Psychologist not found", 404);
      return successResponse(res, { psychologist: item });
    } catch (error) {
      logger.error("Admin get psychologist error:", error);
      return errorResponse(res, "Failed to retrieve psychologist", 500);
    }
  }
);

// Admin change status; on selected create user and email credentials
router.put(
  "/:id/status",
  authenticate,
  authorize("admin", "superadmin"),
  async (req, res) => {
    try {
      const { status } = req.body;
      if (!["pending", "selected", "rejected"].includes(status)) {
        return errorResponse(res, "Invalid status", 400);
      }

      const psychologist = await Psychologist.findById(req.params.id);
      if (!psychologist)
        return errorResponse(res, "Psychologist not found", 404);

      let generatedPassword = null;

      if (status === "selected" && psychologist.status !== "selected") {
        // Create User account if not exists
        const existingUser = await User.findOne({ email: psychologist.email });
        if (!existingUser) {
          // Generate strong temporary password
          const crypto = require("crypto");
          generatedPassword = `Kidman@${crypto.randomInt(100000, 999999)}`;

          await User.create({
            name: psychologist.name,
            email: psychologist.email,
            password: generatedPassword,
            contact: psychologist.contactNumber,
            age: 25,
            role: "psychologist",
            isEmailVerified: true,
            isContactVerified: true,
            isActive: true,
          });
        }

        psychologist.accountActivatedAt = new Date();
      }

      psychologist.status = status;
      await psychologist.save();

      // Send credentials if selected and we generated a password
      if (generatedPassword) {
        const emailService = require("../services/emailService");
        await emailService.sendPsychologistCredentials(
          psychologist.email,
          psychologist.name,
          generatedPassword
        );
      }

      return successResponse(
        res,
        {
          psychologist,
          generatedPassword: generatedPassword || undefined,
        },
        "Status updated successfully"
      );
    } catch (error) {
      logger.error("Admin update psychologist status error:", error);
      return errorResponse(
        res,
        error.message || "Failed to update status",
        500
      );
    }
  }
);
router.post(
  "/",
  authenticate,
  authorize("admin", "superadmin"),
  async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        password,
        degree,
        experience,
        about,
        specializations,
        languages,
        sessionRate,
        city,
        contactNumber,
        role,
        aadharNumber,
        aadharDocument,
        uploadDocuments,
        schedule,
        profileImage,
      } = req.body;

      if (
        !firstName ||
        !lastName ||
        !email ||
        !password ||
        !degree ||
        experience === undefined ||
        !city ||
        !contactNumber ||
        !aadharNumber ||
        !aadharDocument
      ) {
        return errorResponse(
          res,
          "firstName, lastName, email, password, degree, experience, city, contactNumber, aadharNumber, aadharDocument are required",
          400
        );
      }

      // Create user with psychologist role
      const fullName = `${firstName} ${lastName}`.trim();
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return errorResponse(res, "User already exists with this email", 409);
      }

      // Check if contact number already exists
      const existingContact = await User.findOne({ contact: contactNumber });
      if (existingContact) {
        return errorResponse(
          res,
          "User already exists with this contact number",
          409
        );
      }

      // Check if aadhar number already exists
      const existingAadhar = await Psychologist.findOne({ aadharNumber });
      if (existingAadhar) {
        return errorResponse(
          res,
          "Psychologist already exists with this Aadhar number",
          409
        );
      }

      const user = await User.create({
        name: fullName,
        email,
        password,
        contact: contactNumber,
        age: 25,
        role: "psychologist",
        isEmailVerified: true,
        isContactVerified: true,
        isActive: true,
      });

      // Create psychologist profile
      const psychologist = await Psychologist.create({
        name: fullName,
        firstName,
        lastName,
        email,
        degree,
        experience,
        about,
        specializations,
        languages,
        sessionRate,
        city,
        contactNumber,
        role: role || "psychologist",
        aadharNumber,
        aadharDocument,
        uploadDocuments: uploadDocuments || [],
        schedule: Array.isArray(schedule) ? schedule : [],
        profileImage,
        isActive: true,
        status: "selected",
        accountActivatedAt: new Date(),
      });

      // Send credentials via email
      const emailService = require("../services/emailService");
      await emailService.sendPsychologistCredentials(email, fullName, password);

      return successResponse(
        res,
        { user, psychologist },
        "Psychologist created and credentials emailed",
        201
      );
    } catch (error) {
      logger.error("Create psychologist error:", error);
      return errorResponse(
        res,
        error.message || "Failed to create psychologist",
        500
      );
    }
  }
);

router.put(
  "/:id([a-fA-F0-9]{24})",
  authenticate,
  authorize("admin", "superadmin"),
  async (req, res) => {
    try {
      const psychologist = await Psychologist.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: true }
      );

      if (!psychologist) {
        return errorResponse(res, "Psychologist not found", 404);
      }

      return successResponse(
        res,
        { psychologist },
        "Psychologist updated successfully"
      );
    } catch (error) {
      logger.error("Update psychologist error:", error);
      return errorResponse(res, "Failed to update psychologist", 500);
    }
  }
);

router.delete(
  "/:id([a-fA-F0-9]{24})",
  authenticate,
  authorize("admin", "superadmin"),
  async (req, res) => {
    try {
      const psychologist = await Psychologist.findByIdAndUpdate(
        req.params.id,
        { isActive: false },
        { new: true }
      );

      if (!psychologist) {
        return errorResponse(res, "Psychologist not found", 404);
      }

      // Also deactivate the user account
      await User.findOneAndUpdate(
        { email: psychologist.email },
        { isActive: false }
      );

      return successResponse(
        res,
        null,
        "Psychologist deactivated successfully"
      );
    } catch (error) {
      logger.error("Delete psychologist error:", error);
      return errorResponse(res, "Failed to deactivate psychologist", 500);
    }
  }
);

// Route for psychologists to deactivate their own account
router.delete(
  "/profile/me",
  authenticate,
  authorize("psychologist"),
  async (req, res) => {
    try {
      const psychologist = await Psychologist.findOneAndUpdate(
        { email: req.user.email },
        { isActive: false },
        { new: true }
      );

      if (!psychologist) {
        return errorResponse(res, "Psychologist profile not found", 404);
      }

      // Also deactivate the user account
      await User.findByIdAndUpdate(req.user.id, { isActive: false });

      return successResponse(res, null, "Account deactivated successfully");
    } catch (error) {
      logger.error("Deactivate psychologist account error:", error);
      return errorResponse(res, "Failed to deactivate account", 500);
    }
  }
);

// get all slot of psychologists
router.get("/:id/slots", async (req, res) => {
  try {
    const psychologist = await Psychologist.findOne({
      _id: req.params.id,
      isActive: true,
      status: "selected",
    }).select("name schedule");

    if (!psychologist) {
      return errorResponse(res, "Psychologist not found", 404);
    }

    const availableSlots = psychologist.schedule.filter(
      (slot) => slot.isAvailable
    );

    return successResponse(res, {
      psychologistId: psychologist._id,
      psychologistName: psychologist.name,
      totalSlots: psychologist.schedule.length,
      availableSlotsCount: availableSlots.length,
      slots: availableSlots,
    });
  } catch (error) {
    logger.error("Get psychologist slots error:", error);
    return errorResponse(res, "Failed to retrieve psychologist slots", 500);
  }
});

// get slot by id of psychologists
router.get("/:psychologistId/slots/:slotId", async (req, res) => {
  try {
    const { psychologistId, slotId } = req.params;

    const psychologist = await Psychologist.findOne({
      _id: psychologistId,
      isActive: true,
      status: "selected",
    }).select("name schedule");

    if (!psychologist) {
      return errorResponse(res, "Psychologist not found", 404);
    }

    const slot = psychologist.schedule.id(slotId);

    if (!slot) {
      return errorResponse(res, "Slot not found", 404);
    }

    return successResponse(res, {
      psychologistId: psychologist._id,
      psychologistName: psychologist.name,
      slot,
    });
  } catch (error) {
    logger.error("Get psychologist slot by ID error:", error);
    return errorResponse(res, "Failed to retrieve slot", 500);
  }
});

// Get sessions for authenticated psychologist (Sessions page)
router.get(
  "/sessions/me",
  authenticate,
  authorize("psychologist"),
  async (req, res) => {
    try {
      // Get psychologist by email
      const psychologist = await Psychologist.findOne({
        email: req.user.email,
      });

      if (!psychologist) {
        return errorResponse(res, "Psychologist profile not found", 404);
      }

      // Get all bookings for this psychologist
      const allBookings = await Booking.find({
        psychologist: psychologist._id,
      })
        .populate("user", "name email profile.avatar")
        .sort({ slotDate: 1, slotStartTime: 1 });

      // Calculate summary statistics
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Upcoming sessions (confirmed status, not rescheduled, slotDate >= today)
      const upcomingBookings = allBookings.filter(
        (booking) =>
          booking.status === "confirmed" &&
          new Date(booking.slotDate) >= today
      );

      // Rescheduled sessions that are upcoming (for upcoming tab)
      const upcomingRescheduledBookings = allBookings.filter(
        (booking) =>
          booking.status === "rescheduled" &&
          new Date(booking.slotDate) >= today
      );

      // All upcoming (confirmed + rescheduled upcoming)
      const allUpcomingBookings = [...upcomingBookings, ...upcomingRescheduledBookings];

      const upcomingCount = allUpcomingBookings.length;
      const upcomingPaid = allUpcomingBookings.filter(
        (b) => b.paymentStatus === "paid"
      ).length;
      const upcomingFree = upcomingCount - upcomingPaid;

      // Completed sessions
      const completedBookings = allBookings.filter(
        (booking) => booking.status === "completed"
      );
      const completedCount = completedBookings.length;

      // All rescheduled sessions (both past and future)
      const rescheduledBookings = allBookings.filter(
        (booking) => booking.status === "rescheduled"
      );
      const rescheduledCount = rescheduledBookings.length;

      // Calculate revenue from completed paid sessions (after 10% commission)
      // Note: Based on UI, this might be for completed sessions, not rescheduled
      const completedRevenue = completedBookings.reduce((sum, booking) => {
        if (booking.paymentStatus === "paid") {
          return sum + booking.sessionRate * 0.9; // 10% commission deducted
        }
        return sum;
      }, 0);

      // Format sessions for response
      const formatSession = (booking) => {
        const slotDate = new Date(booking.slotDate);
        const dateStr = slotDate.toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        // Calculate duration in minutes
        const startTime = booking.slotStartTime.split(":").map(Number);
        const endTime = booking.slotEndTime.split(":").map(Number);
        const startMinutes = startTime[0] * 60 + startTime[1];
        const endMinutes = endTime[0] * 60 + endTime[1];
        const duration = endMinutes - startMinutes;

        // Format time (convert 24h to 12h with AM/PM)
        const timeStr = (() => {
          const [hours, minutes] = booking.slotStartTime.split(":").map(Number);
          const period = hours >= 12 ? "PM" : "AM";
          const displayHours = hours % 12 || 12;
          return `${displayHours.toString().padStart(2, "0")}:${minutes
            .toString()
            .padStart(2, "0")} ${period}`;
        })();

        return {
          _id: booking._id,
          patient: {
            _id: booking.user._id,
            name: booking.user.name || "Unknown",
            avatar: booking.user.profile?.avatar || null,
            email: booking.user.email,
          },
          sessionType: "Video Call",
          isVideoCall: true,
          duration: duration,
          durationText: `${duration} min`,
          date: dateStr,
          time: timeStr,
          slotDate: booking.slotDate,
          slotStartTime: booking.slotStartTime,
          slotEndTime: booking.slotEndTime,
          meetingLink: getMeetingLink(booking),
          status: booking.status,
          paymentStatus: booking.paymentStatus,
          sessionStatus: booking.sessionStatus,
          sessionRate: booking.sessionRate,
          notes: booking.notes,
          createdAt: booking.createdAt,
        };
      };

      // Group sessions by status
      const upcomingSessions = allUpcomingBookings.map(formatSession);
      const completedSessions = completedBookings.map(formatSession);
      const rescheduledSessions = rescheduledBookings.map(formatSession);

      // Summary cards data
      const summary = {
        upcoming: {
          count: upcomingCount,
          paid: upcomingPaid,
          free: upcomingFree,
        },
        completed: {
          count: completedCount,
        },
        rescheduled: {
          count: rescheduledCount,
          revenue: Math.round(completedRevenue), // Revenue from completed sessions after commission
        },
      };

      return successResponse(res, {
        summary,
        sessions: {
          upcoming: upcomingSessions,
          completed: completedSessions,
          rescheduled: rescheduledSessions,
        },
        counts: {
          upcoming: upcomingSessions.length,
          completed: completedSessions.length,
          rescheduled: rescheduledSessions.length,
        },
      });
    } catch (error) {
      logger.error("Get psychologist sessions error:", error);
      return errorResponse(res, "Failed to retrieve sessions", 500);
    }
  }
);

module.exports = router;
