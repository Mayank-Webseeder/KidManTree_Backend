const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const postController = require("../controllers/postController");
const { authenticate, optionalAuth, authorize } = require("../middlewares/auth");

const router = express.Router();

// Ensure upload folder exists
const uploadsRoot = path.join(process.cwd(), "uploads");
const postImagesDir = path.join(uploadsRoot, "thumbnails");
[uploadsRoot, postImagesDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const postImageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, postImagesDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `post_${Date.now()}_${Math.random().toString(36).slice(2)}${ext}`);
  },
});

function imageFilter(req, file, cb) {
  if (!file.mimetype.startsWith("image/"))
    return cb(new Error("Only image files allowed"), false);
  cb(null, true);
}

const uploadPostImage = multer({
  storage: postImageStorage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

router.get("/", authenticate, postController.getPosts);
router.get("/:id", authenticate, postController.getPost);
router.get("/:id/comments", authenticate, postController.getComments);

// Protected routes
router.post(
  "/",
  authenticate,
  uploadPostImage.single("postImage"),
  postController.createPost
);
router.put(
  "/:id",
  authenticate,
  uploadPostImage.single("postImage"),
  postController.updatePost
);
router.delete("/:id", authenticate, postController.deletePost);
router.post("/:id/like", authenticate, postController.likePost);
router.post("/:id/comments", authenticate, postController.addComment);
router.get(
  "/admin/user/:userId/posts",
  authenticate,
  authorize("admin", "superadmin"),
  postController.getPostsByUserId
);

module.exports = router;
