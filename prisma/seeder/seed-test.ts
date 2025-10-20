// prisma/seed-test.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedTestData() {
  console.log("🌱 Seeding test data...");

  try {
    // Clear existing test data
    console.log("🧹 Cleaning existing test data...");
    await prisma.webSocketConnection.deleteMany();
    await prisma.testCounter.deleteMany();

    // Create test counters
    const testCounters = [
      { counterId: "auction-demo-1", value: 25 },
      { counterId: "auction-demo-2", value: 42 },
      { counterId: "live-bidding-test", value: 15 },
      { counterId: "websocket-demo", value: 8 },
      { counterId: "realtime-counter", value: 100 },
      { counterId: "performance-test", value: 0 },
      { counterId: "multi-user-test", value: 33 },
    ];

    console.log("📊 Creating test counters...");
    for (const counter of testCounters) {
      await prisma.testCounter.create({
        data: counter,
      });
      console.log(
        `✅ Created counter: ${counter.counterId} = ${counter.value}`
      );
    }

    // Create some sample WebSocket connections (for demonstration)
    const sampleConnections = [
      {
        connectionId: "demo-conn-1",
        counterId: "auction-demo-1",
        userId: "user-123",
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      },
      {
        connectionId: "demo-conn-2",
        counterId: "auction-demo-1",
        userId: "user-456",
        expiresAt: new Date(Date.now() + 3600000),
      },
      {
        connectionId: "demo-conn-3",
        counterId: "live-bidding-test",
        userId: "user-789",
        expiresAt: new Date(Date.now() + 3600000),
      },
    ];

    console.log("🔗 Creating sample WebSocket connections...");
    for (const conn of sampleConnections) {
      await prisma.webSocketConnection.create({
        data: conn,
      });
      console.log(
        `✅ Created connection: ${conn.connectionId} → ${conn.counterId}`
      );
    }

    // Get stats
    const totalCounters = await prisma.testCounter.count();
    const totalConnections = await prisma.webSocketConnection.count();
    const totalValue = await prisma.testCounter.aggregate({
      _sum: { value: true },
    });

    console.log("\n📈 Seed Summary:");
    console.log(`   Total Counters: ${totalCounters}`);
    console.log(`   Total Value: ${totalValue._sum.value}`);
    console.log(`   Active Connections: ${totalConnections}`);
    console.log("\n🎉 Test data seeded successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  }
}

// Execute seeding
seedTestData()
  .catch((e) => {
    console.error("💥 Seed error:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
