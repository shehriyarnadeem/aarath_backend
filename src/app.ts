import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { verifyFirebaseToken } from "./middleware/authMiddleware";
import { userRouter } from "./modules/users/routes";
import otpAuthRoutes from "./modules/auth/otpAuthRoutes";
import productRoutes from "./modules/products/routes";
import path from "path";

// Load variables from .env file
dotenv.config();

const app = express();

// Enable CORS for all routes (adjust origins as needed)
app.use(cors());

app.use(express.static(path.join(__dirname, "frontend_build")));

// For SPA routing: all other requests go to index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend_build", "index.html"));
});

// Parse JSON request bodies (increase limit for image uploads)
app.use(express.json({ limit: "20mb" }));

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

// OTP Auth routes (no Bearer token required)
app.use("/api/auth/otp", otpAuthRoutes);

// SSO Auth route (Bearer token required)
app.post("/api/auth", verifyFirebaseToken, async (req, res) => {
  try {
    // decoded contains user info (uid, email, etc.)
    res.json({ message: "User verified", user: (req as any).user });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// Onboarding-complete route (no Bearer token required)
app.use("/api/users/onboarding-complete", userRouter);

// Protected API routes
app.use("/api/users", verifyFirebaseToken, userRouter);

// Product routes
app.use("/api/products", verifyFirebaseToken, productRoutes);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

app.listen(3000, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});
