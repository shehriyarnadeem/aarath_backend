// src/modules/test/routes.ts
import { Router } from "express";
import {
  getCounter,
  incrementCounter,
  getAllCounters,
  resetCounter,
  getTestStats,
} from "./testController";

const testRouter = Router();

// Get all counters
testRouter.get("/counters", getAllCounters);

// Get specific counter
testRouter.get("/counter/:counterId", getCounter);

// Increment counter
testRouter.post("/counter/:counterId/increment", incrementCounter);

// Reset counter
testRouter.post("/counter/:counterId/reset", resetCounter);

// Get test statistics
testRouter.get("/stats", getTestStats);

export { testRouter };
