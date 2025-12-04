const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const rateLimit = require("express-rate-limit");

const logger = require("./src/utils/logger");
const { errorHandler } = require("./src/middlewares/errorHandler");
const { notFoundHandler } = require("./src/middlewares/notFoundHandler");
const routes = require("./src/routes");
const { setupSwagger } = require("./src/docs/swagger");

const app = express();

// Security middleware
app.use(
  helmet({
    // Allow resources like images to be consumed cross-origin (e.g., frontend on app.manmitr.com)
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// app.use(cors({
//   origin: process.env.FRONTEND_URL || 'http://localhost:3000',
//   credentials: true
// }));

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://app.manmitr.com",
  "http://manmitr.com",
  "https://manmitr.com",
  "http://localhost:8000",
  "https://api.manmitr.com",
  "https://kidmantree-backend-g2la.onrender.com",
  "https://manmitr.onrender.com",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      } else {
        return callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100,
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// Body parsing and compression
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Logging
app.use(
  morgan("combined", {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  })
);

// Static file serving for uploads and public assets
app.use("/uploads", express.static("uploads"));
app.use("/public", express.static("public"));

// API routes
app.use("/api", routes);

// Swagger documentation
setupSwagger(app);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
