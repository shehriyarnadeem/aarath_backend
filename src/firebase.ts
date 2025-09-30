const admin = require("firebase-admin");
const dotenv = require("dotenv");
dotenv.config();

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } catch (err) {
    console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT from .env", err);
  }
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
