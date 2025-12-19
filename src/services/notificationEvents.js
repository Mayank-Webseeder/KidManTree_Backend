const notificationService = require("./notificationService");
const logger = require("../utils/logger");
const User = require("../models/User");

const safeExec = async (fn, label = "notification event") => {
  try {
    await fn();
  } catch (error) {
    logger.warn(`Failed to send ${label}: ${error.message}`);
  }
};

const formatTime = (slotDate, slotStartTime) => {
  const date = new Date(slotDate);
  const [hoursStr, minutesStr] = (slotStartTime || "00:00").split(":");
  const hours = Number(hoursStr) || 0;
  const minutes = Number(minutesStr) || 0;
  const dateInstance = new Date(date);
  dateInstance.setHours(hours, minutes, 0, 0);

  const dateStr = dateInstance.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const hour12 = ((hours + 11) % 12) + 1;
  const meridiem = hours >= 12 ? "PM" : "AM";
  const timeStr = `${hour12}:${minutes.toString().padStart(2, "0")} ${meridiem}`;
  return { dateStr, timeStr };
};

const notificationEvents = {
  async newPatientOnboarded(user) {
    if (!user?._id) return;
    await safeExec(async () => {
      await notificationService.createNotification({
        user: user._id,
        title: "Welcome to Manmitr",
        description:
          "We’re glad to have you here. Explore sessions, mood journals, and mindfulness tools to begin your journey.",
        type: "system",
        priority: "normal",
      });
    }, "welcome notification");

    await safeExec(async () => {
      await notificationService.notifyAdmins({
        title: "New patient registered",
        description: `${user.name || "A new user"} just joined the platform.`,
        type: "system",
        priority: "high",
        metadata: { userId: user._id },
      });
    }, "new patient admin notification");
  },

  async reportSubmitted(report, reporter) {
    await safeExec(async () => {
      await notificationService.notifyAdmins({
        title: "Report submitted",
        description: `${reporter?.name || "A user"} submitted a report: ${
          report.title || report.category
        }.`,
        type: "report",
        priority: "high",
        metadata: {
          reportId: report._id,
          reporterId: reporter?._id,
        },
      });
    }, "report submitted notification");
  },

  async supportTicketCreated(ticket, creator) {
    await safeExec(async () => {
      await notificationService.notifyAdmins({
        title: "New support ticket opened",
        description: `${creator?.name || "A user"} created a ticket: ${
          ticket.subject
        }.`,
        type: "support",
        priority: "high",
        metadata: {
          supportId: ticket._id,
          createdBy: creator?._id,
        },
      });
    }, "support ticket notification");
  },

  async meditationPublished(track) {
    await safeExec(async () => {
      await notificationService.notifyAllActiveUsers({
        title: "New meditation added",
        description: `Check out "${track?.title || "our latest meditation"}" for stress relief.`,
        type: "system",
        metadata: {
          musicId: track?._id,
          categoryId: track?.category,
        },
      });
    }, "new meditation notification");
  },

  async sessionReminder(booking, minutesAway = 30) {
    if (!booking) return;
    const { dateStr, timeStr } = formatTime(
      booking.slotDate,
      booking.slotStartTime
    );

    const reminderText = `Your session is scheduled for ${dateStr} at ${timeStr}.`;

    await safeExec(async () => {
      await notificationService.createNotification({
        user: booking.user._id || booking.user,
        title: "Session reminder",
        description: `${reminderText} We'll see you soon.`,
        type: "session",
        priority: "high",
        metadata: {
          bookingId: booking._id,
          minutesAway,
        },
      });
    }, "session reminder (user)");

    await safeExec(async () => {
      await notificationService.createNotification({
        user: booking.psychologist._id || booking.psychologist,
        title: "Session reminder",
        description: `Upcoming session with ${
          booking.user.name || "a patient"
        } at ${timeStr}.`,
        type: "session",
        priority: "high",
        metadata: {
          bookingId: booking._id,
          minutesAway,
        },
      });
    }, "session reminder (psychologist)");
  },

  async weeklyMoodSummary(user, summary) {
    if (!user?._id) return;
    const description = summary
      ? `You logged ${summary.totalEntries} moods this week. Average mood score: ${
          summary.averageScore?.toFixed(1) || "N/A"
        }. Top emotions: ${(summary.topEmotions || []).join(", ") || "N/A"}.`
      : "Here’s your weekly mood update. Keep tracking to see more insights!";

    await safeExec(async () => {
      await notificationService.createNotification({
        user: user._id,
        title: "Weekly mood summary",
        description,
        type: "system",
        priority: "normal",
        metadata: summary || {},
      });
    }, "weekly mood summary");
  },

  async moodJournalReminder(user) {
    if (!user?._id) return;
    await safeExec(async () => {
      await notificationService.createNotification({
        user: user._id,
        title: "Mood journal reminder",
        description: "Don’t forget to write in your mood journal today.",
        type: "system",
        priority: "normal",
      });
    }, "mood journal reminder");
  },

  async inactiveUserReminder(user, daysInactive = 7) {
    if (!user?._id) return;
    await safeExec(
      async () => {
        await notificationService.createNotification({
          user: user._id,
          title: "We miss you on Manmitr",
          description: `You haven't logged in for ${daysInactive} day${
            daysInactive === 1 ? "" : "s"
          }. Check in to continue your wellbeing journey.`,
          type: "system",
          priority: "normal",
          metadata: {
            daysInactive,
            lastLogin: user.lastLogin,
          },
        });
      },
      "inactive user reminder"
    );
  },

  async communitySuggestion(user, suggestion) {
    if (!user?._id) return;
    await safeExec(async () => {
      await notificationService.createNotification({
        user: user._id,
        title: "Community suggestion",
        description:
          suggestion ||
          "We recommend joining the Mindfulness Enthusiasts group for peer support.",
        type: "system",
        priority: "normal",
      });
    }, "community suggestion");
  },

  async broadcastSuggestion(message) {
    await safeExec(async () => {
      await notificationService.notifyAllActiveUsers({
        title: "Community suggestion",
        description:
          message ||
          "We recommend joining the Mindfulness Enthusiasts group for peer support.",
        type: "system",
      });
    }, "community suggestion broadcast");
  },

  async passwordChanged(user) {
    if (!user?._id) return;
    await safeExec(async () => {
      let notificationUserId = user._id;

      if (user.role === 'psychologist') {
        const Psychologist = require("../models/Psychologist");
        const psychologistData = await Psychologist.findOne({ email: user.email });
        if (psychologistData?._id) {
          notificationUserId = psychologistData._id;
        }
      }

      await notificationService.createNotification({
        user: notificationUserId,
        title: "Password Changed",
        description: "Your password was successfully changed. If this wasn't you, please contact support immediately.",
        type: "system",
        priority: "high",
      });
    }, "password changed notification");
  },
};

module.exports = notificationEvents;

