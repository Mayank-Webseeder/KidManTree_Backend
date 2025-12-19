const express = require("express");
const authRoutes = require("./authRoutes");
const userRoutes = require("./userRoutes");
const postRoutes = require("./postRoutes");
const pollRoutes = require("./pollRoutes");
const moodRoutes = require("./moodRoutes");
const psychologistRoutes = require("./psychologistRoutes");
const appointmentRoutes = require("./appointmentRoutes");
const questionnaireRoutes = require("./questionnaireRoutes");
const feelingRoutes = require("./feelingRoutes");
const analyticsRoutes = require("./analyticsRoutes");
const chatbotRoutes = require("./chatbotRoutes");
const musicRoutes = require("./musicRoutes");
const podcastRoutes = require("./podcastRoutes");
const reelRoutes = require("./reelRoutes");
const videoRoutes = require("./videoRoutes");
const supportRoutes = require("./supportRoutes");
const userPanelRoutes = require("./userPanelRoutes");
const reportRoutes = require("./reportRoutes");
const bookingRoutes = require("./bookings");
const notificationRoutes = require("./notificationRoutes");
const groupRoutes = require("./groupRoutes");

const router = express.Router();

// API Routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/post", postRoutes);
router.use("/poll", pollRoutes);
router.use("/moods", moodRoutes);
router.use("/psychologists", psychologistRoutes);
router.use("/appointments", appointmentRoutes);
router.use("/questionnaires", questionnaireRoutes);
router.use("/feelings", feelingRoutes);
router.use("/analytics", analyticsRoutes);
router.use("/chatbot", chatbotRoutes);
router.use("/music", musicRoutes);
router.use("/podcasts", podcastRoutes);
router.use("/reels", reelRoutes);
router.use("/videos", videoRoutes);
router.use("/support", supportRoutes);
router.use("/user-panel", userPanelRoutes);
router.use("/reports", reportRoutes);
router.use("/bookings", bookingRoutes);
router.use("/notifications", notificationRoutes);
router.use("/group", groupRoutes);

// Health check for API
router.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "KidManTree Platform API",
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
