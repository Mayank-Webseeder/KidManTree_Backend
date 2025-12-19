const multer = require("multer");
const path = require("path");
const fs = require("fs");

const VIDEO_DIR = "uploads/videos";
const THUMB_DIR = "uploads/video_thumbnails";

// Create directories
[VIDEO_DIR, THUMB_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "video") {
      cb(null, VIDEO_DIR);
    } else if (file.fieldname === "thumbnail") {
      cb(null, THUMB_DIR);
    } else {
      cb(null, "uploads/others");
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = file.fieldname === "video" ? "video_" : "video_thumb_";
    const uniqueName = `${base}${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.fieldname === "video") {
    if (!file.mimetype.startsWith("video/")) {
      return cb(new Error("Only video files allowed"), false);
    }
  }
  if (file.fieldname === "thumbnail") {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files allowed"), false);
    }
  }
  cb(null, true);
};

const uploadVideo = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB
  },
});

module.exports = { uploadVideo };
