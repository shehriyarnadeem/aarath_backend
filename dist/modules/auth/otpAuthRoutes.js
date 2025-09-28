"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const otpAuthController_1 = require("./otpAuthController");
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
exports.default = router;
