const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const { authenticate, authorize } = require("../middlewares/auth");
const reelController = require("../controllers/reelController");

const router = express.Router();

const uploadsRoot = path.join(process.cwd(), "uploads");
const videosDir = path.join(uploadsRoot, "videos");
[uploadsRoot, videosDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, videosDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `reel_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});

function videoFilter(req, file, cb) {
  if (!file.mimetype.startsWith("video/"))
    return cb(new Error("Only video files allowed"), false);
  cb(null, true);
}

const uploadVideo = multer({
  storage,
  fileFilter: videoFilter,
  limits: { fileSize: 200 * 1024 * 1024 },
});

// Public routes
router.get("/", reelController.listReels);
router.get("/:id", reelController.getReelById);
router.post("/:id/like", authenticate, reelController.likeReel);

// Admin/Superadmin - reels
router.post(
  "/",
  authenticate,
  authorize("admin", "superadmin"),
  uploadVideo.single("video"),
  reelController.createReel
);
router.put(
  "/:id",
  authenticate,
  authorize("admin", "superadmin"),
  uploadVideo.single("video"),
  reelController.updateReel
);
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "superadmin"),
  reelController.deleteReel
);

module.exports = router;
