"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userRouter = void 0;
const express_1 = require("express");
const userController_1 = require("./userController");
exports.userRouter = (0, express_1.Router)();
// GET /api/users/ → returns all users
exports.userRouter.get("/", userController_1.getUsers);
// POST /api/users/ → create a new user
exports.userRouter.post("/", userController_1.createUser);
// GET /api/users/:id → get user by ID
exports.userRouter.get("/:id", userController_1.getUserById);
// PUT /api/users/:id → update user
exports.userRouter.put("/:id", userController_1.updateUser);
// GET /api/users/:id/profile-status → check if user profile is completed
exports.userRouter.get("/:id/profile-status", userController_1.checkProfileCompletion);
// GET /api/users/:id/profile-stats → get user profile statistics
exports.userRouter.get("/:id/profile-stats", userController_1.getUserProfileStats);
// POST /api/users/onboarding-complete → onboarding completion and session creation
exports.userRouter.post("/onboarding-complete", userController_1.createUserWithSession);
