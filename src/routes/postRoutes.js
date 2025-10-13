const express = require("express");
const postController = require("../controllers/postController");
const { authenticate, optionalAuth } = require("../middlewares/auth");

const router = express.Router();

router.get("/", authenticate, postController.getPosts);
router.get("/:id", authenticate, postController.getPost);
router.get("/:id/comments", authenticate, postController.getComments);

// Protected routes
router.post("/", authenticate, postController.createPost);
router.put("/:id", authenticate, postController.updatePost);
router.delete("/:id", authenticate, postController.deletePost);
router.post("/:id/like", authenticate, postController.likePost);
router.post("/:id/comments", authenticate, postController.addComment);

module.exports = router;
