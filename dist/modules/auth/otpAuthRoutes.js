"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const otpAuthController_1 = require("./otpAuthController");
const prisma_1 = __importDefault(require("../../prisma"));
const router = (0, express_1.Router)();
router.post("/request-otp", async (req, res) => {
    const { mobile } = req.body;
    const result = await (0, otpAuthController_1.requestOtp)(mobile);
    return res.status(result.status).json(result.body);
});
router.post("/verify-otp", async (req, res) => {
    const { mobile, otp } = req.body;
    const result = await (0, otpAuthController_1.verifyOtp)(mobile, otp);
    return res.status(result.status).json(result.body);
});
router.post("/verify-otp-signup", async (req, res) => {
    const { mobile, otp } = req.body;
    const result = await (0, otpAuthController_1.verifyOtpSignUp)(mobile, otp);
    return res.status(result.status).json({ success: true });
});
// Step 1: WhatsApp verification with existence check and OTP request
router.post("/verify-whatsapp", async (req, res) => {
    const { whatsapp } = req.body;
    if (!whatsapp || !whatsapp.match(/^\+?\d{10,15}$/)) {
        return res.status(400).json({ error: "Invalid WhatsApp number" });
    }
    // Normalize number
    const normalized = whatsapp.replace(/[^\d]/g, "").replace(/^0+/, "");
    // Check if user already exists
    const user = await prisma_1.default.user.findFirst({
        where: { whatsapp: { endsWith: normalized } },
    });
    if (user) {
        return res.status(409).json({ error: "WhatsApp number already exists" });
    }
    // Generate dummy OTP and save in memory
    const otp = "123456";
    otpAuthController_1.otpStore[normalized] = otp;
    // In real implementation, send OTP via Twilio here
    return res.status(200).json({ success: true, message: "OTP sent", otp });
});
exports.default = router;
