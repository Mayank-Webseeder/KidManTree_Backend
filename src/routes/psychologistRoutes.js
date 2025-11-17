const express = require("express");
const Psychologist = require("../models/Psychologist");
const User = require("../models/User");
const { authenticate, authorize } = require("../middlewares/auth");
const { successResponse, errorResponse } = require("../utils/response");
const logger = require("../utils/logger");

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
          const bcrypt = require("bcrypt");
          const hashedPassword = await bcrypt.hash(generatedPassword, 12);

          await User.create({
            name: psychologist.name,
            email: psychologist.email,
            password: hashedPassword,
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

      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash(password, 12);

      const user = await User.create({
        name: fullName,
        email,
        password: hashedPassword,
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

module.exports = router;
