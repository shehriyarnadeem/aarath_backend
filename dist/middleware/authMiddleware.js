"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyFirebaseToken = void 0;
const firebase_1 = __importDefault(require("../firebase"));
/**
 * Middleware to verify Firebase ID tokens.  Clients must include
 * a bearer token in the `Authorization` header: `Bearer <token>`.
 * If verification succeeds, the decoded token is attached to
 * `req.user` and the request continues.  Otherwise a 401 response
 * is returned.
 */
async function verifyFirebaseToken(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Authorization header missing" });
    }
    const token = authHeader.replace("Bearer ", "").trim();
    try {
        const decodedToken = await firebase_1.default.auth().verifyIdToken(token);
        // Attach the decoded token to the request for downstream handlers
        req.user = decodedToken;
        next();
    }
    catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}
exports.verifyFirebaseToken = verifyFirebaseToken;
