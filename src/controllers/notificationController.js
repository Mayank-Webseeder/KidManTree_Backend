const Notification = require("../models/Notification");
const { successResponse, errorResponse } = require("../utils/response");
const logger = require("../utils/logger");

class NotificationController {
  async getNotifications(req, res) {
    try {
      const { page = 1, limit = 10, unread } = req.query;

      const userId = req.user.role === 'psychologist' && req.roleId
        ? req.roleId
        : req.user.id;

      const query = { user: userId };
      if (unread === "true") {
        query.isRead = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(Number(limit))
        .skip((Number(page) - 1) * Number(limit));

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({
        user: userId,
        isRead: false,
      });

      return successResponse(res, {
        notifications,
        pagination: {
          currentPage: Number(page),
          totalPages: Math.ceil(total / Number(limit)),
          totalItems: total,
        },
        unreadCount,
      });
    } catch (error) {
      logger.error("Get notifications error:", error);
      return errorResponse(res, "Failed to fetch notifications", 500);
    }
  }

  async markAsRead(req, res) {
    try {
      const userId = req.user.role === 'psychologist' && req.roleId
        ? req.roleId
        : req.user.id;

      const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, user: userId },
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        return errorResponse(res, "Notification not found", 404);
      }

      return successResponse(res, { notification }, "Notification marked as read");
    } catch (error) {
      logger.error("Mark notification read error:", error);
      return errorResponse(res, "Failed to update notification", 500);
    }
  }

  async markAllAsRead(req, res) {
    try {
      const userId = req.user.role === 'psychologist' && req.roleId
        ? req.roleId
        : req.user.id;

      await Notification.updateMany(
        { user: userId, isRead: false },
        { isRead: true }
      );

      return successResponse(res, null, "All notifications marked as read");
    } catch (error) {
      logger.error("Mark all notifications read error:", error);
      return errorResponse(res, "Failed to update notifications", 500);
    }
  }
}

module.exports = new NotificationController();

