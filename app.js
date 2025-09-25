import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { verifyFirebaseToken } from "./src/middleware/authMiddleware";
import { userRouter } from "./src/modules/users/routes";

// Load variables from .env file
dotenv.config();

const app = express();

// Enable CORS for all routes (adjust origins as needed)
app.use(cors());

// Parse JSON request bodies
app.use(express.json());

// Health check route
app.get("/", (req, res) => {
  res.json({ message: "API is running" });
});

app.post("/api/auth", verifyFirebaseToken, async (req, res) => {
  try {
    // decoded contains user info (uid, email, etc.)
    res.json({ message: "User verified", user: req.user });
  } catch (err) {
    res.status(401).json({ error: "Invalid token" });
  }
});

// Protected API routes
app.use("/api/users", verifyFirebaseToken, userRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on port ${PORT}`);
});
