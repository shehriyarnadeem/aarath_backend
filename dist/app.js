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
const routes_2 = __importDefault(require("./modules/products/routes"));
// Load variables from .env file
dotenv_1.default.config();
const app = (0, express_1.default)();
// Enable CORS (adjust allowed origins if needed)
app.use((0, cors_1.default)());
// Parse JSON request bodies
app.use(express_1.default.json({ limit: "20mb" }));
// Health check route
app.get("/health", (req, res) => {
    res.json({ message: "API is running" });
});
// ==== API routes ====
// OTP Auth routes (no Bearer token required)
app.use("/api/auth/otp", otpAuthRoutes_1.default);
// SSO Auth route (Bearer token required)
app.post("/api/auth", authMiddleware_1.verifyFirebaseToken, async (req, res) => {
    try {
        res.json({ message: "User verified", user: req.user });
    }
    catch (err) {
        res.status(401).json({ error: "Invalid token" });
    }
});
// Onboarding-complete route (no Bearer token required)
app.use("/api/users/onboarding-complete", routes_1.userRouter);
// Protected user routes
app.use("/api/users", authMiddleware_1.verifyFirebaseToken, routes_1.userRouter);
// Product routes
app.use("/api/products", authMiddleware_1.verifyFirebaseToken, routes_2.default);
// ==== Serve React frontend ====
// Serve static files
// app.use(express.static(path.join(__dirname, "frontend_build")));
// // SPA fallback (after APIs)
// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "frontend_build", "index.html"));
// });
// ==== Start server ====
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`✅ Server listening on port ${PORT}`);
});
