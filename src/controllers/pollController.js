const Poll = require("../models/Poll");
const { successResponse, errorResponse } = require("../utils/response");
const logger = require("../utils/logger");

class PollController {
  // Get all public polls
  async getAllPolls(req, res) {
    try {
      const { page = 1, limit = 10, visibility = "public" } = req.query;
      const skip = (page - 1) * limit;

      const query = {
        isDeleted: false,
        isActive: true,
        visibility: visibility,
      };

      const polls = await Poll.find(query)
        .populate("creator", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Poll.countDocuments(query);

      return successResponse(
        res,
        {
          polls,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / limit),
            count: total,
          },
        },
        "Polls retrieved successfully"
      );
    } catch (error) {
      logger.error("Get all polls error:", error);
      return errorResponse(res, "Failed to retrieve polls", 500);
    }
  }

  // Get poll by ID
  async getPollById(req, res) {
    try {
      const { id } = req.params;

      const poll = await Poll.findOne({
        _id: id,
        isDeleted: false,
        isActive: true,
      })
        .populate("creator", "name email")
        .populate("options.votes.user", "name email");

      if (!poll) {
        return errorResponse(res, "Poll not found", 404);
      }

      return successResponse(res, { poll }, "Poll retrieved successfully");
    } catch (error) {
      logger.error("Get poll by ID error:", error);
      return errorResponse(res, "Failed to retrieve poll", 500);
    }
  }

  // Create new poll
  async createPoll(req, res) {
    try {
      const { question, options, visibility } = req.body;

      if (!question || !options || options.length < 2) {
        return errorResponse(
          res,
          "Question and at least 2 options are required",
          400
        );
      }

      if (options.length > 10) {
        return errorResponse(res, "Maximum 10 options allowed", 400);
      }

      const poll = await Poll.create({
        question,
        options: options.map((text) => ({ text, votes: [] })),
        creator: req.user._id,
        // Remove expiresAt completely - polls never expire
        visibility: visibility || "public",
      });

      await poll.populate("creator", "name email");

      return successResponse(res, { poll }, "Poll created successfully", 201);
    } catch (error) {
      logger.error("Create poll error:", error);
      return errorResponse(res, "Failed to create poll", 500);
    }
  }

  // Get user's own polls
  async getMyPolls(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const skip = (page - 1) * limit;

      const query = {
        creator: req.user._id,
        isDeleted: false,
      };

      const polls = await Poll.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Poll.countDocuments(query);

      return successResponse(
        res,
        {
          polls,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / limit),
            count: total,
          },
        },
        "My polls retrieved successfully"
      );
    } catch (error) {
      logger.error("Get my polls error:", error);
      return errorResponse(res, "Failed to retrieve polls", 500);
    }
  }

  // Update poll (only by creator)
  async updatePoll(req, res) {
    try {
      const { id } = req.params;
      const { question, options, visibility, isActive } = req.body;

      const poll = await Poll.findOne({
        _id: id,
        creator: req.user._id,
        isDeleted: false,
      });

      if (!poll) {
        return errorResponse(res, "Poll not found or access denied", 404);
      }

      // Don't allow updates if poll has votes (except for isActive)
      const hasVotes = poll.options.some((option) => option.votes.length > 0);
      if (hasVotes && (question || options)) {
        return errorResponse(
          res,
          "Cannot modify question or options after votes are cast",
          400
        );
      }

      const updates = {};
      if (question !== undefined) updates.question = question;
      if (options !== undefined) {
        if (options.length < 2 || options.length > 10) {
          return errorResponse(res, "Poll must have 2-10 options", 400);
        }
        updates.options = options.map((text) => ({ text, votes: [] }));
      }
      if (visibility !== undefined) updates.visibility = visibility;
      if (isActive !== undefined) updates.isActive = isActive;

      const updatedPoll = await Poll.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate("creator", "name email");

      return successResponse(
        res,
        { poll: updatedPoll },
        "Poll updated successfully"
      );
    } catch (error) {
      logger.error("Update poll error:", error);
      return errorResponse(res, "Failed to update poll", 500);
    }
  }

  // Delete poll (only by creator)
  async deletePoll(req, res) {
    try {
      const { id } = req.params;

      const poll = await Poll.findOne({
        _id: id,
        creator: req.user._id,
        isDeleted: false,
      });

      if (!poll) {
        return errorResponse(res, "Poll not found or access denied", 404);
      }

      await Poll.findByIdAndUpdate(id, { $set: { isDeleted: true } });

      return successResponse(res, null, "Poll deleted successfully");
    } catch (error) {
      logger.error("Delete poll error:", error);
      return errorResponse(res, "Failed to delete poll", 500);
    }
  }

  // Vote on poll - REMOVED EXPIRATION CHECK
  async voteOnPoll(req, res) {
    try {
      const { id } = req.params;
      const { optionIndex } = req.body;

      if (typeof optionIndex !== "number") {
        return errorResponse(res, "Option index is required", 400);
      }

      const poll = await Poll.findOne({
        _id: id,
        isDeleted: false,
        isActive: true,
      });

      if (!poll) {
        return errorResponse(res, "Poll not found", 404);
      }

      // REMOVED: Expiration check - polls never expire
      // if (poll.expiresAt && new Date() > poll.expiresAt) {
      //   return errorResponse(res, "Poll has expired", 400);
      // }

      if (optionIndex < 0 || optionIndex >= poll.options.length) {
        return errorResponse(res, "Invalid option index", 400);
      }

      // Check if user already voted
      const hasVoted = poll.options.some((option) =>
        option.votes.some(
          (vote) => vote.user.toString() === req.user._id.toString()
        )
      );

      if (hasVoted) {
        return errorResponse(res, "You have already voted on this poll", 400);
      }

      // Add vote
      poll.options[optionIndex].votes.push({ user: req.user._id });
      await poll.save();

      await poll.populate("creator", "name email");

      return successResponse(res, { poll }, "Vote recorded successfully");
    } catch (error) {
      logger.error("Vote on poll error:", error);
      return errorResponse(res, "Failed to vote", 500);
    }
  }

  // Remove vote from poll
  async removeVote(req, res) {
    try {
      const { id } = req.params;

      const poll = await Poll.findOne({
        _id: id,
        isDeleted: false,
        isActive: true,
      });

      if (!poll) {
        return errorResponse(res, "Poll not found", 404);
      }

      // Remove user's vote from all options
      let voteRemoved = false;
      poll.options.forEach((option) => {
        const initialLength = option.votes.length;
        option.votes = option.votes.filter(
          (vote) => vote.user.toString() !== req.user._id.toString()
        );
        if (option.votes.length < initialLength) {
          voteRemoved = true;
        }
      });

      if (!voteRemoved) {
        return errorResponse(res, "No vote found to remove", 400);
      }

      await poll.save();
      await poll.populate("creator", "name email");

      return successResponse(res, { poll }, "Vote removed successfully");
    } catch (error) {
      logger.error("Remove vote error:", error);
      return errorResponse(res, "Failed to remove vote", 500);
    }
  }

  // Admin: Get all polls
  async getAdminPolls(req, res) {
    try {
      const { page = 1, limit = 10, includeDeleted = false } = req.query;
      const skip = (page - 1) * limit;

      const query = {};
      if (includeDeleted !== "true") {
        query.isDeleted = false;
      }

      const polls = await Poll.find(query)
        .populate("creator", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      const total = await Poll.countDocuments(query);

      return successResponse(
        res,
        {
          polls,
          pagination: {
            current: parseInt(page),
            total: Math.ceil(total / limit),
            count: total,
          },
        },
        "Admin polls retrieved successfully"
      );
    } catch (error) {
      logger.error("Get admin polls error:", error);
      return errorResponse(res, "Failed to retrieve polls", 500);
    }
  }

  // Admin: Update any poll
  async adminUpdatePoll(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const poll = await Poll.findByIdAndUpdate(
        id,
        { $set: updates },
        { new: true, runValidators: true }
      ).populate("creator", "name email");

      if (!poll) {
        return errorResponse(res, "Poll not found", 404);
      }

      return successResponse(res, { poll }, "Poll updated successfully");
    } catch (error) {
      logger.error("Admin update poll error:", error);
      return errorResponse(res, "Failed to update poll", 500);
    }
  }

  // Admin: Delete any poll
  async adminDeletePoll(req, res) {
    try {
      const { id } = req.params;

      const poll = await Poll.findByIdAndUpdate(
        id,
        { $set: { isDeleted: true } },
        { new: true }
      );

      if (!poll) {
        return errorResponse(res, "Poll not found", 404);
      }

      return successResponse(res, null, "Poll deleted successfully");
    } catch (error) {
      logger.error("Admin delete poll error:", error);
      return errorResponse(res, "Failed to delete poll", 500);
    }
  }
}

module.exports = new PollController();
