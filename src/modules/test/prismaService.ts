// src/modules/test/prismaService.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export class TestPrismaService {
  async getCounter(counterId: string) {
    const counter = await prisma.testCounter.findUnique({
      where: { counterId },
    });

    if (!counter) {
      // Return default counter structure
      return {
        id: "",
        counterId,
        value: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    return counter;
  }

  async incrementCounter(counterId: string, incrementBy: number) {
    const counter = await prisma.testCounter.upsert({
      where: { counterId },
      update: {
        value: {
          increment: incrementBy,
        },
      },
      create: {
        counterId,
        value: incrementBy,
      },
    });

    return counter;
  }

  async resetCounter(counterId: string) {
    return await prisma.testCounter.upsert({
      where: { counterId },
      update: { value: 0 },
      create: { counterId, value: 0 },
    });
  }

  async getAllCounters() {
    return await prisma.testCounter.findMany({
      orderBy: { updatedAt: "desc" },
    });
  }

  // WebSocket connection management
  async addConnection(
    connectionId: string,
    counterId?: string,
    userId?: string
  ) {
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Expire in 1 hour

    return await prisma.webSocketConnection.upsert({
      where: { connectionId },
      update: {
        counterId,
        userId,
        connectedAt: new Date(),
        expiresAt,
      },
      create: {
        connectionId,
        counterId,
        userId,
        expiresAt,
      },
    });
  }

  async removeConnection(connectionId: string) {
    try {
      await prisma.webSocketConnection.delete({
        where: { connectionId },
      });
    } catch (error) {
      // Connection might not exist, ignore error
      console.log(`Connection ${connectionId} not found for deletion`);
    }
  }

  async getConnectionsByCounter(counterId: string) {
    return await prisma.webSocketConnection.findMany({
      where: {
        counterId,
        expiresAt: {
          gt: new Date(), // Only active connections
        },
      },
    });
  }

  async cleanupExpiredConnections() {
    const result = await prisma.webSocketConnection.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    return result.count;
  }

  async getTestStats() {
    const totalCounters = await prisma.testCounter.count();
    const totalValue = await prisma.testCounter.aggregate({
      _sum: { value: true },
    });
    const activeConnections = await prisma.webSocketConnection.count({
      where: {
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    return {
      totalCounters,
      totalValue: totalValue._sum.value || 0,
      activeConnections,
    };
  }

  async cleanupTestData() {
    await prisma.webSocketConnection.deleteMany();
    await prisma.testCounter.deleteMany();
  }
}

export const testPrismaService = new TestPrismaService();
