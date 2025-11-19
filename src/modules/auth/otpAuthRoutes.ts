import { Router, Request, Response } from "express";
import { loginUser } from "../users/userController";
import {
  sendOTP,
  verifyOTP,
  clearExpiredOTPs,
  getOTPStoreStats,
} from "./otpAuthController";

const router = Router();

// WhatsApp login route
router.post("/login-whatsapp", async (req: Request, res: Response) => {
  try {
    await loginUser(req, res);
  } catch (error) {
    console.error("Error logging in with WhatsApp:", error);
    return res.status(500).json({ error: "Failed to login with WhatsApp" });
  }
});

// Send OTP route - delegates to controller
router.post("/send-otp", sendOTP);

// Verify OTP route - delegates to controller
router.post("/verify-otp", verifyOTP);

// Utility routes for development/debugging
router.get("/otp-stats", (req: Request, res: Response) => {
  const stats = getOTPStoreStats();
  res.json({
    success: true,
    data: stats,
  });
});

router.post("/clear-expired-otps", (req: Request, res: Response) => {
  const clearedCount = clearExpiredOTPs();
  res.json({
    success: true,
    message: `Cleared ${clearedCount} expired OTPs`,
    clearedCount,
  });
});

export default router;
