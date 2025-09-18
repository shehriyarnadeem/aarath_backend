import { Router } from "express";
import {
  getUsers,
  createUser,
  getUserById,
  updateUser,
  checkProfileCompletion,
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
