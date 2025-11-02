import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
import * as fs from "fs";

dotenv.config();

function initFirebase() {
  if (admin.apps.length) return admin.app();

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
        databaseURL: "https://aarath-72ec4-default-rtdb.firebaseio.com/",
      });
      console.log("🔥 Firebase initialized from FIREBASE_SERVICE_ACCOUNT");
      return admin.app();
    } catch (err) {
      console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT:", err);
    }
  }

  // Otherwise use the credentials file via GOOGLE_APPLICATION_CREDENTIALS
  if (credPath && fs.existsSync(credPath)) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL: "https://aarath-72ec4-default-rtdb.firebaseio.com/",
    });
    console.log(
      `🔥 Firebase initialized using GOOGLE_APPLICATION_CREDENTIALS at ${credPath}`
    );
    return admin.app();
  }

  throw new Error(
    "No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS."
  );
}

const firebaseAdmin = initFirebase();
export default firebaseAdmin;
