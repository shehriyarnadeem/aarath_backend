// src/modules/test/service.ts
import axios from "axios";
import { testPrismaService } from "./prismaService";
import type { TestCounter, BroadcastPayload } from "./types";

export class TestService {
  async getCounter(counterId: string): Promise<TestCounter> {
    try {
      return await testPrismaService.getCounter(counterId);
    } catch (error) {
      console.error("❌ Database error in getCounter:", error);
      throw new Error("Failed to get counter from database");
    }
  }

  async incrementCounter(
    counterId: string,
    incrementBy: number
  ): Promise<TestCounter> {
    try {
      return await testPrismaService.incrementCounter(counterId, incrementBy);
    } catch (error) {
      console.error("❌ Database error in incrementCounter:", error);
      throw new Error("Failed to increment counter in database");
    }
  }

  async broadcastCounterUpdate(
    counterId: string,
    updateData: BroadcastPayload["updateData"]
  ): Promise<void> {
    try {
      const awsBroadcastEndpoint = process.env.AWS_BROADCAST_ENDPOINT;

      if (!awsBroadcastEndpoint) {
        console.warn(
          "⚠️ AWS_BROADCAST_ENDPOINT not configured, skipping broadcast"
        );
        return;
      }

      const response = await axios.post(
        `${awsBroadcastEndpoint}/test-broadcast`,
        {
          counterId,
          updateData,
        },
        {
          timeout: 5000,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      console.log("✅ Broadcast sent successfully:", response.data);
    } catch (error) {
      console.error(
        "❌ Broadcast failed:",
        error instanceof Error ? error.message : "Unknown error"
      );
      // Don't throw error - broadcast failure shouldn't fail the main request
    }
  }

  async resetCounter(counterId: string): Promise<TestCounter> {
    return await testPrismaService.resetCounter(counterId);
  }

  async getAllCounters(): Promise<TestCounter[]> {
    return await testPrismaService.getAllCounters();
  }

  async getTestStats() {
    return await testPrismaService.getTestStats();
  }

  async cleanupExpiredConnections(): Promise<number> {
    try {
      const cleanedCount = await testPrismaService.cleanupExpiredConnections();
      console.log(
        `🧹 Cleaned up ${cleanedCount} expired WebSocket connections`
      );
      return cleanedCount;
    } catch (error) {
      console.error("❌ Cleanup error:", error);
      throw new Error("Failed to cleanup expired connections");
    }
  }
}
