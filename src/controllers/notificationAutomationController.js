const Booking = require("../models/Booking");
const MoodLog = require("../models/MoodLog");
const FeelingToday = require("../models/FeelingToday");
const User = require("../models/User");
const { successResponse, errorResponse } = require("../utils/response");
const notificationEvents = require("../services/notificationEvents");
const logger = require("../utils/logger");

class NotificationAutomationController {
  async sendSessionReminders(req, res) {
    try {
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const bookings = await Booking.find({
        status: "confirmed",
        slotDate: { $gte: today, $lt: tomorrow },
        $or: [{ reminderSentAt: null }, { reminderSentAt: { $exists: false } }],
      })
        .populate("user", "name email")
        .populate("psychologist", "name email");

      let reminderCount = 0;
      for (const booking of bookings) {
        const [hours, minutes] = (booking.slotStartTime || "00:00")
          .split(":")
          .map((n) => Number(n) || 0);
        const sessionStart = new Date(booking.slotDate);
        sessionStart.setHours(hours, minutes, 0, 0);
        const diffMinutes = (sessionStart.getTime() - now.getTime()) / 60000;
        if (diffMinutes <= 0 || diffMinutes > 90) {
          continue;
        }

        await notificationEvents.sessionReminder(booking, Math.round(diffMinutes));
        booking.reminderSentAt = new Date();
        await booking.save();
        reminderCount += 1;
      }

      return successResponse(res, { remindersSent: reminderCount });
    } catch (error) {
      logger.error("Session reminder automation error:", error);
      return errorResponse(res, "Failed to send session reminders", 500);
    }
  }

  async sendWeeklyMoodSummaries(req, res) {
    try {
      const targetUserId = req.body?.userId;
      const userQuery = {
        isActive: true,
        role: "user",
      };
      if (targetUserId) userQuery._id = targetUserId;

      const users = await User.find(userQuery).select("name _id");
      const since = new Date();
      since.setDate(since.getDate() - 7);

      let count = 0;
      for (const user of users) {
        const logs = await MoodLog.find({
          user: user._id,
          logDate: { $gte: since },
        });
        if (!logs.length) continue;

        const scores = logs
          .map((log) => log.scale)
          .filter((score) => typeof score === "number");
        const average =
          scores.length > 0
            ? scores.reduce((acc, score) => acc + score, 0) / scores.length
            : null;

        const emotionCount = {};
        logs.forEach((log) => {
          (log.emotions || []).forEach((emotion) => {
            const key = emotion.toLowerCase();
            emotionCount[key] = (emotionCount[key] || 0) + 1;
          });
        });
        const topEmotions = Object.entries(emotionCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([emotion]) => emotion);

        await notificationEvents.weeklyMoodSummary(user, {
          totalEntries: logs.length,
          averageScore: average,
          topEmotions,
        });
        count += 1;
      }

      return successResponse(res, { summariesSent: count });
    } catch (error) {
      logger.error("Weekly mood summary automation error:", error);
      return errorResponse(res, "Failed to send weekly summaries", 500);
    }
  }

  async sendMoodJournalReminders(req, res) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const usersWithEntry = await FeelingToday.distinct("user", {
        date: { $gte: today, $lt: tomorrow },
      });

      const pendingUsers = await User.find({
        role: "user",
        isActive: true,
        _id: { $nin: usersWithEntry },
      }).select("name _id");

      for (const user of pendingUsers) {
        await notificationEvents.moodJournalReminder(user);
      }

      return successResponse(res, { remindersSent: pendingUsers.length });
    } catch (error) {
      logger.error("Mood journal reminder automation error:", error);
      return errorResponse(res, "Failed to send mood reminders", 500);
    }
  }

  async sendInactiveUserReminders(req, res) {
    try {
      const days =
        Number(req.body?.days || req.query?.days) && Number(req.body?.days || req.query?.days) > 0
          ? Number(req.body?.days || req.query?.days)
          : 7;

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const users = await User.find({
        role: "user",
        isActive: true,
        $or: [
          { lastLogin: { $lt: cutoff } },
          {
            $and: [
              { $or: [{ lastLogin: null }, { lastLogin: { $exists: false } }] },
              { createdAt: { $lt: cutoff } },
            ],
          },
        ],
      }).select("_id name lastLogin createdAt");

      let count = 0;
      const now = new Date();

      for (const user of users) {
        const lastActive = user.lastLogin || user.createdAt || cutoff;
        const diffMs = now.getTime() - lastActive.getTime();
        const effectiveDaysInactive = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        await notificationEvents.inactiveUserReminder(
          user,
          Number.isFinite(effectiveDaysInactive) && effectiveDaysInactive > 0
            ? effectiveDaysInactive
            : days
        );
        count += 1;
      }

      return successResponse(res, { remindersSent: count, thresholdDays: days });
    } catch (error) {
      logger.error("Inactive user reminder automation error:", error);
      return errorResponse(res, "Failed to send inactive user reminders", 500);
    }
  }

  async broadcastCommunitySuggestion(req, res) {
    try {
      const { message, userId } = req.body || {};
      if (userId) {
        const user = await User.findById(userId).select("name");
        if (!user) {
          return errorResponse(res, "User not found", 404);
        }
        await notificationEvents.communitySuggestion(user, message);
        return successResponse(res, { targeted: true });
      }

      await notificationEvents.broadcastSuggestion(message);
      return successResponse(res, { broadcast: true });
    } catch (error) {
      logger.error("Community suggestion automation error:", error);
      return errorResponse(res, "Failed to send suggestion", 500);
    }
  }
}

module.exports = new NotificationAutomationController();

