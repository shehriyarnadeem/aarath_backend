import admin from "firebase-admin";
import path from "path";

const serviceAccountPath = path.join(
  "/home/ubuntu/secrets/serviceAccountKey.json"
);

admin.initializeApp({
  credential: admin.credential.cert(require(serviceAccountPath)),
});

export default admin;
