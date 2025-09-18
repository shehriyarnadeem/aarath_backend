const admin = require("firebase-admin");

const serviceAccount = require("../serviceAccountKey.json");
// Download this from Firebase Console → Project Settings → Service accounts

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

export default admin;
