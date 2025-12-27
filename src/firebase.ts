import * as admin from "firebase-admin";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

function initFirebase() {
  if (admin.apps.length) return admin.app();

  const jsonEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  // Fallback default credentials file in project root: ../serviceAccountKey.json
  const defaultCredPath = path.resolve(__dirname, "..", "serviceAccountKey.json");

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

  // If no env var provided, try default local serviceAccountKey.json
  if (fs.existsSync(defaultCredPath)) {
    try {
      const saContent = fs.readFileSync(defaultCredPath, "utf8");
      console.log(
        `📂 Loading serviceAccountKey.json from: ${defaultCredPath}`
      );
      const sa = JSON.parse(saContent);
      console.log(
        `✓ Parsed serviceAccountKey.json - project_id: ${sa.project_id}, type: ${sa.type}`
      );
      if (sa.private_key && typeof sa.private_key === "string") {
        // Normalize private key: handle both escaped and literal newlines
        sa.private_key = sa.private_key.replace(/\\n/g, "\n");
        console.log(
          `✓ Private key normalized - length: ${sa.private_key.length}`
        );
      }
      console.log("Initializing Firebase Admin SDK...");
      admin.initializeApp({
        credential: admin.credential.cert(sa),
        databaseURL: "https://aarath-72ec4-default-rtdb.firebaseio.com/",
      });
      console.log(`🔥 Firebase initialized from ${defaultCredPath}`);
      return admin.app();
    } catch (err) {
      console.error("❌ Failed to read/parse serviceAccountKey.json:", err);
      if (err instanceof Error) {
        console.error("Error message:", err.message);
        console.error("Error stack:", err.stack);
      }
    }
  }

  throw new Error(
    "No Firebase credentials found. Set FIREBASE_SERVICE_ACCOUNT or GOOGLE_APPLICATION_CREDENTIALS."
  );
}

const firebaseAdmin = initFirebase();
export default firebaseAdmin;
