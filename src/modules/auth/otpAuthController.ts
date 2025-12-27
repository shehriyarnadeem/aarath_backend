import { Request, Response } from "express";
import { twilioClient } from "../../config/twilio";
import prisma from "../../prisma";
import admin from "../../firebase";

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
  const { mobile, code, usecase } = req.body;

  // Validate required fields
  if (!mobile || !code) {
    return res.status(400).json({
      success: false,
      message: "Mobile number and OTP code are required",
    });
  }

  try {
    const normalizedNumber = normalizePhoneNumber(mobile);
    let otpResponse = { success: false };
    let user = { success: false };
    if (!isLiveVerificationEnabled()) {
      // Mock verification mode
      otpResponse = await handleMockOTPVerify(normalizedNumber, code);
    } else {
      otpResponse = await handleLiveOTPVerify(mobile, code);
    }

    if (!otpResponse?.success) {
      return res.status(401).json(otpResponse);
    }
    if (usecase === "registration" && otpResponse.success) {
      user = await createUserWithSession(mobile);
    } else if (usecase === "login" && otpResponse.success) {
      user = await signInUser(mobile);
    } else if (otpResponse?.success) {
      return res.status(200).json({ ...otpResponse });
    }

    return res.status(200).json({
      success: true,
      user: { ...user },
      otp: { ...otpResponse },
    });
  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

const signInUser = async (mobile: string) => {
  try {
    const user = await prisma.user.findFirst({
      where: { whatsapp: mobile },
    });

    if (!user) {
      return { success: false, message: "User not found" };
    }

    // Ensure Firebase user exists with this UID
    try {
      await admin.auth().getUser(user.id);
    } catch (error: any) {
      // User doesn't exist in Firebase, create one
      if (error.code === "auth/user-not-found") {
        await admin.auth().createUser({
          uid: user.id,
          phoneNumber: mobile,
        });
        if (process.env.NODE_ENV === "development") {
          console.log("✅ Created Firebase user with UID:", user.id);
        }
      } else {
        throw error;
      }
    }

    const customToken = await admin.auth().createCustomToken(String(user.id));
    if (process.env.NODE_ENV === "development") {
      console.log("🔐 Generated custom token:", customToken.slice(0, 60) + "...");
    }

    return { success: true, token: customToken };
  } catch (error) {
    console.error("Error signing user:", error);
    return { success: false, message: "Failed to sign user" };
  }
};

const createUserWithSession = async (mobile: string) => {
  // Create user in the database
  try {
    // Check for duplicate email or id
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ whatsapp: mobile }],
      },
    });
    if (existingUser) {
      return { success: false, message: "User already exists" };
    }

    const user = await prisma.user.create({
      data: {
        whatsapp: mobile,
        whatsappVerified: true,
        profileCompleted: false,
      } as import("@prisma/client").Prisma.UserUncheckedCreateInput,
    });

    // Create corresponding Firebase user with the same UID
    try {
      await admin.auth().createUser({
        uid: user.id,
        phoneNumber: mobile,
      });
      if (process.env.NODE_ENV === "development") {
        console.log("✅ Created Firebase user with UID:", user.id);
      }
    } catch (error: any) {
      // If Firebase user creation fails, log it but don't fail the whole flow
      console.error("Warning: Firebase user creation failed:", error.message);
    }

    // Issue Firebase custom token for session
    const customToken = await admin.auth().createCustomToken(String(user.id));
    if (process.env.NODE_ENV === "development") {
      console.log("🔐 Generated custom token:", customToken.slice(0, 60) + "...");
    }
    return { success: true, token: customToken };
  } catch (error) {
    console.error("Error creating user:", error);
    return { success: false, message: "Failed to create user" };
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
  code: string
): Promise<any> => {
  const storedOtp = mockOtpStore.get(normalizedNumber);

  if (!storedOtp) {
    return {
      success: false,
      message: "No OTP found. Please request a new OTP.",
    };
  }

  // Check if OTP has expired
  if (Date.now() > storedOtp.expiresAt) {
    mockOtpStore.delete(normalizedNumber);
    return {
      success: false,
      message: "OTP has expired. Please request a new one.",
    };
  }

  // Verify OTP code
  if (storedOtp.otp === code) {
    // OTP verified successfully - remove from store
    mockOtpStore.delete(normalizedNumber);
    return { success: true, message: "OTP verified successfully" };
  } else {
    return { success: false, message: "Invalid or expired OTP code" };
  }
};

/**
 * Handle live OTP verification using Twilio
 */
const handleLiveOTPVerify = async (
  mobile: string,
  code: string
): Promise<any> => {
  const verificationCheck = await twilioClient.verify.v2
    .services(process.env.TWILIO_VERIFY_SERVICE_SID!)
    .verificationChecks.create({
      to: mobile,
      code: code,
    });

  if (verificationCheck.status === "approved") {
    return { success: true, message: "OTP verified successfully" };
  }

  return { success: false, message: "Invalid or expired OTP code" };
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
