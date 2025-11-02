import { Router, Request, Response } from "express";
import {
  requestOtp,
  verifyOtp,
  otpStore,
  verifyOtpSignUp,
} from "./otpAuthController";
import { loginUser } from "../users/userController";
import prisma from "../../prisma";

const router = Router();

router.post("/request-otp", async (req: Request, res: Response) => {
  const { mobile } = req.body;
  const result = await requestOtp(mobile);
  return res.status(result.status).json(result.body);
});

router.post("/verify-otp", async (req: Request, res: Response) => {
  const { mobile, otp } = req.body;
  const result = await verifyOtp(mobile, otp);
  return res.status(result.status).json(result.body);
});

router.post("/verify-otp-signup", async (req: Request, res: Response) => {
  const { mobile, otp } = req.body;
  const result = await verifyOtpSignUp(mobile, otp);
  return res.status(result.status).json({ success: true });
});

router.post("/login-whatsapp", async (req: Request, res: Response) => {
  try {
    await loginUser(req, res);
  } catch (error) {
    console.error("Error logging in with WhatsApp:", error);
    return res.status(500).json({ error: "Failed to login with WhatsApp" });
  }
});

// Step 1: WhatsApp verification with existence check and OTP request
router.post("/verify-whatsapp", async (req: Request, res: Response) => {
  const { whatsapp } = req.body;
  if (!whatsapp || !whatsapp.match(/^\+?\d{10,15}$/)) {
    return res.status(400).json({ error: "Invalid WhatsApp number" });
  }
  // Normalize number
  const normalized = whatsapp.replace(/[^\d]/g, "").replace(/^0+/, "");
  // Check if user already exists
  const user = await prisma.user.findFirst({
    where: { whatsapp: { endsWith: normalized } },
  });
  if (user) {
    return res.status(409).json({ error: "WhatsApp number already exists" });
  }
  // Generate dummy OTP and save in memory
  const otp = "123456";
  otpStore[normalized] = otp;
  // In real implementation, send OTP via Twilio here
  return res.status(200).json({ success: true, message: "OTP sent", otp });
});

export default router;
