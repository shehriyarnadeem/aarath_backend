"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
dotenv.config();
function initFirebase() {
    if (admin.apps.length)
        return admin.app();
    const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    // If JSON is provided via env, parse & use it
    if (jsonEnv) {
        try {
            const parsed = JSON.parse(jsonEnv);
            if (parsed.private_key && typeof parsed.private_key === "string") {
                // handle escaped newlines if present
                parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
            }
            admin.initializeApp({
                credential: admin.credential.cert(parsed),
            });
            console.log("🔥 Firebase initialized from FIREBASE_SERVICE_ACCOUNT");
            return admin.app();
        }
        catch (err) {
            console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:", err);
        }
    }
    // Otherwise use the credentials file via GOOGLE_APPLICATION_CREDENTIALS
    if (credPath && fs.existsSync(credPath)) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault(),
        });
        console.log(`🔥 Firebase initialized using GOOGLE_APPLICATION_CREDENTIALS at ${credPath}`);
        return admin.app();
    }
    throw new Error("No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS.");
}
const firebaseAdmin = initFirebase();
exports.default = firebaseAdmin;
