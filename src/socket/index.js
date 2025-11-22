const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

let ioInstance = null;

const allowedOrigins = (process.env.FRONTEND_URL || "http://localhost:3000").split(",").filter(Boolean);

const initSocket = (httpServer) => {
  ioInstance = new Server(httpServer, {
    cors: {
      origin: allowedOrigins.length ? allowedOrigins : "*",
      methods: ["GET", "POST"],
    },
    transports: ["websocket", "polling"],
  });

  ioInstance.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.query?.token ||
        socket.handshake.headers?.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("Authentication error"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = { id: decoded.id, role: decoded.role };
      socket.join(`user:${decoded.id}`);
      return next();
    } catch (error) {
      logger.warn("Socket auth failed:", error.message);
      return next(new Error("Authentication error"));
    }
  });

  ioInstance.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.user.id}`);

    socket.on("notifications:mark-read", () => {
      socket.emit("notifications:ack");
    });

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.user.id}`);
    });
  });

  return ioInstance;
};

const getIO = () => {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized");
  }
  return ioInstance;
};

module.exports = {
  initSocket,
  getIO,
};

