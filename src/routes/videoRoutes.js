const express = require("express");
const router = express.Router();
const videoController = require("../controllers/videoController");
const { uploadVideo } = require("../config/videoMulter");
const { authenticate } = require("../middlewares/auth"); 

router.post(
  "/",
  authenticate,
  uploadVideo.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  videoController.create
);

router.put(
  "/:id",
  authenticate,
  uploadVideo.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  videoController.update
);

router.patch("/:id/status", authenticate, videoController.setStatus);
router.delete("/:id", authenticate, videoController.remove);
router.get("/", videoController.list);
router.get("/admin", authenticate, videoController.adminList);

module.exports = router;
