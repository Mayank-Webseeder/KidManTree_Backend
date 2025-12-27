const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { authenticate, authorize } = require("../middlewares/auth");
const psychologistController = require("../controllers/psychologistController");

const router = express.Router();

// Ensure upload folders exist
const uploadsRoot = path.join(process.cwd(), "uploads");
const profileImagesDir = path.join(uploadsRoot, "profiles");
const documentsDir = path.join(uploadsRoot, "documents");
[uploadsRoot, profileImagesDir, documentsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer storage for profile image and documents
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "profileImage") cb(null, profileImagesDir);
    else cb(null, documentsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname === "profileImage" ? "profile" : "doc";
    cb(null, `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});

function imageFilter(req, file, cb) {
  if (!file.mimetype.startsWith("image/")) return cb(new Error("Only image files allowed for profileImage"), false);
  cb(null, true);
}

function documentFilter(req, file, cb) {
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/jpg",
  ];
  if (!allowed.includes(file.mimetype)) return cb(new Error("Invalid document type"), false);
  cb(null, true);
}

const uploadFiles = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "profileImage") return imageFilter(req, file, cb);
    return documentFilter(req, file, cb);
  },
  limits: { fileSize: 10 * 1024 * 1024 },
}).fields([
  { name: "profileImage", maxCount: 1 },
  { name: "aadharDocument", maxCount: 1 },
  { name: "uploadDocuments", maxCount: 10 },
]);

// Get all psychologists (public)
router.get("/", psychologistController.getAll);

// Public application to become a psychologist/counselor
router.post("/public/apply", uploadFiles, psychologistController.applyPublic);

// Get all psychologists without any filters (public)
router.get("/getallphycologist", psychologistController.getAllNoFilter);

// Get psychologist by ID
router.get("/:id([a-fA-F0-9]{24})", psychologistController.getById);

// Public: Get reviews for a psychologist
router.get("/:id/reviews", psychologistController.getReviews);

// Users can create or update their rating/comment for a psychologist
router.post(
  "/:id/reviews",
  authenticate,
  authorize("user", "superadmin"),
  psychologistController.postReview
);

// Psychologist profile management (authenticated psychologist)
router.get(
  "/profile/me",
  authenticate,
  authorize("psychologist"),
  psychologistController.getProfileMe
);

router.put(
  "/profile/me",
  authenticate,
  authorize("psychologist"),
  uploadFiles,
  psychologistController.updateProfileMe
);

router.post(
  "/profile/me/slots",
  authenticate,
  authorize("psychologist"),
  psychologistController.addSlotsMe
);

// Admin routes for managing psychologists
// Admin list of applications/profiles with filters
router.get(
  "/admin",
  authenticate,
  authorize("admin", "superadmin"),
  psychologistController.getAdminList
);

// Admin get single application/profile by id (any status)
router.get(
  "/admin/:id",
  authenticate,
  authorize("admin", "superadmin"),
  psychologistController.getAdminById
);

// Admin change status; on selected create user and email credentials
router.put(
  "/:id/status",
  authenticate,
  authorize("admin", "superadmin"),
  psychologistController.updateStatus
);

router.post(
  "/",
  authenticate,
  authorize("admin", "superadmin"),
  uploadFiles,
  psychologistController.create
);

router.put(
  "/:id([a-fA-F0-9]{24})",
  authenticate,
  authorize("admin", "superadmin"),
  uploadFiles,
  psychologistController.update
);

router.delete(
  "/:id([a-fA-F0-9]{24})",
  authenticate,
  authorize("admin", "superadmin"),
  psychologistController.delete
);

// Route for psychologists to deactivate their own account
router.delete(
  "/profile/me",
  authenticate,
  authorize("psychologist"),
  psychologistController.deactivateMe
);

// get all slot of psychologists
router.get("/:id/slots", psychologistController.getSlots);

// get slot by id of psychologists
router.get("/:psychologistId/slots/:slotId", psychologistController.getSlotById);

// Update/Edit a specific slot (psychologist only)
router.put(
  "/profile/me/slots/:slotId",
  authenticate,
  authorize("psychologist"),
  psychologistController.updateSlotMe
);

// Delete a specific slot (psychologist only)
router.delete(
  "/profile/me/slots/:slotId",
  authenticate,
  authorize("psychologist"),
  psychologistController.deleteSlotMe
);

// Admin: Delete any slot (admin/superadmin only)
router.delete(
  "/admin/:psychologistId/slots/:slotId",
  authenticate,
  authorize("admin", "superadmin"),
  psychologistController.deleteSlotAdmin
);

// Get sessions for authenticated psychologist (Sessions page)
router.get(
  "/sessions/me",
  authenticate,
  authorize("psychologist"),
  psychologistController.getSessionsMe
);

// Get psychologist history sessions (completed sessions)
router.get(
  "/sessions/me/history",
  authenticate,
  authorize("psychologist"),
  psychologistController.getHistoryMe
);

// Get session report (downloadable)
router.get(
  "/sessions/:sessionId/report",
  authenticate,
  authorize("psychologist", "admin", "superadmin"),
  psychologistController.getSessionReport
);

// Add or update prescription for a session (psychologist)
router.put(
  "/sessions/:sessionId/prescription",
  authenticate,
  authorize("psychologist"),
  psychologistController.updatePrescription
);

// Get psychologist history sessions by psychologist ID (for superadmin/admin)
router.get(
  "/sessions/history/:psychologistId",
  authenticate,
  authorize("admin", "superadmin"),
  psychologistController.getHistoryById
);

// Send booking confirmation email to user
router.post(
  "/bookings/:bookingId/send-confirmation-email",
  authenticate,
  authorize("psychologist", "admin", "superadmin"),
  psychologistController.sendConfirmationEmail
);

module.exports = router;


// const express = require("express");
// const Psychologist = require("../models/Psychologist");
// const User = require("../models/User");
// const Booking = require("../models/Booking");
// const { authenticate, authorize } = require("../middlewares/auth");
// const { successResponse, errorResponse } = require("../utils/response");
// const logger = require("../utils/logger");
// const emailService = require("../services/emailService");

// const getMeetingLink = (booking) => {
//   if (!booking) return null;
//   return booking.meetingLink || null;
// };

// const router = express.Router();

// // Get all psychologists (public)
// router.get("/", async (req, res) => {
//   try {
//     const { specialization, search } = req.query;
//     const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
//     const limitRaw = parseInt(req.query.limit || "10", 10) || 10;
//     const limit = Math.min(Math.max(limitRaw, 1), 100);

//     const query = { isActive: true, status: "selected" };

//     if (specialization) {
//       query.specializations = { $in: [specialization] };
//     }

//     if (search) {
//       query.$or = [
//         { name: { $regex: search, $options: "i" } },
//         { specializations: { $regex: search, $options: "i" } },
//       ];
//     }

//     const psychologists = await Psychologist.find(query)
//       .populate("reviews.user", "name profile.avatar")
//       .sort({ rating: -1, name: 1 })
//       .limit(limit)
//       .skip((page - 1) * limit);

//     const total = await Psychologist.countDocuments(query);

//     return successResponse(res, {
//       psychologists,
//       pagination: {
//         currentPage: page,
//         totalPages: Math.ceil(total / limit),
//         totalItems: total,
//       },
//     });
//   } catch (error) {
//     logger.error("Get psychologists error:", error);
//     return errorResponse(res, "Failed to retrieve psychologists", 500);
//   }
// });

// // Public application to become a psychologist/counselor
// router.post("/public/apply", async (req, res) => {
//   try {
//     const {
//       firstName,
//       lastName,
//       email,
//       degree,
//       experience,
//       about,
//       specializations,
//       languages,
//       sessionRate,
//       city,
//       contactNumber,
//       role,
//       aadharNumber,
//       aadharDocument,
//       uploadDocuments,
//       schedule,
//       profileImage,
//     } = req.body;

//     if (
//       !firstName ||
//       !lastName ||
//       !email ||
//       !degree ||
//       experience === undefined ||
//       !city ||
//       !contactNumber ||
//       !aadharNumber ||
//       !aadharDocument
//     ) {
//       return errorResponse(
//         res,
//         "firstName, lastName, email, degree, experience, city, contactNumber, aadharNumber, aadharDocument are required",
//         400
//       );
//     }

//     const existingByEmail = await Psychologist.findOne({ email });
//     if (existingByEmail) {
//       return errorResponse(
//         res,
//         "Application already exists with this email",
//         409
//       );
//     }

//     const existingAadhar = await Psychologist.findOne({ aadharNumber });
//     if (existingAadhar) {
//       return errorResponse(
//         res,
//         "Application already exists with this Aadhar number",
//         409
//       );
//     }

//     const fullName = `${firstName} ${lastName}`.trim();

//     const created = await Psychologist.create({
//       name: fullName,
//       firstName,
//       lastName,
//       email,
//       degree,
//       experience,
//       about,
//       specializations,
//       languages,
//       sessionRate,
//       city,
//       contactNumber,
//       role: role || "psychologist",
//       aadharNumber,
//       aadharDocument,
//       uploadDocuments: uploadDocuments || [],
//       schedule: Array.isArray(schedule) ? schedule : [],
//       profileImage,
//       isActive: true,
//       status: "pending",
//     });

//     return successResponse(
//       res,
//       { applicationId: created._id, status: created.status },
//       "Application submitted successfully",
//       201
//     );
//   } catch (error) {
//     logger.error("Public psychologist application error:", error);
//     return errorResponse(
//       res,
//       error.message || "Failed to submit application",
//       500
//     );
//   }
// });

// // Get all psychologists without any filters (public)
// router.get("/getallphycologist", async (req, res) => {
//   try {
//     const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
//     const limitRaw = parseInt(req.query.limit || "10", 10) || 10;
//     const limit = Math.min(Math.max(limitRaw, 1), 100);

//     const query = { isActive: true, status: "selected" };

//     const psychologists = await Psychologist.find(query)
//       .sort({ rating: -1, name: 1 })
//       .limit(limit)
//       .skip((page - 1) * limit);

//     const total = await Psychologist.countDocuments(query);

//     return successResponse(res, {
//       psychologists,
//       pagination: {
//         currentPage: page,
//         totalPages: Math.ceil(total / limit),
//         totalItems: total,
//       },
//     });
//   } catch (error) {
//     logger.error("Get all psychologists (no filter) error:", error);
//     return errorResponse(res, "Failed to retrieve psychologists", 500);
//   }
// });

// // Get psychologist by ID
// router.get("/:id([a-fA-F0-9]{24})", async (req, res) => {
//   try {
//     const psychologist = await Psychologist.findOne({
//       _id: req.params.id,
//       isActive: true,
//       status: "selected",
//     }).populate("reviews.user", "name profile.avatar");

//     if (!psychologist) {
//       return errorResponse(res, "Psychologist not found", 404);
//     }

//     return successResponse(res, { psychologist });
//   } catch (error) {
//     logger.error("Get psychologist error:", error);
//     return errorResponse(res, "Failed to retrieve psychologist", 500);
//   }
// });

// // Public: Get reviews for a psychologist
// router.get("/:id/reviews", async (req, res) => {
//   try {
//     const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
//     const limitRaw = parseInt(req.query.limit || "10", 10) || 10;
//     const limit = Math.min(Math.max(limitRaw, 1), 100);

//     const psych = await Psychologist.findOne({
//       _id: req.params.id,
//       isActive: true,
//     });
//     if (!psych) return errorResponse(res, "Psychologist not found", 404);

//     const start = (page - 1) * limit;
//     const end = start + limit;
//     const total = psych.reviews.length;
//     const reviews = psych.reviews
//       .slice()
//       .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
//       .slice(start, end);

//     return successResponse(res, {
//       reviews,
//       pagination: {
//         currentPage: page,
//         totalPages: Math.ceil(total / limit),
//         totalItems: total,
//       },
//     });
//   } catch (error) {
//     logger.error("Get psychologist reviews error:", error);
//     return errorResponse(res, "Failed to retrieve reviews", 500);
//   }
// });

// // Users can create or update their rating/comment for a psychologist
// router.post(
//   "/:id/reviews",
//   authenticate,
//   authorize("user", "superadmin"),
//   async (req, res) => {
//     try {
//       const { rating, comment } = req.body;
//       const numericRating = Number(rating);
//       if (!numericRating || numericRating < 1 || numericRating > 5) {
//         return errorResponse(res, "rating must be an integer 1-5", 400);
//       }

//       const psych = await Psychologist.findOne({
//         _id: req.params.id,
//         isActive: true,
//       });
//       if (!psych) return errorResponse(res, "Psychologist not found", 404);

//       const existingIndex = psych.reviews.findIndex(
//         (r) => String(r.user) === String(req.user.id)
//       );
//       if (existingIndex >= 0) {
//         psych.reviews[existingIndex].rating = numericRating;
//         psych.reviews[existingIndex].comment = comment;
//         psych.reviews[existingIndex].createdAt = new Date();
//       } else {
//         psych.reviews.push({
//           user: req.user.id,
//           rating: numericRating,
//           comment,
//         });
//       }

//       // Update aggregate rating field to match virtual average
//       const sum = psych.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
//       const avg = psych.reviews.length
//         ? Math.round((sum / psych.reviews.length) * 10) / 10
//         : 0;
//       psych.rating = avg;

//       await psych.save();

//       return successResponse(
//         res,
//         { averageRating: psych.averageRating, rating: psych.rating },
//         "Review saved"
//       );
//     } catch (error) {
//       logger.error("Upsert psychologist review error:", error);
//       return errorResponse(res, "Failed to submit review", 500);
//     }
//   }
// );

// // Psychologist profile management (authenticated psychologist)
// router.get(
//   "/profile/me",
//   authenticate,
//   authorize("psychologist"),
//   async (req, res) => {
//     try {
//       const psychologist = await Psychologist.findOne({
//         email: req.user.email,
//       });

//       if (!psychologist) {
//         return errorResponse(res, "Psychologist profile not found", 404);
//       }

//       return successResponse(res, { psychologist });
//     } catch (error) {
//       logger.error("Get psychologist profile error:", error);
//       return errorResponse(res, "Failed to retrieve psychologist profile", 500);
//     }
//   }
// );

// router.put(
//   "/profile/me",
//   authenticate,
//   authorize("psychologist"),
//   async (req, res) => {
//     try {
//       const psychologist = await Psychologist.findOneAndUpdate(
//         { email: req.user.email },
//         req.body,
//         { new: true, runValidators: true }
//       );

//       if (!psychologist) {
//         return errorResponse(res, "Psychologist profile not found", 404);
//       }

//       return successResponse(
//         res,
//         { psychologist },
//         "Profile updated successfully"
//       );
//     } catch (error) {
//       logger.error("Update psychologist profile error:", error);
//       return errorResponse(res, "Failed to update psychologist profile", 500);
//     }
//   }
// );

// const normalizeTime = (time) => {
//   time = time.trim().toUpperCase(); // "02:00 PM"

//   const [hourMin, ampm] = time.split(" ");
//   let [hour, minute] = hourMin.split(":").map(Number);

//   if (ampm === "PM" && hour !== 12) hour += 12;
//   if (ampm === "AM" && hour === 12) hour = 0;

//   return `${hour.toString().padStart(2, "0")}:${minute
//     .toString()
//     .padStart(2, "0")}`;
// };

// const timeToMinutes = (t) => {
//   const [h, m] = t.split(":").map(Number);
//   return h * 60 + m;
// };

// const isOverlapping = (start1, end1, start2, end2) => {
//   return start1 < end2 && start2 < end1;
// };

// router.post(
//   "/profile/me/slots",
//   authenticate,
//   authorize("psychologist"),
//   async (req, res) => {
//     try {
//       let { dates, timeSlots, isAvailable = true } = req.body;

//       if (!Array.isArray(dates) || dates.length === 0) {
//         return errorResponse(res, "dates must be a non-empty array", 400);
//       }

//       if (!Array.isArray(timeSlots) || timeSlots.length === 0) {
//         return errorResponse(res, "timeSlots must be a non-empty array", 400);
//       }

//       // Normalize all times
//       timeSlots = timeSlots.map((slot) => ({
//         startTime: normalizeTime(slot.startTime),
//         endTime: normalizeTime(slot.endTime),
//       }));

//       const psychologist = await Psychologist.findOne({
//         email: req.user.email,
//       });

//       if (!psychologist) {
//         return errorResponse(res, "Psychologist profile not found", 404);
//       }

//       // Check overlap with existing slots
//       for (const date of dates) {
//         for (const newSlot of timeSlots) {
//           const startMin = timeToMinutes(newSlot.startTime);
//           const endMin = timeToMinutes(newSlot.endTime);

//           for (const slot of psychologist.schedule) {
//             if (slot.date === date) {
//               const s = timeToMinutes(slot.startTime);
//               const e = timeToMinutes(slot.endTime);

//               if (isOverlapping(startMin, endMin, s, e)) {
//                 return errorResponse(
//                   res,
//                   `Overlap on ${date}: (${newSlot.startTime} - ${newSlot.endTime}) conflicts with existing slot (${slot.startTime} - ${slot.endTime})`,
//                   400
//                 );
//               }
//             }
//           }
//         }
//       }

//       // Insert all dates × timeSlots combinations
//       for (const date of dates) {
//         for (const slot of timeSlots) {
//           psychologist.schedule.push({
//             date,
//             startTime: slot.startTime,
//             endTime: slot.endTime,
//             isAvailable,
//           });
//         }
//       }

//       await psychologist.save();

//       return successResponse(
//         res,
//         { schedule: psychologist.schedule },
//         "Multiple slots added successfully"
//       );
//     } catch (error) {
//       console.error("Add schedule slot error:", error);
//       return errorResponse(res, "Failed to add schedule slot", 500);
//     }
//   }
// );

// // Admin routes for managing psychologists
// // Admin list of applications/profiles with filters
// router.get(
//   "/admin",
//   authenticate,
//   authorize("admin", "superadmin"),
//   async (req, res) => {
//     try {
//       const { status, role, search } = req.query;
//       const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
//       const limitRaw = parseInt(req.query.limit || "10", 10) || 10;
//       const limit = Math.min(Math.max(limitRaw, 1), 100);

//       const query = {};
//       if (status) query.status = status;
//       if (role) query.role = role;
//       if (search) {
//         query.$or = [
//           { name: { $regex: search, $options: "i" } },
//           { email: { $regex: search, $options: "i" } },
//           { contactNumber: { $regex: search, $options: "i" } },
//           { city: { $regex: search, $options: "i" } },
//         ];
//       }

//       const items = await Psychologist.find(query)
//         .sort({ createdAt: -1 })
//         .limit(limit)
//         .skip((page - 1) * limit);
//       const total = await Psychologist.countDocuments(query);

//       return successResponse(res, {
//         items,
//         pagination: {
//           currentPage: page,
//           totalPages: Math.ceil(total / limit),
//           totalItems: total,
//         },
//       });
//     } catch (error) {
//       logger.error("Admin list psychologists error:", error);
//       return errorResponse(
//         res,
//         "Failed to retrieve psychologists for admin",
//         500
//       );
//     }
//   }
// );

// // Admin get single application/profile by id (any status)
// router.get(
//   "/admin/:id",
//   authenticate,
//   authorize("admin", "superadmin"),
//   async (req, res) => {
//     try {
//       const item = await Psychologist.findById(req.params.id);
//       if (!item) return errorResponse(res, "Psychologist not found", 404);
//       return successResponse(res, { psychologist: item });
//     } catch (error) {
//       logger.error("Admin get psychologist error:", error);
//       return errorResponse(res, "Failed to retrieve psychologist", 500);
//     }
//   }
// );

// // Admin change status; on selected create user and email credentials
// router.put(
//   "/:id/status",
//   authenticate,
//   authorize("admin", "superadmin"),
//   async (req, res) => {
//     try {
//       const { status } = req.body;
//       if (!["pending", "selected", "rejected"].includes(status)) {
//         return errorResponse(res, "Invalid status", 400);
//       }

//       const psychologist = await Psychologist.findById(req.params.id);
//       if (!psychologist)
//         return errorResponse(res, "Psychologist not found", 404);

//       let generatedPassword = null;

//       if (status === "selected" && psychologist.status !== "selected") {
//         // Create User account if not exists
//         const existingUser = await User.findOne({ email: psychologist.email });
//         if (!existingUser) {
//           // Generate strong temporary password
//           const crypto = require("crypto");
//           generatedPassword = `Kidman@${crypto.randomInt(100000, 999999)}`;

//           await User.create({
//             name: psychologist.name,
//             email: psychologist.email,
//             password: generatedPassword,
//             contact: psychologist.contactNumber,
//             age: 25,
//             role: "psychologist",
//             isEmailVerified: true,
//             isContactVerified: true,
//             isActive: true,
//           });
//         }

//         psychologist.accountActivatedAt = new Date();
//       }

//       psychologist.status = status;
//       await psychologist.save();

//       // Send credentials if selected and we generated a password
//       if (generatedPassword) {
//         const emailService = require("../services/emailService");
//         await emailService.sendPsychologistCredentials(
//           psychologist.email,
//           psychologist.name,
//           generatedPassword
//         );
//       }

//       return successResponse(
//         res,
//         {
//           psychologist,
//           generatedPassword: generatedPassword || undefined,
//         },
//         "Status updated successfully"
//       );
//     } catch (error) {
//       logger.error("Admin update psychologist status error:", error);
//       return errorResponse(
//         res,
//         error.message || "Failed to update status",
//         500
//       );
//     }
//   }
// );
// router.post(
//   "/",
//   authenticate,
//   authorize("admin", "superadmin"),
//   async (req, res) => {
//     try {
//       const {
//         firstName,
//         lastName,
//         email,
//         password,
//         degree,
//         experience,
//         about,
//         specializations,
//         languages,
//         sessionRate,
//         city,
//         contactNumber,
//         role,
//         aadharNumber,
//         aadharDocument,
//         uploadDocuments,
//         schedule,
//         profileImage,
//       } = req.body;

//       if (
//         !firstName ||
//         !lastName ||
//         !email ||
//         !password ||
//         !degree ||
//         experience === undefined ||
//         !city ||
//         !contactNumber ||
//         !aadharNumber ||
//         !aadharDocument
//       ) {
//         return errorResponse(
//           res,
//           "firstName, lastName, email, password, degree, experience, city, contactNumber, aadharNumber, aadharDocument are required",
//           400
//         );
//       }

//       // Create user with psychologist role
//       const fullName = `${firstName} ${lastName}`.trim();
//       const existingUser = await User.findOne({ email });
//       if (existingUser) {
//         return errorResponse(res, "User already exists with this email", 409);
//       }

//       // Check if contact number already exists
//       const existingContact = await User.findOne({ contact: contactNumber });
//       if (existingContact) {
//         return errorResponse(
//           res,
//           "User already exists with this contact number",
//           409
//         );
//       }

//       // Check if aadhar number already exists
//       const existingAadhar = await Psychologist.findOne({ aadharNumber });
//       if (existingAadhar) {
//         return errorResponse(
//           res,
//           "Psychologist already exists with this Aadhar number",
//           409
//         );
//       }

//       const user = await User.create({
//         name: fullName,
//         email,
//         password,
//         contact: contactNumber,
//         age: 25,
//         role: "psychologist",
//         isEmailVerified: true,
//         isContactVerified: true,
//         isActive: true,
//       });

//       // Create psychologist profile
//       const psychologist = await Psychologist.create({
//         name: fullName,
//         firstName,
//         lastName,
//         email,
//         degree,
//         experience,
//         about,
//         specializations,
//         languages,
//         sessionRate,
//         city,
//         contactNumber,
//         role: role || "psychologist",
//         aadharNumber,
//         aadharDocument,
//         uploadDocuments: uploadDocuments || [],
//         schedule: Array.isArray(schedule) ? schedule : [],
//         profileImage,
//         isActive: true,
//         status: "selected",
//         accountActivatedAt: new Date(),
//       });

//       // Send credentials via email
//       const emailService = require("../services/emailService");
//       await emailService.sendPsychologistCredentials(email, fullName, password);

//       return successResponse(
//         res,
//         { user, psychologist },
//         "Psychologist created and credentials emailed",
//         201
//       );
//     } catch (error) {
//       logger.error("Create psychologist error:", error);
//       return errorResponse(
//         res,
//         error.message || "Failed to create psychologist",
//         500
//       );
//     }
//   }
// );

// router.put(
//   "/:id([a-fA-F0-9]{24})",
//   authenticate,
//   authorize("admin", "superadmin"),
//   async (req, res) => {
//     try {
//       const psychologist = await Psychologist.findByIdAndUpdate(
//         req.params.id,
//         req.body,
//         { new: true, runValidators: true }
//       );

//       if (!psychologist) {
//         return errorResponse(res, "Psychologist not found", 404);
//       }

//       return successResponse(
//         res,
//         { psychologist },
//         "Psychologist updated successfully"
//       );
//     } catch (error) {
//       logger.error("Update psychologist error:", error);
//       return errorResponse(res, "Failed to update psychologist", 500);
//     }
//   }
// );

// router.delete(
//   "/:id([a-fA-F0-9]{24})",
//   authenticate,
//   authorize("admin", "superadmin"),
//   async (req, res) => {
//     try {
//       const psychologist = await Psychologist.findByIdAndUpdate(
//         req.params.id,
//         { isActive: false },
//         { new: true }
//       );

//       if (!psychologist) {
//         return errorResponse(res, "Psychologist not found", 404);
//       }

//       // Also deactivate the user account
//       await User.findOneAndUpdate(
//         { email: psychologist.email },
//         { isActive: false }
//       );

//       return successResponse(
//         res,
//         null,
//         "Psychologist deactivated successfully"
//       );
//     } catch (error) {
//       logger.error("Delete psychologist error:", error);
//       return errorResponse(res, "Failed to deactivate psychologist", 500);
//     }
//   }
// );

// // Route for psychologists to deactivate their own account
// router.delete(
//   "/profile/me",
//   authenticate,
//   authorize("psychologist"),
//   async (req, res) => {
//     try {
//       const psychologist = await Psychologist.findOneAndUpdate(
//         { email: req.user.email },
//         { isActive: false },
//         { new: true }
//       );

//       if (!psychologist) {
//         return errorResponse(res, "Psychologist profile not found", 404);
//       }

//       // Also deactivate the user account
//       await User.findByIdAndUpdate(req.user.id, { isActive: false });

//       return successResponse(res, null, "Account deactivated successfully");
//     } catch (error) {
//       logger.error("Deactivate psychologist account error:", error);
//       return errorResponse(res, "Failed to deactivate account", 500);
//     }
//   }
// );

// // get all slot of psychologists
// router.get("/:id/slots", async (req, res) => {
//   try {
//     const psychologist = await Psychologist.findOne({
//       _id: req.params.id,
//       isActive: true,
//       status: "selected",
//     }).select("name schedule");

//     if (!psychologist) {
//       return errorResponse(res, "Psychologist not found", 404);
//     }

//     const availableSlots = psychologist.schedule.filter(
//       (slot) => slot.isAvailable
//     );

//     return successResponse(res, {
//       psychologistId: psychologist._id,
//       psychologistName: psychologist.name,
//       totalSlots: psychologist.schedule.length,
//       availableSlotsCount: availableSlots.length,
//       slots: availableSlots,
//     });
//   } catch (error) {
//     logger.error("Get psychologist slots error:", error);
//     return errorResponse(res, "Failed to retrieve psychologist slots", 500);
//   }
// });

// // get slot by id of psychologists
// router.get("/:psychologistId/slots/:slotId", async (req, res) => {
//   try {
//     const { psychologistId, slotId } = req.params;

//     const psychologist = await Psychologist.findOne({
//       _id: psychologistId,
//       isActive: true,
//       status: "selected",
//     }).select("name schedule");

//     if (!psychologist) {
//       return errorResponse(res, "Psychologist not found", 404);
//     }

//     const slot = psychologist.schedule.id(slotId);

//     if (!slot) {
//       return errorResponse(res, "Slot not found", 404);
//     }

//     return successResponse(res, {
//       psychologistId: psychologist._id,
//       psychologistName: psychologist.name,
//       slot,
//     });
//   } catch (error) {
//     logger.error("Get psychologist slot by ID error:", error);
//     return errorResponse(res, "Failed to retrieve slot", 500);
//   }
// });

// // Update/Edit a specific slot (psychologist only)
// router.put(
//   "/profile/me/slots/:slotId",
//   authenticate,
//   authorize("psychologist"),
//   async (req, res) => {
//     try {
//       const { slotId } = req.params;
//       const { date, startTime, endTime, isAvailable } = req.body;

//       const psychologist = await Psychologist.findOne({
//         email: req.user.email,
//       });

//       if (!psychologist) {
//         return errorResponse(res, "Psychologist profile not found", 404);
//       }

//       // Find the slot
//       const slot = psychologist.schedule.id(slotId);
//       if (!slot) {
//         return errorResponse(res, "Slot not found", 404);
//       }

//       // Check if slot is booked (cannot edit booked slots)
//       if (!slot.isAvailable && isAvailable === undefined) {
//         return errorResponse(
//           res,
//           "Cannot edit a booked slot. You can only mark it as available again if booking is cancelled.",
//           400
//         );
//       }

//       // Check if there's a booking for this slot
//       const hasBooking = await Booking.findOne({
//         psychologist: psychologist._id,
//         slotDate: slot.date,
//         slotStartTime: slot.startTime,
//         slotEndTime: slot.endTime,
//         status: { $nin: ["cancelled"] },
//       });

//       if (hasBooking) {
//         return errorResponse(
//           res,
//           "Cannot edit this slot as it has an active booking",
//           400
//         );
//       }

//       // Update slot fields
//       if (date) slot.date = date;
//       if (startTime) slot.startTime = startTime;
//       if (endTime) slot.endTime = endTime;
//       if (isAvailable !== undefined) slot.isAvailable = isAvailable;

//       await psychologist.save();

//       return successResponse(
//         res,
//         { slot },
//         "Slot updated successfully"
//       );
//     } catch (error) {
//       logger.error("Update slot error:", error);
//       return errorResponse(res, "Failed to update slot", 500);
//     }
//   }
// );

// // Delete a specific slot (psychologist only)
// router.delete(
//   "/profile/me/slots/:slotId",
//   authenticate,
//   authorize("psychologist"),
//   async (req, res) => {
//     try {
//       const { slotId } = req.params;

//       const psychologist = await Psychologist.findOne({
//         email: req.user.email,
//       });

//       if (!psychologist) {
//         return errorResponse(res, "Psychologist profile not found", 404);
//       }

//       // Find the slot
//       const slot = psychologist.schedule.id(slotId);
//       if (!slot) {
//         return errorResponse(res, "Slot not found", 404);
//       }

//       // Check if slot is booked (cannot delete booked slots)
//       if (!slot.isAvailable) {
//         return errorResponse(
//           res,
//           "Cannot delete a booked slot. Please cancel the booking first.",
//           400
//         );
//       }

//       // Check if there's an active booking for this slot
//       const hasBooking = await Booking.findOne({
//         psychologist: psychologist._id,
//         slotDate: slot.date,
//         slotStartTime: slot.startTime,
//         slotEndTime: slot.endTime,
//         status: { $nin: ["cancelled"] },
//       });

//       if (hasBooking) {
//         return errorResponse(
//           res,
//           "Cannot delete this slot as it has an active booking",
//           400
//         );
//       }

//       // Remove slot from schedule array
//       psychologist.schedule.pull(slotId);
//       await psychologist.save();

//       return successResponse(
//         res,
//         null,
//         "Slot deleted successfully"
//       );
//     } catch (error) {
//       logger.error("Delete slot error:", error);
//       return errorResponse(res, "Failed to delete slot", 500);
//     }
//   }
// );

// // Admin: Delete any slot (admin/superadmin only)
// router.delete(
//   "/admin/:psychologistId/slots/:slotId",
//   authenticate,
//   authorize("admin", "superadmin"),
//   async (req, res) => {
//     try {
//       const { psychologistId, slotId } = req.params;

//       const psychologist = await Psychologist.findById(psychologistId);

//       if (!psychologist) {
//         return errorResponse(res, "Psychologist not found", 404);
//       }

//       const slot = psychologist.schedule.id(slotId);
//       if (!slot) {
//         return errorResponse(res, "Slot not found", 404);
//       }

//       // Admin can force delete even booked slots
//       psychologist.schedule.pull(slotId);
//       await psychologist.save();

//       return successResponse(
//         res,
//         null,
//         "Slot deleted successfully by admin"
//       );
//     } catch (error) {
//       logger.error("Admin delete slot error:", error);
//       return errorResponse(res, "Failed to delete slot", 500);
//     }
//   }
// );

// // Get sessions for authenticated psychologist (Sessions page)
// router.get(
//   "/sessions/me",
//   authenticate,
//   authorize("psychologist"),
//   async (req, res) => {
//     try {
//       // Get psychologist by email
//       const psychologist = await Psychologist.findOne({
//         email: req.user.email,
//       });

//       if (!psychologist) {
//         return errorResponse(res, "Psychologist profile not found", 404);
//       }

//       // Get all bookings for this psychologist
//       const allBookings = await Booking.find({
//         psychologist: psychologist._id,
//       })
//         .populate("user", "name email profile.avatar")
//         .sort({ slotDate: 1, slotStartTime: 1 });

//       // Calculate summary statistics
//       const today = new Date();
//       today.setHours(0, 0, 0, 0);

//       // Upcoming sessions (confirmed status, not rescheduled, slotDate >= today)
//       const upcomingBookings = allBookings.filter(
//         (booking) =>
//           booking.status === "confirmed" && new Date(booking.slotDate) >= today
//       );

//       // Rescheduled sessions that are upcoming (for upcoming tab)
//       const upcomingRescheduledBookings = allBookings.filter(
//         (booking) =>
//           booking.status === "rescheduled" &&
//           new Date(booking.slotDate) >= today
//       );

//       // All upcoming (confirmed + rescheduled upcoming)
//       const allUpcomingBookings = [
//         ...upcomingBookings,
//         ...upcomingRescheduledBookings,
//       ];

//       const upcomingCount = allUpcomingBookings.length;
//       const upcomingPaid = allUpcomingBookings.filter(
//         (b) => b.paymentStatus === "paid"
//       ).length;
//       const upcomingFree = upcomingCount - upcomingPaid;

//       // Completed sessions
//       const completedBookings = allBookings.filter(
//         (booking) => booking.status === "completed"
//       );
//       const completedCount = completedBookings.length;

//       // All rescheduled sessions (both past and future)
//       const rescheduledBookings = allBookings.filter(
//         (booking) => booking.status === "rescheduled"
//       );
//       const rescheduledCount = rescheduledBookings.length;

//       // Calculate revenue from completed paid sessions (after 10% commission)
//       // Note: Based on UI, this might be for completed sessions, not rescheduled
//       const completedRevenue = completedBookings.reduce((sum, booking) => {
//         if (booking.paymentStatus === "paid") {
//           return sum + booking.sessionRate * 0.9; // 10% commission deducted
//         }
//         return sum;
//       }, 0);

//       // Format sessions for response
//       const formatSession = (booking) => {
//         const slotDate = new Date(booking.slotDate);
//         const dateStr = slotDate.toLocaleDateString("en-GB", {
//           day: "2-digit",
//           month: "short",
//           year: "numeric",
//         });

//         // Calculate duration in minutes
//         const startTime = booking.slotStartTime.split(":").map(Number);
//         const endTime = booking.slotEndTime.split(":").map(Number);
//         const startMinutes = startTime[0] * 60 + startTime[1];
//         const endMinutes = endTime[0] * 60 + endTime[1];
//         const duration = endMinutes - startMinutes;

//         // Format time (convert 24h to 12h with AM/PM)
//         const timeStr = (() => {
//           const [hours, minutes] = booking.slotStartTime.split(":").map(Number);
//           const period = hours >= 12 ? "PM" : "AM";
//           const displayHours = hours % 12 || 12;
//           return `${displayHours.toString().padStart(2, "0")}:${minutes
//             .toString()
//             .padStart(2, "0")} ${period}`;
//         })();

//         return {
//           _id: booking._id,
//           patient: {
//             _id: booking.user._id,
//             name: booking.user.name || "Unknown",
//             avatar: booking.user.profile?.avatar || null,
//             email: booking.user.email,
//           },
//           sessionType: "Video Call",
//           isVideoCall: true,
//           duration: duration,
//           durationText: `${duration} min`,
//           date: dateStr,
//           time: timeStr,
//           slotDate: booking.slotDate,
//           slotStartTime: booking.slotStartTime,
//           slotEndTime: booking.slotEndTime,
//           meetingLink: getMeetingLink(booking),
//           status: booking.status,
//           paymentStatus: booking.paymentStatus,
//           sessionStatus: booking.sessionStatus,
//           sessionRate: booking.sessionRate,
//           notes: booking.notes,
//           rescheduleReason: booking.rescheduleReason || null,
//           rating: booking.rating || null,
//           feedback: booking.feedback || null,
//           createdAt: booking.createdAt,
//         };
//       };

//       // Group sessions by status
//       const upcomingSessions = allUpcomingBookings.map(formatSession);
//       const completedSessions = completedBookings.map(formatSession);
//       const rescheduledSessions = rescheduledBookings.map(formatSession);

//       // Summary cards data
//       const summary = {
//         upcoming: {
//           count: upcomingCount,
//           paid: upcomingPaid,
//           free: upcomingFree,
//         },
//         completed: {
//           count: completedCount,
//         },
//         rescheduled: {
//           count: rescheduledCount,
//           revenue: Math.round(completedRevenue), // Revenue from completed sessions after commission
//         },
//       };

//       return successResponse(res, {
//         summary,
//         sessions: {
//           upcoming: upcomingSessions,
//           completed: completedSessions,
//           rescheduled: rescheduledSessions,
//         },
//         counts: {
//           upcoming: upcomingSessions.length,
//           completed: completedSessions.length,
//           rescheduled: rescheduledSessions.length,
//         },
//       });
//     } catch (error) {
//       logger.error("Get psychologist sessions error:", error);
//       return errorResponse(res, "Failed to retrieve sessions", 500);
//     }
//   }
// );

// // Get psychologist history sessions (completed sessions)
// router.get(
//   "/sessions/me/history",
//   authenticate,
//   authorize("psychologist"),
//   async (req, res) => {
//     try {
//       // Get psychologist by email
//       const psychologist = await Psychologist.findOne({
//         email: req.user.email,
//       });

//       if (!psychologist) {
//         return errorResponse(res, "Psychologist profile not found", 404);
//       }

//       const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
//       const limitRaw = parseInt(req.query.limit || "10", 10) || 10;
//       const limit = Math.min(Math.max(limitRaw, 1), 100);

//       // Get completed bookings for this psychologist
//       const query = {
//         psychologist: psychologist._id,
//         status: "completed",
//       };

//       const bookings = await Booking.find(query)
//         .populate("user", "name email contact profile.avatar")
//         .sort({ slotDate: -1, createdAt: -1 })
//         .limit(limit)
//         .skip((page - 1) * limit);

//       const total = await Booking.countDocuments(query);

//       // Format sessions for response
//       const formatSession = (booking) => {
//         const slotDate = new Date(booking.slotDate);
//         const dateStr = slotDate.toLocaleDateString("en-GB", {
//           day: "2-digit",
//           month: "short",
//           year: "numeric",
//         });

//         // Calculate duration in minutes
//         const startTime = booking.slotStartTime.split(":").map(Number);
//         const endTime = booking.slotEndTime.split(":").map(Number);
//         const startMinutes = startTime[0] * 60 + startTime[1];
//         const endMinutes = endTime[0] * 60 + endTime[1];
//         const duration = endMinutes - startMinutes;

//         // Format time (convert 24h to 12h with AM/PM)
//         const timeStr = (() => {
//           const [hours, minutes] = booking.slotStartTime.split(":").map(Number);
//           const period = hours >= 12 ? "PM" : "AM";
//           const displayHours = hours % 12 || 12;
//           return `${displayHours.toString().padStart(2, "0")}:${minutes
//             .toString()
//             .padStart(2, "0")} ${period}`;
//         })();

//         return {
//           _id: booking._id,
//           patient: {
//             _id: booking.user._id,
//             name: booking.user.name || "Unknown",
//             email: booking.user.email,
//             contact: booking.user.contact || null,
//             avatar: booking.user.profile?.avatar || null,
//           },
//           sessionType: "Video Call",
//           isVideoCall: true,
//           duration: duration,
//           durationText: `${duration} min`,
//           date: dateStr,
//           time: timeStr,
//           slotDate: booking.slotDate,
//           slotStartTime: booking.slotStartTime,
//           slotEndTime: booking.slotEndTime,
//           meetingLink: getMeetingLink(booking),
//           status: booking.status,
//           paymentStatus: booking.paymentStatus,
//           sessionStatus: booking.sessionStatus,
//           sessionRate: booking.sessionRate,
//           notes: booking.notes,
//           rating: booking.rating || null,
//           feedback: booking.feedback || null,
//           createdAt: booking.createdAt,
//           updatedAt: booking.updatedAt,
//         };
//       };

//       const historySessions = bookings.map(formatSession);

//       return successResponse(res, {
//         sessions: historySessions,
//         pagination: {
//           currentPage: page,
//           totalPages: Math.ceil(total / limit),
//           totalItems: total,
//         },
//       });
//     } catch (error) {
//       logger.error("Get psychologist history sessions error:", error);
//       return errorResponse(res, "Failed to retrieve history sessions", 500);
//     }
//   }
// );

// // Get session report (downloadable)
// router.get(
//   "/sessions/:sessionId/report",
//   authenticate,
//   authorize("psychologist", "admin", "superadmin"),
//   async (req, res) => {
//     try {
//       const { sessionId } = req.params;
//       const format = req.query.format || "json"; // json or html

//       // Get booking/session
//       let booking;

//       if (req.user.role === "psychologist") {
//         // Psychologist can only access their own sessions
//         const psychologist = await Psychologist.findOne({
//           email: req.user.email,
//         });

//         if (!psychologist) {
//           return errorResponse(res, "Psychologist profile not found", 404);
//         }

//         booking = await Booking.findOne({
//           _id: sessionId,
//           psychologist: psychologist._id,
//         })
//           .populate("user", "name email contact age profile")
//           .populate(
//             "psychologist",
//             "name email degree specializations city contactNumber"
//           );
//       } else {
//         // Admin/Superadmin can access any session
//         booking = await Booking.findById(sessionId)
//           .populate("user", "name email contact age profile")
//           .populate(
//             "psychologist",
//             "name email degree specializations city contactNumber"
//           );
//       }

//       if (!booking) {
//         return errorResponse(res, "Session not found", 404);
//       }

//       // Format dates and times
//       const slotDate = new Date(booking.slotDate);
//       const dateStr = slotDate.toLocaleDateString("en-GB", {
//         day: "2-digit",
//         month: "long",
//         year: "numeric",
//       });

//       const [startHours, startMinutes] = booking.slotStartTime
//         .split(":")
//         .map(Number);
//       const [endHours, endMinutes] = booking.slotEndTime.split(":").map(Number);
//       const startPeriod = startHours >= 12 ? "PM" : "AM";
//       const endPeriod = endHours >= 12 ? "PM" : "AM";
//       const displayStartHours = startHours % 12 || 12;
//       const displayEndHours = endHours % 12 || 12;
//       const timeStr = `${displayStartHours
//         .toString()
//         .padStart(2, "0")}:${startMinutes
//         .toString()
//         .padStart(2, "0")} ${startPeriod} - ${displayEndHours
//         .toString()
//         .padStart(2, "0")}:${endMinutes
//         .toString()
//         .padStart(2, "0")} ${endPeriod}`;

//       const startMin = startHours * 60 + startMinutes;
//       const endMin = endHours * 60 + endMinutes;
//       const duration = endMin - startMin;

//       // Build report data
//       const reportData = {
//         reportType: "Session Report",
//         generatedAt: new Date().toISOString(),
//         session: {
//           sessionId: booking._id.toString(),
//           date: dateStr,
//           time: timeStr,
//           duration: `${duration} minutes`,
//           status: booking.status,
//           sessionStatus: booking.sessionStatus,
//           paymentStatus: booking.paymentStatus,
//           sessionRate: booking.sessionRate,
//           meetingLink: booking.meetingLink || "Not provided",
//         },
//         psychologist: {
//           name: booking.psychologist.name,
//           email: booking.psychologist.email,
//           degree: booking.psychologist.degree,
//           specializations: booking.psychologist.specializations || [],
//           city: booking.psychologist.city,
//           contactNumber: booking.psychologist.contactNumber,
//         },
//         patient: {
//           name: booking.user.name,
//           email: booking.user.email,
//           contact: booking.user.contact || "Not provided",
//           age: booking.user.age || "Not provided",
//         },
//         sessionDetails: {
//           notes: booking.notes || "No notes available",
//           rating: booking.rating || "Not rated",
//           feedback: booking.feedback || "No feedback provided",
//           rescheduleReason: booking.rescheduleReason || null,
//           cancellationReason: booking.cancellationReason || null,
//         },
//         prescription: booking.prescription
//           ? {
//               title: booking.prescription.title || "Prescription",
//               medications: booking.prescription.medications || [],
//               advice: booking.prescription.advice || null,
//               followUpDate: booking.prescription.followUpDate || null,
//               updatedAt: booking.prescription.updatedAt || booking.updatedAt,
//             }
//           : null,
//         timestamps: {
//           createdAt: booking.createdAt,
//           updatedAt: booking.updatedAt,
//           slotDate: booking.slotDate,
//         },
//       };

//       if (format === "html") {
//         // Generate HTML report
//         const htmlReport = `
// <!DOCTYPE html>
// <html lang="en">
// <head>
//   <meta charset="UTF-8">
//   <meta name="viewport" content="width=device-width, initial-scale=1.0">
//   <title>Session Report - ${reportData.session.sessionId}</title>
//   <style>
//     body {
//       font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
//       margin: 0;
//       padding: 40px;
//       background-color: #f5f7fa;
//       color: #1a202c;
//     }
//     .container {
//       max-width: 800px;
//       margin: 0 auto;
//       background: white;
//       padding: 40px;
//       border-radius: 12px;
//       box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
//     }
//     .header {
//       border-bottom: 3px solid #667eea;
//       padding-bottom: 20px;
//       margin-bottom: 30px;
//     }
//     .header h1 {
//       color: #667eea;
//       margin: 0 0 10px 0;
//       font-size: 28px;
//     }
//     .header p {
//       color: #718096;
//       margin: 0;
//       font-size: 14px;
//     }
//     .section {
//       margin-bottom: 30px;
//     }
//     .section-title {
//       color: #2d3748;
//       font-size: 20px;
//       font-weight: 600;
//       margin-bottom: 15px;
//       padding-bottom: 10px;
//       border-bottom: 2px solid #e2e8f0;
//     }
//     .info-grid {
//       display: grid;
//       grid-template-columns: 1fr 1fr;
//       gap: 15px;
//       margin-bottom: 15px;
//     }
//     .info-item {
//       padding: 12px;
//       background: #f7fafc;
//       border-radius: 8px;
//     }
//     .info-label {
//       font-size: 12px;
//       color: #718096;
//       text-transform: uppercase;
//       letter-spacing: 0.5px;
//       margin-bottom: 5px;
//     }
//     .info-value {
//       font-size: 16px;
//       color: #1a202c;
//       font-weight: 600;
//     }
//     .full-width {
//       grid-column: 1 / -1;
//     }
//     .description-box {
//       background: #f7fafc;
//       padding: 15px;
//       border-radius: 8px;
//       border-left: 4px solid #667eea;
//       margin-top: 10px;
//     }
//     .footer {
//       margin-top: 40px;
//       padding-top: 20px;
//       border-top: 2px solid #e2e8f0;
//       text-align: center;
//       color: #718096;
//       font-size: 12px;
//     }
//     @media print {
//       body {
//         padding: 0;
//         background: white;
//       }
//       .container {
//         box-shadow: none;
//       }
//     }
//   </style>
// </head>
// <body>
//   <div class="container">
//     <div class="header">
//       <h1>Session Report</h1>
//       <p>Generated on ${new Date(reportData.generatedAt).toLocaleString(
//         "en-GB"
//       )}</p>
//     </div>

//     <div class="section">
//       <h2 class="section-title">Session Information</h2>
//       <div class="info-grid">
//         <div class="info-item">
//           <div class="info-label">Session ID</div>
//           <div class="info-value">${reportData.session.sessionId}</div>
//         </div>
//         <div class="info-item">
//           <div class="info-label">Date</div>
//           <div class="info-value">${reportData.session.date}</div>
//         </div>
//         <div class="info-item">
//           <div class="info-label">Time</div>
//           <div class="info-value">${reportData.session.time}</div>
//         </div>
//         <div class="info-item">
//           <div class="info-label">Duration</div>
//           <div class="info-value">${reportData.session.duration}</div>
//         </div>
//         <div class="info-item">
//           <div class="info-label">Status</div>
//           <div class="info-value">${reportData.session.status}</div>
//         </div>
//         <div class="info-item">
//           <div class="info-label">Payment Status</div>
//           <div class="info-value">${reportData.session.paymentStatus}</div>
//         </div>
//         <div class="info-item">
//           <div class="info-label">Session Rate</div>
//           <div class="info-value">₹${reportData.session.sessionRate}</div>
//         </div>
//         <div class="info-item">
//           <div class="info-label">Meeting Link</div>
//           <div class="info-value">${reportData.session.meetingLink}</div>
//         </div>
//       </div>
//     </div>

//     <div class="section">
//       <h2 class="section-title">Psychologist Details</h2>
//       <div class="info-grid">
//         <div class="info-item">
//           <div class="info-label">Name</div>
//           <div class="info-value">${reportData.psychologist.name}</div>
//         </div>
//         <div class="info-item">
//           <div class="info-label">Email</div>
//           <div class="info-value">${reportData.psychologist.email}</div>
//         </div>
//         <div class="info-item">
//           <div class="info-label">Degree</div>
//           <div class="info-value">${reportData.psychologist.degree}</div>
//         </div>
//         <div class="info-item">
//           <div class="info-label">City</div>
//           <div class="info-value">${reportData.psychologist.city}</div>
//         </div>
//         <div class="info-item">
//           <div class="info-label">Contact</div>
//           <div class="info-value">${reportData.psychologist.contactNumber}</div>
//         </div>
//         <div class="info-item full-width">
//           <div class="info-label">Specializations</div>
//           <div class="info-value">${
//             reportData.psychologist.specializations.join(", ") ||
//             "Not specified"
//           }</div>
//         </div>
//       </div>
//     </div>

//     <div class="section">
//       <h2 class="section-title">Patient Details</h2>
//       <div class="info-grid">
//         <div class="info-item">
//           <div class="info-label">Name</div>
//           <div class="info-value">${reportData.patient.name}</div>
//         </div>
//         <div class="info-item">
//           <div class="info-label">Email</div>
//           <div class="info-value">${reportData.patient.email}</div>
//         </div>
//         <div class="info-item">
//           <div class="info-label">Contact</div>
//           <div class="info-value">${reportData.patient.contact}</div>
//         </div>
//         <div class="info-item">
//           <div class="info-label">Age</div>
//           <div class="info-value">${reportData.patient.age}</div>
//         </div>
//       </div>
//     </div>

//     <div class="section">
//       <h2 class="section-title">Session Details</h2>
//       <div class="description-box">
//         <div class="info-label">Notes</div>
//         <div style="margin-top: 8px; color: #2d3748; line-height: 1.6;">${
//           reportData.sessionDetails.notes
//         }</div>
//       </div>
//       <div class="info-grid" style="margin-top: 15px;">
//         <div class="info-item">
//           <div class="info-label">Rating</div>
//           <div class="info-value">${reportData.sessionDetails.rating}</div>
//         </div>
//         <div class="info-item">
//           <div class="info-label">Feedback</div>
//           <div class="info-value">${reportData.sessionDetails.feedback}</div>
//         </div>
//       </div>
//       ${
//         reportData.sessionDetails.rescheduleReason
//           ? `
//       <div class="description-box" style="margin-top: 15px; border-left-color: #f59e0b;">
//         <div class="info-label">Reschedule Reason</div>
//         <div style="margin-top: 8px; color: #2d3748; line-height: 1.6;">${reportData.sessionDetails.rescheduleReason}</div>
//       </div>
//       `
//           : ""
//       }
//       ${
//         reportData.sessionDetails.cancellationReason
//           ? `
//       <div class="description-box" style="margin-top: 15px; border-left-color: #f56565;">
//         <div class="info-label">Cancellation Reason</div>
//         <div style="margin-top: 8px; color: #2d3748; line-height: 1.6;">${reportData.sessionDetails.cancellationReason}</div>
//       </div>
//       `
//           : ""
//       }
//     </div>

//     ${
//       reportData.prescription
//         ? `
//     <div class="section">
//       <h2 class="section-title">Prescription</h2>
//       <div class="info-grid">
//         <div class="info-item">
//           <div class="info-label">Title</div>
//           <div class="info-value">${reportData.prescription.title}</div>
//         </div>
//         ${
//           reportData.prescription.followUpDate
//             ? `
//         <div class="info-item">
//           <div class="info-label">Follow-up Date</div>
//           <div class="info-value">${new Date(
//             reportData.prescription.followUpDate
//           ).toLocaleDateString("en-GB")}</div>
//         </div>
//         `
//             : ""
//         }
//       </div>
//       ${
//         reportData.prescription.medications &&
//         reportData.prescription.medications.length
//           ? `
//       <div class="description-box" style="border-left-color: #4299e1;">
//         <div class="info-label">Medications</div>
//         <div style="margin-top: 12px;">
//           <ul style="padding-left: 18px; margin: 0; color: #2d3748; line-height: 1.6;">
//             ${reportData.prescription.medications
//               .map(
//                 (m) => `
//               <li style="margin-bottom: 10px;">
//                 <strong>${m.name || "Medication"}</strong><br/>
//                 ${m.dosage ? `Dosage: ${m.dosage}<br/>` : ""}
//                 ${m.frequency ? `Frequency: ${m.frequency}<br/>` : ""}
//                 ${m.duration ? `Duration: ${m.duration}<br/>` : ""}
//                 ${m.notes ? `Notes: ${m.notes}` : ""}
//               </li>
//             `
//               )
//               .join("")}
//           </ul>
//         </div>
//       </div>
//       `
//           : ""
//       }
//       ${
//         reportData.prescription.advice
//           ? `
//       <div class="description-box" style="margin-top: 15px; border-left-color: #48bb78;">
//         <div class="info-label">Advice</div>
//         <div style="margin-top: 8px; color: #2d3748; line-height: 1.6;">${reportData.prescription.advice}</div>
//       </div>
//       `
//           : ""
//       }
//     </div>
//     `
//         : ""
//     }

//     <div class="footer">
//       <p>© ${new Date().getFullYear()} Manmitr. All rights reserved.</p>
//       <p>This is an official session report generated by Manmitr platform.</p>
//     </div>
//   </div>
// </body>
// </html>
//         `;

//         res.setHeader("Content-Type", "text/html");
//         res.setHeader(
//           "Content-Disposition",
//           `attachment; filename="session-report-${sessionId}.html"`
//         );
//         return res.send(htmlReport);
//       } else {
//         // Return JSON report
//         res.setHeader("Content-Type", "application/json");
//         res.setHeader(
//           "Content-Disposition",
//           `attachment; filename="session-report-${sessionId}.json"`
//         );
//         return res.json(reportData);
//       }
//     } catch (error) {
//       logger.error("Get session report error:", error);
//       return errorResponse(res, "Failed to generate session report", 500);
//     }
//   }
// );

// // Add or update prescription for a session (psychologist)
// router.put(
//   "/sessions/:sessionId/prescription",
//   authenticate,
//   authorize("psychologist"),
//   async (req, res) => {
//     try {
//       const { sessionId } = req.params;
//       const { title, medications, advice, followUpDate } = req.body;

//       // Psychologist context
//       const psychologist = await Psychologist.findOne({
//         email: req.user.email,
//       });

//       if (!psychologist) {
//         return errorResponse(res, "Psychologist profile not found", 404);
//       }

//       const booking = await Booking.findOne({
//         _id: sessionId,
//         psychologist: psychologist._id,
//       });

//       if (!booking) {
//         return errorResponse(res, "Session not found", 404);
//       }

//       // Basic validation for medications array
//       if (medications && !Array.isArray(medications)) {
//         return errorResponse(res, "medications must be an array", 400);
//       }

//       booking.prescription = {
//         title: title || booking.prescription?.title || "Prescription",
//         medications: medications || [],
//         advice: advice || booking.prescription?.advice || null,
//         followUpDate: followUpDate
//           ? new Date(followUpDate)
//           : booking.prescription?.followUpDate || null,
//         updatedAt: new Date(),
//       };

//       await booking.save();

//       const populatedBooking = await Booking.findById(booking._id)
//         .populate("user", "name email contact")
//         .populate("psychologist", "name email");

//       return successResponse(
//         res,
//         { booking: populatedBooking },
//         "Prescription saved"
//       );
//     } catch (error) {
//       logger.error("Save prescription error:", error);
//       return errorResponse(res, "Failed to save prescription", 500);
//     }
//   }
// );

// // Get psychologist history sessions by psychologist ID (for superadmin/admin)
// router.get(
//   "/sessions/history/:psychologistId",
//   authenticate,
//   authorize("admin", "superadmin"),
//   async (req, res) => {
//     try {
//       const { psychologistId } = req.params;

//       // Verify psychologist exists
//       const psychologist = await Psychologist.findById(psychologistId);

//       if (!psychologist) {
//         return errorResponse(res, "Psychologist not found", 404);
//       }

//       const page = Math.max(parseInt(req.query.page || "1", 10) || 1, 1);
//       const limitRaw = parseInt(req.query.limit || "10", 10) || 10;
//       const limit = Math.min(Math.max(limitRaw, 1), 100);

//       // Get completed bookings for this psychologist
//       const query = {
//         psychologist: psychologistId,
//         status: "completed",
//       };

//       const bookings = await Booking.find(query)
//         .populate("user", "name email contact profile.avatar")
//         .sort({ slotDate: -1, createdAt: -1 })
//         .limit(limit)
//         .skip((page - 1) * limit);

//       const total = await Booking.countDocuments(query);

//       // Format sessions for response
//       const formatSession = (booking) => {
//         const slotDate = new Date(booking.slotDate);
//         const dateStr = slotDate.toLocaleDateString("en-GB", {
//           day: "2-digit",
//           month: "short",
//           year: "numeric",
//         });

//         // Calculate duration in minutes
//         const startTime = booking.slotStartTime.split(":").map(Number);
//         const endTime = booking.slotEndTime.split(":").map(Number);
//         const startMinutes = startTime[0] * 60 + startTime[1];
//         const endMinutes = endTime[0] * 60 + endTime[1];
//         const duration = endMinutes - startMinutes;

//         // Format time (convert 24h to 12h with AM/PM)
//         const timeStr = (() => {
//           const [hours, minutes] = booking.slotStartTime.split(":").map(Number);
//           const period = hours >= 12 ? "PM" : "AM";
//           const displayHours = hours % 12 || 12;
//           return `${displayHours.toString().padStart(2, "0")}:${minutes
//             .toString()
//             .padStart(2, "0")} ${period}`;
//         })();

//         // Build prescription summary (same style as report)
//         const prescription = booking.prescription
//           ? {
//               title: booking.prescription.title || "Prescription",
//               medications: booking.prescription.medications || [],
//               advice: booking.prescription.advice || null,
//               followUpDate: booking.prescription.followUpDate || null,
//               updatedAt:
//                 booking.prescription.updatedAt || booking.updatedAt || null,
//             }
//           : null;

//         return {
//           _id: booking._id,
//           patient: {
//             _id: booking.user._id,
//             name: booking.user.name || "Unknown",
//             email: booking.user.email,
//             contact: booking.user.contact || null,
//             avatar: booking.user.profile?.avatar || null,
//           },
//           psychologist: {
//             _id: psychologist._id,
//             name: psychologist.name,
//             email: psychologist.email,
//           },
//           sessionType: "Video Call",
//           isVideoCall: true,
//           duration: duration,
//           durationText: `${duration} min`,
//           date: dateStr,
//           time: timeStr,
//           slotDate: booking.slotDate,
//           slotStartTime: booking.slotStartTime,
//           slotEndTime: booking.slotEndTime,
//           meetingLink: getMeetingLink(booking),
//           status: booking.status,
//           paymentStatus: booking.paymentStatus,
//           sessionStatus: booking.sessionStatus,
//           sessionRate: booking.sessionRate,
//           notes: booking.notes,
//           rating: booking.rating || null,
//           feedback: booking.feedback || null,
//           rescheduleReason: booking.rescheduleReason || null,
//           cancellationReason: booking.cancellationReason || null,
//           prescription,
//           createdAt: booking.createdAt,
//           updatedAt: booking.updatedAt,
//         };
//       };

//       const historySessions = bookings.map(formatSession);

//       return successResponse(res, {
//         psychologist: {
//           _id: psychologist._id,
//           name: psychologist.name,
//           email: psychologist.email,
//         },
//         sessions: historySessions,
//         pagination: {
//           currentPage: page,
//           totalPages: Math.ceil(total / limit),
//           totalItems: total,
//         },
//       });
//     } catch (error) {
//       logger.error("Get psychologist history sessions by ID error:", error);
//       return errorResponse(res, "Failed to retrieve history sessions", 500);
//     }
//   }
// );

// // Send booking confirmation email to user
// router.post(
//   "/bookings/:bookingId/send-confirmation-email",
//   authenticate,
//   authorize("psychologist", "admin", "superadmin"),
//   async (req, res) => {
//     try {
//       const { bookingId } = req.params;

//       // Get psychologist by email (if psychologist)
//       let psychologist;
//       if (req.user.role === "psychologist") {
//         psychologist = await Psychologist.findOne({
//           email: req.user.email,
//         });

//         if (!psychologist) {
//           return errorResponse(res, "Psychologist profile not found", 404);
//         }
//       }

//       // Get booking
//       const booking = await Booking.findById(bookingId)
//         .populate("user", "name email")
//         .populate("psychologist", "name");

//       if (!booking) {
//         return errorResponse(res, "Booking not found", 404);
//       }

//       // Check authorization - psychologist can only send for their own bookings
//       if (
//         req.user.role === "psychologist" &&
//         booking.psychologist._id.toString() !== psychologist._id.toString()
//       ) {
//         return errorResponse(
//           res,
//           "Unauthorized to send email for this booking",
//           403
//         );
//       }

//       // Check if booking is confirmed
//       if (booking.status !== "confirmed" && booking.status !== "completed") {
//         return errorResponse(
//           res,
//           "Email can only be sent for confirmed or completed bookings",
//           400
//         );
//       }

//       // Send confirmation email
//       await emailService.sendBookingConfirmationEmail(
//         booking.user.email,
//         booking.user.name,
//         booking.psychologist.name,
//         booking.slotDate,
//         booking.slotStartTime,
//         booking.slotEndTime,
//         booking.meetingLink || null,
//         booking.sessionRate || null
//       );

//       return successResponse(
//         res,
//         {
//           bookingId: booking._id,
//           userEmail: booking.user.email,
//           sentAt: new Date(),
//         },
//         "Booking confirmation email sent successfully"
//       );
//     } catch (error) {
//       logger.error("Send booking confirmation email error:", error);
//       return errorResponse(
//         res,
//         "Failed to send booking confirmation email",
//         500
//       );
//     }
//   }
// );

// module.exports = router;
