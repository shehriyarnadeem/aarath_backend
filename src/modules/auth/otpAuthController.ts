import { Request, Response } from "express";
import { twilioClient } from "../../config/twilio";
import prisma from "../../prisma";

// In-memory OTP store for mock verification
// In production, consider using Redis or database for persistence
const mockOtpStore = new Map<string, { otp: string; expiresAt: number }>();

/**
 * Generate a 6-digit random OTP
 */
const generateOTP = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Check if live verification is enabled via environment variable
 */
const isLiveVerificationEnabled = (): boolean => {
  return process.env.LIVE_VERIFICATION === "true";
};

/**
 * Normalize phone number by removing non-digits and leading zeros
 */
const normalizePhoneNumber = (phone: string): string => {
  return phone.replace(/[^\d]/g, "").replace(/^0+/, "");
};

/**
 * Validate phone number format
 */
const isValidPhoneNumber = (phone: string): boolean => {
  return /^\+?\d{10,15}$/.test(phone);
};

/**
 * Send OTP to the provided WhatsApp number
 * Uses Twilio for live verification or in-memory store for mock verification
 */
export const sendOTP = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const whatsapp = req.body.whatsapp || req.body.phone || req.body.mobile;
  const usecase = req.body.usecase; // 'login' or 'registration'
  // Validate phone number format
  if (!whatsapp || !isValidPhoneNumber(whatsapp)) {
    return res.status(400).json({
      success: false,
      error: "Invalid WhatsApp number format",
    });
  }
  const existingNumber = await prisma.user.findFirst({
    where: { whatsapp: whatsapp },
  });

  if (usecase === "registration") {
    if (existingNumber) {
      return res.status(404).json({
        success: false,
        error: "WhatsApp number already registered",
      });
    }
  } else if (usecase === "login") {
    if (!existingNumber) {
      return res.status(404).json({
        success: false,
        error: "WhatsApp number not registered",
      });
    }
  }

  try {
    const normalizedNumber = normalizePhoneNumber(whatsapp);

    if (!isLiveVerificationEnabled()) {
      // Mock verification mode
      return await handleMockOTPSend(normalizedNumber, res);
    }

    // Live verification mode using Twilio
    return await handleLiveOTPSend(whatsapp, res);
  } catch (error) {
    console.error("Error sending OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Verify OTP code
 * Uses Twilio for live verification or in-memory store for mock verification
 */
export const verifyOTP = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { mobile, code } = req.body;

  // Validate required fields
  if (!mobile || !code) {
    return res.status(400).json({
      success: false,
      message: "Mobile number and OTP code are required",
    });
  }

  try {
    const normalizedNumber = normalizePhoneNumber(mobile);

    if (!isLiveVerificationEnabled()) {
      // Mock verification mode
      return await handleMockOTPVerify(normalizedNumber, code, res);
    }

    // Live verification mode using Twilio
    return await handleLiveOTPVerify(mobile, code, res);
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to verify OTP",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Handle mock OTP sending (development/testing mode)
 */
const handleMockOTPSend = async (
  normalizedNumber: string,
  res: Response
): Promise<Response> => {
  const otp = generateOTP();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes expiry

  // Store OTP in memory
  mockOtpStore.set(normalizedNumber, { otp, expiresAt });

  // Log OTP for development debugging
  if (process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log(`📱 Mock OTP for ${normalizedNumber}: ${otp}`);
  }

  return res.status(200).json({
    success: true,
    message: `OTP sent (mock mode) mockOtp: ${otp}`, // Only show OTP in development
    verification: { status: "pending" },
  });
};

/**
 * Handle live OTP sending using Twilio
 */
const handleLiveOTPSend = async (
  whatsapp: string,
  res: Response
): Promise<Response> => {
  const verification = await twilioClient.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
    .verifications.create({
      to: whatsapp,
      channel: "sms",
    });

  return res.status(200).json({
    success: true,
    message: "OTP sent to your phone number",
    verification: {
      status: verification.status,
      sid: verification.sid,
    },
  });
};

/**
 * Handle mock OTP verification (development/testing mode)
 */
const handleMockOTPVerify = async (
  normalizedNumber: string,
  code: string,
  res: Response
): Promise<Response> => {
  const storedOtp = mockOtpStore.get(normalizedNumber);

  if (!storedOtp) {
    return res.status(400).json({
      success: false,
      message: "No OTP found. Please request a new OTP.",
    });
  }

  // Check if OTP has expired
  if (Date.now() > storedOtp.expiresAt) {
    mockOtpStore.delete(normalizedNumber);
    return res.status(400).json({
      success: false,
      message: "OTP has expired. Please request a new one.",
    });
  }

  // Verify OTP code
  if (storedOtp.otp === code) {
    // OTP verified successfully - remove from store
    mockOtpStore.delete(normalizedNumber);
    return res.status(200).json({
      success: true,
      message: "OTP verified successfully (mock mode)",
    });
  } else {
    return res.status(400).json({
      success: false,
      message: "Invalid OTP code",
    });
  }
};

/**
 * Handle live OTP verification using Twilio
 */
const handleLiveOTPVerify = async (
  mobile: string,
  code: string,
  res: Response
): Promise<Response> => {
  const verificationCheck = await twilioClient.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
    .verificationChecks.create({
      to: mobile,
      code: code,
    });

  if (verificationCheck.status === "approved") {
    return res.json({
      success: true,
      message: "OTP verified successfully",
    });
  }

  return res.status(400).json({
    success: false,
    message: "Invalid or expired OTP code",
  });
};

/**
 * Clear expired OTPs from memory (utility function)
 * Can be called periodically to clean up memory
 */
export const clearExpiredOTPs = (): number => {
  const now = Date.now();
  let clearedCount = 0;

  for (const [key, value] of mockOtpStore.entries()) {
    if (now > value.expiresAt) {
      mockOtpStore.delete(key);
      clearedCount++;
    }
  }

  if (clearedCount > 0 && process.env.NODE_ENV === "development") {
    // eslint-disable-next-line no-console
    console.log(`🧹 Cleared ${clearedCount} expired OTPs from memory`);
  }

  return clearedCount;
};

/**
 * Get current OTP store statistics (for debugging/monitoring)
 */
export const getOTPStoreStats = () => {
  return {
    totalStored: mockOtpStore.size,
    isLiveMode: isLiveVerificationEnabled(),
  };
};
