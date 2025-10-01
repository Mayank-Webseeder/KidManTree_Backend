const Podcast = require('../models/Podcast');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

class PodcastController {
    async create(req, res) {
        try {
            const { title, time, youtubeLink } = req.body;
            if (!title || !youtubeLink) return errorResponse(res, 'title and youtubeLink are required', 400);
            if (!req.file) return errorResponse(res, 'thumbnail is required', 400);

            const podcast = await Podcast.create({
                title,
                time,
                youtubeLink,
                thumbnailPath: req.file.path.replace(/\\/g, '/'),
                createdBy: req.user._id
            });

            return successResponse(res, { podcast }, 'Podcast created successfully', 201);
        } catch (error) {
            logger.error('Create podcast error:', error);
            return errorResponse(res, 'Failed to create podcast', 500);
        }
    }

    async list(req, res) {
        try {
            const podcasts = await Podcast.find({ isActive: true }).sort({ createdAt: -1 });
            return successResponse(res, { podcasts }, 'Podcasts retrieved successfully');
        } catch (error) {
            logger.error('List podcast error:', error);
            return errorResponse(res, 'Failed to retrieve podcasts', 500);
        }
    }

    async adminList(req, res) {
        try {
            const { includeInactive } = req.query;
            const query = includeInactive && includeInactive !== 'false' ? {} : { isActive: true };
            const podcasts = await Podcast.find(query).sort({ createdAt: -1 });
            return successResponse(res, { podcasts }, 'Podcasts retrieved successfully');
        } catch (error) {
            logger.error('Admin list podcast error:', error);
            return errorResponse(res, 'Failed to retrieve podcasts', 500);
        }
    }

    async update(req, res) {
        try {
            const { id } = req.params;
            const updates = {};
            const { title, time, youtubeLink } = req.body;
            if (title !== undefined) updates.title = title;
            if (time !== undefined) updates.time = time;
            if (youtubeLink !== undefined) updates.youtubeLink = youtubeLink;
            if (req.file) updates.thumbnailPath = req.file.path.replace(/\\/g, '/');

            const podcast = await Podcast.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true });
            if (!podcast) return errorResponse(res, 'Podcast not found', 404);

            return successResponse(res, { podcast }, 'Podcast updated successfully');
        } catch (error) {
            logger.error('Update podcast error:', error);
            return errorResponse(res, 'Failed to update podcast', 500);
        }
    }

    async setStatus(req, res) {
        try {
            const { id } = req.params;
            const { isActive } = req.body;
            if (typeof isActive !== 'boolean') return errorResponse(res, 'isActive (boolean) is required', 400);
            const podcast = await Podcast.findByIdAndUpdate(id, { isActive }, { new: true });
            if (!podcast) return errorResponse(res, 'Podcast not found', 404);
            return successResponse(res, { podcast }, 'Podcast status updated successfully');
        } catch (error) {
            logger.error('Set podcast status error:', error);
            return errorResponse(res, 'Failed to update podcast status', 500);
        }
    }

    async remove(req, res) {
        try {
            const { id } = req.params;
            const podcast = await Podcast.findById(id);
            if (!podcast) return errorResponse(res, 'Podcast not found', 404);
            await Podcast.deleteOne({ _id: id });
            return successResponse(res, null, 'Podcast deleted successfully');
        } catch (error) {
            logger.error('Delete podcast error:', error);
            return errorResponse(res, 'Failed to delete podcast', 500);
        }
    }
}

module.exports = new PodcastController();


