require("dotenv").config();
require("express-async-errors");

const app = require("./app");
const { connectDB } = require("./src/loaders/database");
const logger = require("./src/utils/logger");
const { createUploadsDirectories } = require("./scripts/setup-uploads");

const PORT = process.env.PORT || 8000;

async function startServer() {
  try {
    // Create uploads directories
    createUploadsDirectories();

    await connectDB();

    const server = app.listen(PORT, () => {
      logger.info(
        `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`
      );
      logger.info(
        `📚 API Documentation available at http://localhost:${PORT}/docs`
      );
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      logger.info("📦 Shutting down gracefully...");
      server.close(() => {
        logger.info("✅ Server closed");
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
