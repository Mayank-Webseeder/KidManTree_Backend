const Notification = require("../models/Notification");
const User = require("../models/User");
const logger = require("../utils/logger");
const { getIO } = require("../socket");

const buildNotificationPayload = ({
  user,
  title,
  description,
  type = "general",
  priority = "normal",
  metadata = {},
}) => ({
  user,
  title,
  description,
  type,
  priority,
  metadata,
});

const emitSocketEvent = (userId, notification) => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit("notification:new", notification);
  } catch (error) {
    logger.warn("Skipping socket emit (not initialized):", error.message);
  }
};

const createNotification = async (payload) => {
  const notification = await Notification.create(buildNotificationPayload(payload));
  emitSocketEvent(payload.user, notification);
  return notification;
};

const notifyMultiple = async (users, payload) => {
  const uniqueIds = [...new Set(users.map((id) => id?.toString()))];
  const operations = uniqueIds.map((userId) =>
    createNotification({ ...payload, user: userId })
  );
  return Promise.all(operations);
};

const fetchUsersByRole = async (roles = []) => {
  if (!roles.length) return [];
  const users = await User.find({
    role: { $in: roles },
    isActive: true,
  }).select("_id");
  return users.map((user) => user._id);
};

const notifyAdmins = async (payload) => {
  const adminIds = await fetchUsersByRole(["admin", "superadmin"]);
  if (!adminIds.length) return [];
  return notifyMultiple(adminIds, payload);
};

const notifyAllActiveUsers = async (payload, roles = ["user"]) => {
  const users = await User.find({
    isActive: true,
    role: { $in: roles },
  }).select("_id");
  if (!users.length) return [];
  return notifyMultiple(
    users.map((user) => user._id),
    payload
  );
};

const notifyUserList = async (userIds = [], payload) => {
  if (!userIds.length) return [];
  return notifyMultiple(userIds, payload);
};

module.exports = {
  createNotification,
  notifyMultiple,
  notifyAdmins,
  notifyAllActiveUsers,
  notifyUserList,
  fetchUsersByRole,
};

