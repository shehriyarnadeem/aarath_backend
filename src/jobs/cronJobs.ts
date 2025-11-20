import * as cron from "node-cron";
import { auctionJobs } from "./auctionJobs";
import { processAuctionWinnerNotifications } from "./notificationJobs";
// import { cleanupJobs } from "./cleanupJobs";
// import { statsJobs } from "./statsJobs";

export class CronJobManager {
  private static jobs: cron.ScheduledTask[] = [];
  private static isInitialized = false;

  /**
   * Initialize all cron jobs
   */
  static async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Auction-related jobs
      this.jobs.push(
        // Check for expired auctions every 5 minutes
        cron.schedule("*/1 * * * *", async () => {
          await auctionJobs.checkExpiredAuctions();
        })
      );

      // this.jobs.push(
      //   // Send auction ending reminders every 10 minutes
      //   cron.schedule("*/10 * * * *", async () => {
      //     await notificationJobs.sendAuctionEndingReminders();
      //   })
      // );

      // Cleanup jobs
      // this.jobs.push(
      //   // Clean up old data daily at 2:00 AM
      //   cron.schedule("0 2 * * *", async () => {
      //     await cleanupJobs.cleanupOldData();
      //   })
      // );

      // this.jobs.push(
      //   // Clean up temporary files every 6 hours
      //   cron.schedule("0 */6 * * *", async () => {
      //     await cleanupJobs.cleanupTempFiles();
      //   })
      // );

      // // Statistics jobs
      // this.jobs.push(
      //   // Generate daily reports at 1:00 AM
      //   cron.schedule("0 1 * * *", async () => {
      //     await statsJobs.generateDailyReports();
      //   })
      // );

      // this.jobs.push(
      //   // Update user activity stats every hour
      //   cron.schedule("0 * * * *", async () => {
      //     await statsJobs.updateUserActivityStats();
      //   })
      // );

      // Notification jobs
      // this.jobs.push(
      //   // Process auction winner notifications every 5 minutes
      //   cron.schedule("*/5 * * * *", async () => {
      //     try {
      //       const result = await processAuctionWinnerNotifications();
      //       if (result?.totalProcessed && result.totalProcessed > 0) {
      //         // Winner notifications processed successfully
      //       }
      //     } catch (error) {
      //       console.error("❌ Error processing winner notifications:", error);
      //     }
      //   })
      // );

      // this.jobs.push(
      //   // Process notification queue every 2 minutes
      //   cron.schedule("*/2 * * * *", async () => {
      //     await notificationJobs.processNotificationQueue();
      //   })
      // );

      this.isInitialized = true;
    } catch (error) {
      console.error("❌ Failed to initialize cron jobs:", error);
      throw error;
    }
  }

  /**
   * Start all cron jobs
   */
  static start() {
    if (!this.isInitialized) {
      throw new Error("Cron jobs must be initialized before starting");
    }

    this.jobs.forEach((job) => {
      job.start();
    });
  }

  /**
   * Stop all cron jobs
   */
  static stop() {
    this.jobs.forEach((job) => {
      job.stop();
    });
  }

  /**
   * Get status of all cron jobs
   */
  static getStatus() {
    return this.jobs.map((job, index) => ({
      index,
      running: true, // cron jobs don't expose running status easily
    }));
  }

  /**
   * Graceful shutdown
   */
  static async shutdown() {
    this.stop();

    // Wait for any running jobs to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

// Handle process termination gracefully
process.on("SIGTERM", async () => {
  console.log("📨 SIGTERM received, shutting down cron jobs...");
  await CronJobManager.shutdown();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("📨 SIGINT received, shutting down cron jobs...");
  await CronJobManager.shutdown();
  process.exit(0);
});
