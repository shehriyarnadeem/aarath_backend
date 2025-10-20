// src/modules/test/utils.ts
import { testPrismaService } from "./prismaService";

export const testUtils = {
  // Create multiple test counters
  async createTestCounters(count: number = 5): Promise<void> {
    const promises = [];
    for (let i = 1; i <= count; i++) {
      promises.push(testPrismaService.incrementCounter(`test-counter-${i}`, 0));
    }
    await Promise.all(promises);
    console.log(`✅ Created ${count} test counters`);
  },

  // Reset all test counters
  async resetTestCounters(): Promise<void> {
    const counters = await testPrismaService.getAllCounters();
    const resetPromises = counters.map((counter) =>
      testPrismaService.resetCounter(counter.counterId)
    );
    await Promise.all(resetPromises);
    console.log("✅ Reset all test counters");
  },

  // Cleanup test data
  async cleanupTestData(): Promise<void> {
    await testPrismaService.cleanupTestData();
    console.log("✅ Cleaned up test data");
  },

  // Get test statistics
  async getTestStats() {
    return await testPrismaService.getTestStats();
  },

  // Cleanup expired connections
  async cleanupExpiredConnections(): Promise<number> {
    return await testPrismaService.cleanupExpiredConnections();
  },
};
