import { Router } from "express";
import { auctionJobs } from "../jobs/auctionJobs";
// import { cleanupJobs } from '../jobs/cleanupJobs';
// import { notificationJobs } from '../jobs/notificationJobs';
// import { statsJobs } from '../jobs/statsJobs';
import { CronJobManager } from "../jobs/cronJobs";

const router = Router();

/**
 * Test Auction Jobs
 */

// Individual job test endpoints
router.post("/test/auction/expired", async (req, res) => {
  try {
    console.log("Testing expired auctions check...");
    await auctionJobs.checkExpiredAuctions();
    res.json({
      success: true,
      message: "Expired auctions check completed successfully",
    });
  } catch (error) {
    console.error("Error testing expired auctions check:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Test auction cleanup
// Note: auction cleanup method not yet implemented
// router.post('/test/cleanup/auctions', async (req, res) => {
//   try {
//     console.log('Testing auction cleanup...');
//     await auctionJobs.cleanupOldAuctions();
//     res.json({ success: true, message: 'Old auctions cleanup completed successfully' });
//   } catch (error) {
//     console.error('Error testing auction cleanup:', error);
//     res.status(500).json({
//       success: false,
//       error: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// });

/**
 * Test Cleanup Jobs (when uncommented)
 */

// router.post('/test/cleanup/old-data', async (req, res) => {
//   try {
//     await cleanupJobs.cleanupOldData();
//     res.json({
//       success: true,
//       message: 'Old data cleanup completed successfully',
//       timestamp: new Date().toISOString()
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to cleanup old data',
//       error: error instanceof Error ? error.message : 'Unknown error',
//       timestamp: new Date().toISOString()
//     });
//   }
// });

// router.post('/test/cleanup/temp-files', async (req, res) => {
//   try {
//     await cleanupJobs.cleanupTempFiles();
//     res.json({
//       success: true,
//       message: 'Temporary files cleanup completed successfully',
//       timestamp: new Date().toISOString()
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to cleanup temporary files',
//       error: error instanceof Error ? error.message : 'Unknown error',
//       timestamp: new Date().toISOString()
//     });
//   }
// });

/**
 * Test Notification Jobs (when uncommented)
 */

// router.post('/test/notifications/ending-reminders', async (req, res) => {
//   try {
//     await notificationJobs.sendAuctionEndingReminders();
//     res.json({
//       success: true,
//       message: 'Auction ending reminders sent successfully',
//       timestamp: new Date().toISOString()
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to send auction ending reminders',
//       error: error instanceof Error ? error.message : 'Unknown error',
//       timestamp: new Date().toISOString()
//     });
//   }
// });

// router.post('/test/notifications/queue', async (req, res) => {
//   try {
//     await notificationJobs.processNotificationQueue();
//     res.json({
//       success: true,
//       message: 'Notification queue processed successfully',
//       timestamp: new Date().toISOString()
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to process notification queue',
//       error: error instanceof Error ? error.message : 'Unknown error',
//       timestamp: new Date().toISOString()
//     });
//   }
// });

/**
 * Test Statistics Jobs (when uncommented)
 */

// router.post('/test/stats/daily-reports', async (req, res) => {
//   try {
//     const report = await statsJobs.generateDailyReports();
//     res.json({
//       success: true,
//       message: 'Daily reports generated successfully',
//       data: report,
//       timestamp: new Date().toISOString()
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to generate daily reports',
//       error: error instanceof Error ? error.message : 'Unknown error',
//       timestamp: new Date().toISOString()
//     });
//   }
// });

// router.post('/test/stats/user-activity', async (req, res) => {
//   try {
//     await statsJobs.updateUserActivityStats();
//     res.json({
//       success: true,
//       message: 'User activity stats updated successfully',
//       timestamp: new Date().toISOString()
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: 'Failed to update user activity stats',
//       error: error instanceof Error ? error.message : 'Unknown error',
//       timestamp: new Date().toISOString()
//     });
//   }
// });

/**
 * Cron Job Management
 */

// Get cron job status
router.get("/status", (req, res) => {
  try {
    const status = CronJobManager.getStatus();
    res.json({
      success: true,
      message: "Cron job status retrieved successfully",
      data: {
        totalJobs: status.length,
        jobs: status,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get cron job status",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Restart cron jobs
router.post("/restart", async (req, res) => {
  try {
    CronJobManager.stop();
    await CronJobManager.initialize();
    CronJobManager.start();

    res.json({
      success: true,
      message: "Cron jobs restarted successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to restart cron jobs",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Stop cron jobs
router.post("/stop", (req, res) => {
  try {
    CronJobManager.stop();
    res.json({
      success: true,
      message: "Cron jobs stopped successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to stop cron jobs",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

// Start cron jobs
router.post("/start", (req, res) => {
  try {
    CronJobManager.start();
    res.json({
      success: true,
      message: "Cron jobs started successfully",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to start cron jobs",
      error: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * Test All Jobs (run all available tests)
 */
// router.post("/test/all", async (req, res) => {
//   const results = [];
//   const startTime = Date.now();

//   try {
//     // Test auction jobs
//     try {
//       await auctionJobs.checkExpiredAuctions();
//       results.push({ job: "checkExpiredAuctions", status: "success" });
//     } catch (error) {
//       results.push({
//         job: "checkExpiredAuctions",
//         status: "failed",
//         error: error instanceof Error ? error.message : "Unknown error",
//       });
//     }

//     try {
//       await auctionJobs.updateAuctionStats();
//       results.push({ job: "updateAuctionStats", status: "success" });
//     } catch (error) {
//       results.push({
//         job: "updateAuctionStats",
//         status: "failed",
//         error: error instanceof Error ? error.message : "Unknown error",
//       });
//     }

//     try {
//       await auctionJobs.cleanupOldAuctions();
//       results.push({ job: "cleanupOldAuctions", status: "success" });
//     } catch (error) {
//       results.push({
//         job: "cleanupOldAuctions",
//         status: "failed",
//         error: error instanceof Error ? error.message : "Unknown error",
//       });
//     }

//     const endTime = Date.now();
//     const executionTime = endTime - startTime;

//     const successCount = results.filter((r) => r.status === "success").length;
//     const failedCount = results.filter((r) => r.status === "failed").length;

//     res.json({
//       success: failedCount === 0,
//       message: `All available cron jobs tested. ${successCount} succeeded, ${failedCount} failed`,
//       data: {
//         executionTimeMs: executionTime,
//         totalJobs: results.length,
//         successCount,
//         failedCount,
//         results,
//       },
//       timestamp: new Date().toISOString(),
//     });
//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Failed to run all tests",
//       error: error instanceof Error ? error.message : "Unknown error",
//       data: {
//         partialResults: results,
//       },
//       timestamp: new Date().toISOString(),
//     });
//   }
// });

export { router as cronTestRouter };
