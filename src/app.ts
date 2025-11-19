import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { verifyFirebaseToken } from "./middleware/authMiddleware";
import { userRouter } from "./modules/users/routes";
import otpAuthRoutes from "./modules/auth/otpAuthRoutes";
import productRoutes from "./modules/products/routes";
import auctionRoutes from "./modules/auctions/routes";
import { testRouter as testRoutes } from "./modules/test/routes";
import { cronTestRouter } from "./routes/cronTest";
import { CronJobManager } from "./jobs/cronJobs";

// Load variables from .env file
dotenv.config();

const app = express();

// Enable CORS (adjust allowed origins if needed)
app.use(
  cors({
    origin: ["https://www.aarath.app", "https://aarath.app"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// IMPORTANT: handle OPTIONS explicitly
app.options("*", cors());

// Parse JSON request bodies
app.use(express.json({ limit: "20mb" }));

// Health check route
app.get("/health", (req, res) => {
  res.json({ message: "API is running" });
});

// Cron job status route
app.get("/api/admin/cron-status", (req, res) => {
  try {
    const status = CronJobManager.getStatus();
    res.json({
      message: "Cron job status retrieved",
      jobs: status,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to get cron job status",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// ==== API routes ====
// OTP Auth routes (no Bearer token required)
app.use("/api/auth/otp", otpAuthRoutes);

// SSO Auth route (Bearer token required)
app.post("/api/auth", verifyFirebaseToken, async (req, res) => {
  try {
    res.json({ message: "User verified", user: (req as any).user });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// Onboarding-complete route (no Bearer token required)
app.use("/api/users/onboarding-complete", userRouter);

// Protected user routes
app.use("/api/users", verifyFirebaseToken, userRouter);

// Product routes (mixed - some public, some protected)
app.use("/api/products", verifyFirebaseToken, productRoutes);

// Auction routes (protected)
app.use("/api/auctions", verifyFirebaseToken, auctionRoutes);

// Test routes
app.use("/api/test", testRoutes);

// Cron job test routes (admin only - should be protected in production)
app.use("/api/admin/cron", cronTestRouter);

// ==== Start server ====
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.listen(PORT, "0.0.0.0", async () => {
  console.log(`✅ Server listening on port ${PORT}`);

  // Initialize and start cron jobs
  try {
    await CronJobManager.initialize();
    CronJobManager.start();
    console.log(`🕐 Cron jobs initialized and started`);
  } catch (error) {
    console.error("Failed to start cron jobs:", error);
  }
});
