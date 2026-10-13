import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import courseRoutes from "./routes/courseRoutes.js";
import enrollmentRoutes from "./routes/enrollmentRoutes.js";
import assignmentRoutes from "./routes/assignmentRoutes.js";

const app = express();
const PORT = process.env.PORT || 5000;

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(helmet());

// Set CLIENT_URL in your backend environment variables
// to the exact deployed frontend origin.
//
// Example:
// CLIENT_URL=https://your-frontend.onrender.com

const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without an Origin header, such as
      // server-to-server requests and certain health checks.
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error(`CORS blocked origin: ${origin}`);

      return callback(
        new Error(`CORS blocked origin: ${origin}`)
      );
    },
    credentials: true,
    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

app.use(express.json({ limit: "1mb" }));

app.use(
  express.urlencoded({
    extended: true,
    limit: "1mb",
  })
);

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message:
      "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);

app.get("/", (req, res) => {
  res.status(200).json({
    message: "LMS API is running!",
    status: "OK",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/assignments", assignmentRoutes);

app.use((req, res) => {
  res.status(404).json({
    message: "API endpoint not found.",
    path: req.originalUrl,
  });
});

app.use((err, req, res, next) => {
  console.error("Server error:", err.message || err);

  if (res.headersSent) {
    return next(err);
  }

  // CORS rejection
  if (err.message?.startsWith("CORS blocked origin:")) {
    return res.status(403).json({
      message: "Request blocked by CORS policy.",
    });
  }

  const statusCode = err.status || 500;

  res.status(statusCode).json({
    message:
      process.env.NODE_ENV === "production"
        ? statusCode >= 500
          ? "An unexpected server error occurred."
          : err.message
        : err.message,
  });
});

async function startServer() {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`LMS server running on port ${PORT}`);
      console.log(
        `Allowed frontend origins: ${allowedOrigins.join(", ")}`
      );
    });
  } catch (error) {
    console.error(
      "Failed to connect to the database:",
      error.message
    );

    process.exit(1);
  }
}

startServer();
