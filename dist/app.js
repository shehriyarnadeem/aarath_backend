"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const authMiddleware_1 = require("./middleware/authMiddleware");
const routes_1 = require("./modules/users/routes");
const otpAuthRoutes_1 = __importDefault(require("./modules/auth/otpAuthRoutes"));
// Load variables from .env file
dotenv_1.default.config();
const app = (0, express_1.default)();
// Enable CORS for all routes (adjust origins as needed)
app.use((0, cors_1.default)());
// Parse JSON request bodies
app.use(express_1.default.json());
// Health check route
app.get("/", (req, res) => {
    res.json({ message: "API is running" });
});
// OTP Auth routes (no Bearer token required)
app.use("/api/auth/otp", otpAuthRoutes_1.default);
// SSO Auth route (Bearer token required)
app.post("/api/auth", authMiddleware_1.verifyFirebaseToken, async (req, res) => {
    try {
        // decoded contains user info (uid, email, etc.)
        res.json({ message: "User verified", user: req.user });
    }
    catch (err) {
        res.status(401).json({ error: "Invalid token" });
    }
});
// Protected API routes
app.use("/api/users", authMiddleware_1.verifyFirebaseToken, routes_1.userRouter);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Server listening on port ${PORT}`);
});
