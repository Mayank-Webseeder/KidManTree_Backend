const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const userController = require("../controllers/userController");
const { authenticate, authorize } = require("../middlewares/auth");

const router = express.Router();

// Ensure upload folders exist
const uploadsRoot = path.join(process.cwd(), "uploads");
const profileImagesDir = path.join(uploadsRoot, "profiles");
const docxDir = path.join(uploadsRoot, "docx");
[uploadsRoot, profileImagesDir, docxDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Multer storage configurations
const profileImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileImagesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(
      null,
      `avatar_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`
    );
  },
});

const docxStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, docxDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `docx_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});

function imageFilter(req, file, cb) {
  if (!file.mimetype.startsWith("image/"))
    return cb(new Error("Only image files allowed"), false);
  cb(null, true);
}

function docxFilter(req, file, cb) {
  // const allowedMimes = [
  //   "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
  //   "application/msword", // .doc
  // ];
  // if (!allowedMimes.includes(file.mimetype)) {
  //   return cb(new Error("Only DOCX files allowed"), false);
  // }
  cb(null, true);
}

const uploadProfileImage = multer({
  storage: profileImageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadDocx = multer({
  storage: docxStorage,
  fileFilter: docxFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const uploadFiles = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === "avatar") {
        cb(null, profileImagesDir);
      } else if (file.fieldname === "docx") {
        cb(null, docxDir);
      } else {
        cb(new Error("Invalid field name"), null);
      }
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const prefix = file.fieldname === "avatar" ? "avatar" : "docx";
      cb(
        null,
        `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`
      );
    },
  }),
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "avatar") {
      imageFilter(req, file, cb);
    } else if (file.fieldname === "docx") {
      docxFilter(req, file, cb);
    } else {
      cb(new Error("Invalid field name"), false);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
}).fields([
  { name: "avatar", maxCount: 1 },
  { name: "docx", maxCount: 1 },
]);

// All user routes require authentication
router.use(authenticate);

router.get("/profile", userController.getProfile);
router.put("/profile", userController.updateProfile);
router.put("/updateProfile/:id", uploadFiles, userController.updateProfileById);
router.post("/change-password", userController.changePassword);
router.put("/notifications", userController.updateNotificationPrefs);
router.post("/delete-account", userController.requestAccountDeletion);
router.post("/confirm-deletion", userController.confirmAccountDeletion);
router.get("/booking-history", userController.getBookingHistory);

// Admin/Superadmin management routes
router.get(
  "/admin/list",
  authorize("admin", "superadmin"),
  userController.adminListUsers
);
router.patch(
  "/admin/:id/status",
  authorize("admin", "superadmin"),
  userController.adminSetUserActiveStatus
);
router.put(
  "/admin/:id",
  authorize("admin", "superadmin"),
  userController.adminUpdateUserProfile
);
router.delete(
  "/admin/:id",
  authorize("admin", "superadmin"),
  userController.adminDeleteUserAndRole
);
router.get(
  "/user/userDetails/:id",
  authorize("admin", "superadmin"),
  userController.getUserDetails
);
router.patch(
  "/admin/:id/docx-verification",
  authorize("admin", "superadmin"),
  userController.adminUpdateDocxVerification
);

module.exports = router;
