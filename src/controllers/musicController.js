const path = require("path");
const fs = require("fs");
const MusicCategory = require("../models/MusicCategory");
const Music = require("../models/Music");
const { successResponse, errorResponse } = require("../utils/response");
const logger = require("../utils/logger");
const { getThumbnailUrl, getAudioUrl } = require("../utils/fileUrl");
const notificationEvents = require("../services/notificationEvents");

class MusicController {
  // Categories
  async createCategory(req, res) {
    try {
      const { name } = req.body;
      if (!name) return errorResponse(res, "Category name is required", 400);
      if (!req.file) return errorResponse(res, "Thumbnail is required", 400);

      // Store relative path instead of absolute path
      const relativePath = req.file.path
        .replace(/\\/g, "/")
        .replace(process.cwd(), "")
        .replace(/^\//, "");

      const category = await MusicCategory.create({
        name,
        thumbnailPath: relativePath,
        createdBy: req.user._id,
      });

      // Add thumbnailUrl to response
      const categoryWithUrl = {
        ...category.toObject(),
        thumbnailUrl: getThumbnailUrl(relativePath),
      };

      return successResponse(
        res,
        { category: categoryWithUrl },
        "Category created successfully",
        201
      );
    } catch (error) {
      logger.error("Create category error:", error);
      const message =
        error.code === 11000
          ? "Category name must be unique"
          : "Failed to create category";
      return errorResponse(res, message, 400);
    }
  }

  async updateCategory(req, res) {
    try {
      const { id } = req.params;
      const updates = {};
      if (req.body.name !== undefined) updates.name = req.body.name;
      if (req.file) {
        // Store relative path instead of absolute path
        const relativePath = req.file.path
          .replace(/\\/g, "/")
          .replace(process.cwd(), "")
          .replace(/^\//, "");
        updates.thumbnailPath = relativePath;
      }

      const category = await MusicCategory.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!category) return errorResponse(res, "Category not found", 404);

      // Add thumbnailUrl to response
      const categoryWithUrl = {
        ...category.toObject(),
        thumbnailUrl: getThumbnailUrl(category.thumbnailPath),
      };

      return successResponse(
        res,
        { category: categoryWithUrl },
        "Category updated successfully"
      );
    } catch (error) {
      logger.error("Update category error:", error);
      const message =
        error.code === 11000
          ? "Category name must be unique"
          : "Failed to update category";
      return errorResponse(res, message, 400);
    }
  }

  async deleteCategory(req, res) {
    try {
      const { id } = req.params;
      const category = await MusicCategory.findById(id);
      if (!category) return errorResponse(res, "Category not found", 404);

      // Delete music tracks in this category
      const tracks = await Music.find({ category: id });
      // Optionally remove files from disk (best-effort)
      tracks.forEach((t) => {
        if (t.audioPath) {
          fs.unlink(t.audioPath, () => {});
        }
      });

      await Music.deleteMany({ category: id });
      await MusicCategory.deleteOne({ _id: id });

      return successResponse(
        res,
        null,
        "Category and its music deleted successfully"
      );
    } catch (error) {
      logger.error("Delete category error:", error);
      return errorResponse(res, "Failed to delete category", 500);
    }
  }

  async getAllCategories(req, res) {
    try {
      const categories = await MusicCategory.find({}).sort({ createdAt: -1 });

      // Add thumbnailUrl to each category
      const categoriesWithUrls = categories.map((category) => ({
        ...category.toObject(),
        thumbnailUrl: getThumbnailUrl(category.thumbnailPath),
      }));

      return successResponse(
        res,
        { categories: categoriesWithUrls },
        "Categories retrieved successfully"
      );
    } catch (error) {
      logger.error("Get categories error:", error);
      return errorResponse(res, "Failed to retrieve categories", 500);
    }
  }

  // Music
  async getMusicByCategory(req, res) {
    try {
      const { categoryId } = req.params;
      const { includeInactive } = req.query;
      const category = await MusicCategory.findById(categoryId);
      if (!category) return errorResponse(res, "Category not found", 404);

      const query = { category: categoryId };
      if (!includeInactive || includeInactive === "false")
        query.isActive = true;

      const musics = await Music.find(query).sort({ createdAt: -1 });

      // Add audioUrl to each music
      const musicsWithUrls = musics.map((music) => ({
        ...music.toObject(),
        audioUrl: getAudioUrl(music.audioPath),
      }));

      return successResponse(
        res,
        { musics: musicsWithUrls },
        "Music retrieved successfully"
      );
    } catch (error) {
      logger.error("Get music by category error:", error);
      return errorResponse(res, "Failed to retrieve music", 500);
    }
  }

  async addMusic(req, res) {
    try {
      const { categoryId } = req.params;
      const { title, genre, audioUrl } = req.body;
      if (!title) return errorResponse(res, "Music title is required", 400);
      if (!audioUrl)
        return errorResponse(res, "audioUrl is required (external URL)", 400);

      const category = await MusicCategory.findById(categoryId);
      if (!category) return errorResponse(res, "Category not found", 404);

      const track = await Music.create({
        category: categoryId,
        title,
        genre,
        audioPath: audioUrl,
      });

      // Add audioUrl to response
      const trackWithUrl = {
        ...track.toObject(),
        audioUrl: getAudioUrl(track.audioPath),
      };

      notificationEvents
        .meditationPublished(trackWithUrl)
        .catch((error) =>
          logger.warn("Meditation notification error:", error.message)
        );

      return successResponse(
        res,
        { music: trackWithUrl },
        "Music added successfully",
        201
      );
    } catch (error) {
      logger.error("Add music error:", error);
      return errorResponse(res, "Failed to add music", 500);
    }
  }

  async addMusicBulk(req, res) {
    try {
      const { categoryId } = req.params;
      const { payload } = req.body; // optional titles/genres mapping by index

      const category = await MusicCategory.findById(categoryId);
      if (!category) return errorResponse(res, "Category not found", 404);

      if (!payload || !Array.isArray(payload) || payload.length === 0) {
        return errorResponse(
          res,
          "payload array of { title, genre, audioUrl } is required",
          400
        );
      }

      const tracks = await Promise.all(
        payload.map((item) => {
          const title = item?.title;
          const genre = item?.genre;
          const audioUrl = item?.audioUrl;
          if (!title || !audioUrl) return null;
          return Music.create({
            category: categoryId,
            title,
            genre,
            audioPath: audioUrl,
          });
        })
      );

      // Add audioUrl to each track
      const tracksWithUrls = tracks.map((track) => ({
        ...track.toObject(),
        audioUrl: getAudioUrl(track.audioPath),
      }));

      if (tracksWithUrls.length) {
        notificationEvents
          .meditationPublished({
            ...tracksWithUrls[0],
            title: `${tracksWithUrls.length} new sessions`,
          })
          .catch((error) =>
            logger.warn("Bulk meditation notification error:", error.message)
          );
      }

      return successResponse(
        res,
        { musics: tracksWithUrls },
        "Bulk music uploaded successfully",
        201
      );
    } catch (error) {
      logger.error("Bulk add music error:", error);
      return errorResponse(res, "Failed to bulk upload music", 500);
    }
  }

  async updateMusic(req, res) {
    try {
      const { id } = req.params; // music id
      const { title, genre } = req.body;
      const updates = {};
      if (title !== undefined) updates.title = title;
      if (genre !== undefined) updates.genre = genre;
      if (req.file) {
        // Store relative path instead of absolute path
        const relativePath = req.file.path
          .replace(/\\/g, "/")
          .replace(process.cwd(), "")
          .replace(/^\//, "");
        updates.audioPath = relativePath;
      }

      const music = await Music.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      );
      if (!music) return errorResponse(res, "Music not found", 404);

      // Add audioUrl to response
      const musicWithUrl = {
        ...music.toObject(),
        audioUrl: getAudioUrl(music.audioPath),
      };

      return successResponse(
        res,
        { music: musicWithUrl },
        "Music updated successfully"
      );
    } catch (error) {
      logger.error("Update music error:", error);
      return errorResponse(res, "Failed to update music", 500);
    }
  }

  async deleteMusic(req, res) {
    try {
      const { id } = req.params; // music id
      const music = await Music.findById(id);
      if (!music) return errorResponse(res, "Music not found", 404);

      if (music.audioPath) {
        fs.unlink(music.audioPath, () => {});
      }

      await Music.deleteOne({ _id: id });

      return successResponse(res, null, "Music deleted successfully");
    } catch (error) {
      logger.error("Delete music error:", error);
      return errorResponse(res, "Failed to delete music", 500);
    }
  } // <- This closing brace was missing

  async setMusicStatus(req, res) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      if (typeof isActive !== "boolean") {
        return errorResponse(res, "isActive (boolean) is required", 400);
      }

      const music = await Music.findByIdAndUpdate(
        id,
        { isActive },
        { new: true }
      );
      if (!music) return errorResponse(res, "Music not found", 404);

      // Add audioUrl to response
      const musicWithUrl = {
        ...music.toObject(),
        audioUrl: getAudioUrl(music.audioPath),
      };

      return successResponse(
        res,
        { music: musicWithUrl },
        "Music status updated successfully"
      );
    } catch (error) {
      logger.error("Set music status error:", error);
      return errorResponse(res, "Failed to update music status", 500);
    }
  }
}

module.exports = new MusicController();
