import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { verifyFirebaseToken } from "./middleware/authMiddleware";
import { userRouter } from "./modules/users/routes";
import otpAuthRoutes from "./modules/auth/otpAuthRoutes";
import productRoutes from "./modules/products/routes";
import { testRouter as testRoutes } from "./modules/test/routes";

// Load variables from .env file
dotenv.config();

const app = express();

// Enable CORS (adjust allowed origins if needed)
app.use(cors());

// Parse JSON request bodies
app.use(express.json({ limit: "20mb" }));

// Health check route
app.get("/health", (req, res) => {
  res.json({ message: "API is running" });
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

// Product routes
app.use("/api/products", verifyFirebaseToken, productRoutes);
app.use("/api/test", testRoutes);

// ==== Start server ====
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server listening on port ${PORT}`);
});
