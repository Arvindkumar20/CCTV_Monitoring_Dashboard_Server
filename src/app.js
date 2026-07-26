import express from "express";
import dotenv from "dotenv";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import cookieParser from "cookie-parser";
import "dotenv/config";
console.log(process.env.MONGODB_URI);
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { apiLimiter, authLimiter } from "./utils/rateLimiting.js";

// Import routes
import authRoutes from "./routes/auth.routes.js";
import { categoryRouter } from "./routes/category.routes.js";
import { subCategoryRouter } from "./routes/subCategory.routes.js";
import { nestedSubCategoryRoutes } from "./routes/nestedSubCategory.routes.js";
import { cameraRoter } from "./routes/camera.routes.js";
import { guardianRouter } from "./routes/guardian.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { streamRouter } from "./routes/stream.routes.js";
import { guardianRoute } from "./routes/guardian.js";
// import { sanitizeInputs } from "./middlewares/sanitize.js";

// Load env vars
dotenv.config();

const app = express();

// Body parser - increased limit for file uploads/camera data
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
// Compression
app.use(compression());
// Sanitize data against XSS

// Cookie parser for JWT cookies
app.use(cookieParser());

// Set security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow camera images from different origins
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", "data:", "blob:", "*"], // Allow camera streams
        connectSrc: ["'self'", "*"], // Allow WebSocket connections for live camera
      },
    },
  }),
);

// Enable CORS
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:5173/",
    credentials: true, // Important for cookies
    optionsSuccessStatus: 200,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);

// Request logging in development
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
    next();
  });
}

// Rate limiting
// Apply strict rate limiting to auth routes
// app.use('/api/auth', authLimiter);

// Apply general rate limiting to all other API routes
// app.use('/api', apiLimiter);

// ==================== ROUTES ====================

// Mount auth routes - THESE ARE THE IMPORTANT LINES
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRouter);
app.use("/api/sub-categories", subCategoryRouter);
app.use("/api/nested-subcategories", nestedSubCategoryRoutes);
app.use("/api/cameras", cameraRoter);
app.use("/api/guardian", guardianRoute);
app.use("/api/guardians", guardianRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/streams", streamRouter);

// Mount other routes as needed
// app.use('/api/users', userRoutes);
// app.use('/api/cameras', cameraRoutes);
// app.use('/api/recordings', recordingRoutes);
// app.use('/api/alerts', alertRoutes);
// app.use('/api/settings', settingsRoutes);

// ==================== PUBLIC ROUTES ====================

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || "1.0.0",
  });
});

// Test endpoint to verify auth routes are working
app.get("/api/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is working",
    endpoints: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        refreshToken: "POST /api/auth/refresh-token",
        logout: "POST /api/auth/logout",
        profile: "GET /api/auth/profile",
      },
    },
  });
});

// Serve static files if needed (for camera snapshots, etc.)
// app.use('/uploads', express.static('uploads'));

// ==================== ERROR HANDLING ====================

// 404 handler - This should be after all routes
app.use(notFound);

// Global error handler - This should be last
app.use(errorHandler);

export default app;
