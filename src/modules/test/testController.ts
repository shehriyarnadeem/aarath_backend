// src/modules/test/controller.ts
import { Request, Response } from "express";
import { TestService } from "./testService";

const testService = new TestService();

export const getCounter = async (req: Request, res: Response) => {
  try {
    const { counterId } = req.params;

    const counter = await testService.getCounter(counterId);

    res.json({
      success: true,
      counter,
    });
  } catch (error) {
    console.error("❌ Get counter error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const incrementCounter = async (req: Request, res: Response) => {
  try {
    const { counterId } = req.params;
    const { incrementBy = 1 } = req.body;

    const updatedCounter = await testService.incrementCounter(
      counterId,
      incrementBy
    );

    // Broadcast update via AWS WebSocket
    await testService.broadcastCounterUpdate(counterId, {
      type: "counter_update",
      counterId: counterId,
      value: updatedCounter.value,
      timestamp: updatedCounter.updatedAt,
    });

    res.json({
      success: true,
      counter: updatedCounter,
    });
  } catch (error) {
    console.error("❌ Increment counter error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getAllCounters = async (req: Request, res: Response) => {
  try {
    const counters = await testService.getAllCounters();

    res.json({
      success: true,
      counters,
    });
  } catch (error) {
    console.error("❌ Get all counters error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const resetCounter = async (req: Request, res: Response) => {
  try {
    const { counterId } = req.params;

    const counter = await testService.resetCounter(counterId);

    // Broadcast reset update
    await testService.broadcastCounterUpdate(counterId, {
      type: "counter_reset",
      counterId: counterId,
      value: 0,
      timestamp: counter.updatedAt,
    });

    res.json({
      success: true,
      counter,
    });
  } catch (error) {
    console.error("❌ Reset counter error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

export const getTestStats = async (req: Request, res: Response) => {
  try {
    const stats = await testService.getTestStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("❌ Get stats error:", error);
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
