const fs = require('fs');
const ReelCategory = require('../models/ReelCategory');
const Reel = require('../models/Reel');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

class ReelController {
    // Categories
    async createCategory(req, res) {
        try {
            const { name } = req.body;
            if (!name) return errorResponse(res, 'Category name is required', 400);
            const category = await ReelCategory.create({ name, createdBy: req.user._id });
            return successResponse(res, { category }, 'Reel category created successfully', 201);
        } catch (error) {
            const message = error.code === 11000 ? 'Category name must be unique' : 'Failed to create category';
            logger.error('Create reel category error:', error);
            return errorResponse(res, message, 400);
        }
    }

    async updateCategory(req, res) {
        try {
            const { id } = req.params;
            const updates = {};
            if (req.body.name !== undefined) updates.name = req.body.name;
            if (req.body.isActive !== undefined) updates.isActive = req.body.isActive;
            const category = await ReelCategory.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
            if (!category) return errorResponse(res, 'Category not found', 404);
            return successResponse(res, { category }, 'Reel category updated successfully');
        } catch (error) {
            logger.error('Update reel category error:', error);
            return errorResponse(res, 'Failed to update category', 500);
        }
    }

    async deleteCategory(req, res) {
        try {
            const { id } = req.params;
            const category = await ReelCategory.findById(id);
            if (!category) return errorResponse(res, 'Category not found', 404);
            await Reel.deleteMany({ category: id });
            await ReelCategory.deleteOne({ _id: id });
            return successResponse(res, null, 'Reel category deleted successfully');
        } catch (error) {
            logger.error('Delete reel category error:', error);
            return errorResponse(res, 'Failed to delete category', 500);
        }
    }

    // Reels
    async createReel(req, res) {
        try {
            const { categoryId } = req.params;
            const { title, description } = req.body;
            if (!title) return errorResponse(res, 'Title is required', 400);
            if (!req.file) return errorResponse(res, 'Video is required', 400);
            const category = await ReelCategory.findById(categoryId);
            if (!category) return errorResponse(res, 'Category not found', 404);
            const reel = await Reel.create({
                category: categoryId,
                title,
                description,
                videoPath: req.file.path.replace(/\\/g, '/'),
                createdBy: req.user._id
            });
            return successResponse(res, { reel }, 'Reel created successfully', 201);
        } catch (error) {
            logger.error('Create reel error:', error);
            return errorResponse(res, 'Failed to create reel', 500);
        }
    }

    async updateReel(req, res) {
        try {
            const { id } = req.params;
            const { title, description } = req.body;
            const updates = {};
            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (req.file) updates.videoPath = req.file.path.replace(/\\/g, '/');
            const reel = await Reel.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
            if (!reel) return errorResponse(res, 'Reel not found', 404);
            return successResponse(res, { reel }, 'Reel updated successfully');
        } catch (error) {
            logger.error('Update reel error:', error);
            return errorResponse(res, 'Failed to update reel', 500);
        }
    }

    async deleteReel(req, res) {
        try {
            const { id } = req.params;
            const reel = await Reel.findById(id);
            if (!reel) return errorResponse(res, 'Reel not found', 404);
            if (reel.videoPath) fs.unlink(reel.videoPath, () => { });
            await Reel.deleteOne({ _id: id });
            return successResponse(res, null, 'Reel deleted successfully');
        } catch (error) {
            logger.error('Delete reel error:', error);
            return errorResponse(res, 'Failed to delete reel', 500);
        }
    }

    async listReels(req, res) {
        try {
            const reels = await Reel.find({ isActive: true }).sort({ createdAt: -1 }).populate('category', 'name');
            return successResponse(res, { reels }, 'Reels retrieved successfully');
        } catch (error) {
            logger.error('List reels error:', error);
            return errorResponse(res, 'Failed to retrieve reels', 500);
        }
    }

    async listByCategory(req, res) {
        try {
            const { categoryId } = req.params;
            const reels = await Reel.find({ category: categoryId, isActive: true }).sort({ createdAt: -1 });
            return successResponse(res, { reels }, 'Reels retrieved successfully');
        } catch (error) {
            logger.error('List reels by category error:', error);
            return errorResponse(res, 'Failed to retrieve reels', 500);
        }
    }

    async likeReel(req, res) {
        try {
            const { id } = req.params;
            const reel = await Reel.findByIdAndUpdate(id, { $inc: { likes: 1 } }, { new: true });
            if (!reel) return errorResponse(res, 'Reel not found', 404);
            return successResponse(res, { reel }, 'Reel liked');
        } catch (error) {
            logger.error('Like reel error:', error);
            return errorResponse(res, 'Failed to like reel', 500);
        }
    }
}

module.exports = new ReelController();


