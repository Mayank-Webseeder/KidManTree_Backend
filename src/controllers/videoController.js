const fs = require("fs");
const Video = require("../models/Video");
const { successResponse, errorResponse } = require("../utils/response");
const logger = require("../utils/logger");

class VideoController {
  async create(req, res) {
    try {
      const { title, description, time } = req.body;
      if (!title) return errorResponse(res, "Title is required", 400);
      if (!req.files || !req.files.video)
        return errorResponse(res, "Video file is required", 400);

      let videoPath = req.files.video[0].path.replace(/\\/g, "/");
      const videoIdx = videoPath.indexOf("uploads/");
      if (videoIdx !== -1) videoPath = videoPath.substring(videoIdx);

      let thumbPath = null;
      if (req.files.thumbnail && req.files.thumbnail[0]) {
        thumbPath = req.files.thumbnail[0].path.replace(/\\/g, "/");
        const tIdx = thumbPath.indexOf("uploads/");
        if (tIdx !== -1) thumbPath = thumbPath.substring(tIdx);
      }

      const video = await Video.create({
        title,
        description,
        time,
        videoPath,
        thumbnailPath: thumbPath,
        createdBy: req.user._id,
      });

      return successResponse(
        res,
        { video: video.toObject() },
        "Video created successfully",
        201
      );
    } catch (error) {
      logger.error("Create video error:", error);
      return errorResponse(res, "Failed to create video", 500);
    }
  }

  async list(req, res) {
    try {
      const videos = await Video.find({ isActive: true })
        .sort({ createdAt: -1 })
        .populate("createdBy", "name email");

      return successResponse(
        res,
        { videos: videos.map((v) => v.toObject()) },
        "Videos retrieved successfully"
      );
    } catch (error) {
      logger.error("List videos error:", error);
      return errorResponse(res, "Failed to retrieve videos", 500);
    }
  }

  async adminList(req, res) {
    try {
      const { includeInactive } = req.query;
      const query =
        includeInactive && includeInactive !== "false"
          ? {}
          : { isActive: true };

      const videos = await Video.find(query)
        .sort({ createdAt: -1 })
        .populate("createdBy", "name email");

      return successResponse(
        res,
        { videos: videos.map((v) => v.toObject()) },
        "Videos retrieved successfully"
      );
    } catch (error) {
      logger.error("Admin list videos error:", error);
      return errorResponse(res, "Failed to retrieve videos", 500);
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { title, description, time, isActive } = req.body;
      const updates = {};

      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (time !== undefined) updates.time = time;
      if (isActive !== undefined) updates.isActive = isActive;

      if (req.files && req.files.video && req.files.video[0]) {
        let videoPath = req.files.video[0].path.replace(/\\/g, "/");
        const idx = videoPath.indexOf("uploads/");
        if (idx !== -1) videoPath = videoPath.substring(idx);
        updates.videoPath = videoPath;
      }

      if (req.files && req.files.thumbnail && req.files.thumbnail[0]) {
        let thumbPath = req.files.thumbnail[0].path.replace(/\\/g, "/");
        const idx = thumbPath.indexOf("uploads/");
        if (idx !== -1) thumbPath = thumbPath.substring(idx);
        updates.thumbnailPath = thumbPath;
      }

      const video = await Video.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!video) return errorResponse(res, "Video not found", 404);

      return successResponse(
        res,
        { video: video.toObject() },
        "Video updated successfully"
      );
    } catch (error) {
      logger.error("Update video error:", error);
      return errorResponse(res, "Failed to update video", 500);
    }
  }

  async setStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      if (typeof isActive !== "boolean")
        return errorResponse(res, "isActive (boolean) is required", 400);

      const video = await Video.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
      );
      if (!video) return errorResponse(res, "Video not found", 404);

      return successResponse(
        res,
        { video: video.toObject() },
        "Video status updated successfully"
      );
    } catch (error) {
      logger.error("Set video status error:", error);
      return errorResponse(res, "Failed to update video status", 500);
    }
  }

  async remove(req, res) {
    try {
      const { id } = req.params;
      const video = await Video.findById(id);
      if (!video) return errorResponse(res, "Video not found", 404);

      if (video.videoPath) fs.unlink(video.videoPath, () => {});
      if (video.thumbnailPath) fs.unlink(video.thumbnailPath, () => {});

      await Video.deleteOne({ _id: id });

      return successResponse(res, null, "Video deleted successfully");
    } catch (error) {
      logger.error("Delete video error:", error);
      return errorResponse(res, "Failed to delete video", 500);
    }
  }
}

module.exports = new VideoController();
