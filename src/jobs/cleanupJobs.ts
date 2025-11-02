import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

export const cleanupJobs = {
  /**
   * Clean up old data from the database
   */
  async cleanupOldData() {
    try {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      // Clean up old test counters (if any)
      const deletedCounters = await prisma.testCounter.deleteMany({
        where: {
          updatedAt: {
            lte: sevenDaysAgo,
          },
        },
      });

      // Clean up old inactive auction participants
      const deletedParticipants = await prisma.auctionParticipant.deleteMany({
        where: {
          hasLeftRoom: true,
          lastSeenAt: {
            lte: sevenDaysAgo,
          },
        },
      });

      console.log(`Cleaned up ${deletedCounters.count} old test counters`);
      console.log(
        `Cleaned up ${deletedParticipants.count} old auction participants`
      );
    } catch (error) {
      console.error("Error cleaning up old data:", error);
    }
  },

  /**
   * Clean up temporary files
   */
  async cleanupTempFiles() {
    try {
      const tempDir = path.join(process.cwd(), "temp");

      // Check if temp directory exists
      if (!fs.existsSync(tempDir)) {
        console.log("No temp directory found, skipping cleanup");
        return;
      }

      const files = fs.readdirSync(tempDir);
      let deletedCount = 0;

      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago

      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const stats = fs.statSync(filePath);

        // Delete files older than 24 hours
        if (stats.mtime.getTime() < oneDayAgo) {
          try {
            fs.unlinkSync(filePath);
            deletedCount++;
          } catch (err) {
            console.error(`Error deleting file ${filePath}:`, err);
          }
        }
      }

      if (deletedCount > 0) {
        console.log(`Deleted ${deletedCount} temporary files`);
      }
    } catch (error) {
      console.error("Error cleaning up temp files:", error);
    }
  },

  /**
   * Clean up inactive sessions or expired tokens
   */
  async cleanupExpiredSessions() {
    try {
      // Since we're using Firebase Auth, we don't need to clean up sessions locally
      // But we could clean up any cached user data that's expired

      // For now, just log that this job ran
      console.log("Session cleanup completed (using Firebase Auth)");
    } catch (error) {
      console.error("Error cleaning up expired sessions:", error);
    }
  },
};
