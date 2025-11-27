import { Router } from "express";
import {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  checkProfileCompletion,
  completeUserOnboarding,
  getUserProfileStats,
} from "./userController";

export const userRouter = Router();

// GET /api/users/ → returns all users
userRouter.get("/", getUsers);

// POST /api/users/ → create a new user
userRouter.post("/", createUser);

// GET /api/users/:id → get user by ID
userRouter.get("/:id", getUserById);

// PUT /api/users/:id → update user
userRouter.put("/:id", updateUser);

// GET /api/users/:id/profile-status → check if user profile is completed
userRouter.get("/:id/profile-status", checkProfileCompletion);

// GET /api/users/:id/profile-stats → get user profile statistics
userRouter.get("/:id/profile-stats", getUserProfileStats);

// POST /api/users/onboarding-complete → onboarding completion and session creation
userRouter.post("/onboarding-complete", completeUserOnboarding);
