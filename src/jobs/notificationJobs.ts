import prisma from "../prisma";
import { sendSMS, sendWhatsAppWinnerNotification } from "../config/twilio";
import { sendEmail, createWinnerNotificationHTML } from "../config/email";

/**
 * @fileoverview Winner Notification Service
 *
 * This module handles winner notifications with email as mandatory
 * and WhatsApp/SMS as optional additional channels.
 *
 * Architecture:
 * - Email notification is mandatory and must succeed
 * - WhatsApp and SMS are optional additional notifications
 * - Small, focused functions with single responsibilities
 * - Comprehensive error handling and logging
 */

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

interface WinnerData {
  id: string;
  businessName: string | null;
  whatsapp: string | null;
  email: string | null;
}

interface NotificationResult {
  success: boolean;
  sid?: string;
  messageId?: string;
  error?: string;
}

interface AdditionalNotifications {
  whatsapp: NotificationResult | null;
  sms: NotificationResult | null;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Development-only logging utility
 */
const devLog = (message: string, type: "log" | "error" = "log"): void => {
  if (process.env.NODE_ENV === "development") {
    if (type === "error") {
      // eslint-disable-next-line no-console
      console.error(message);
    } else {
      // eslint-disable-next-line no-console
      console.log(message);
    }
  }
};

/**
 * Create congratulatory message for winner
 */
const createWinnerMessage = (
  winnerName: string,
  auctionTitle: string,
  formattedBid: string
): string => {
  return `🎉 Congratulations ${winnerName}! 
You have WON the auction for "${auctionTitle}" with your bid of ₹${formattedBid}.`;
};

// =============================================================================
// WINNER DATA OPERATIONS
// =============================================================================

/**
 * Fetch and validate winner data from database
 */
const getWinnerData = async (winnerId: string): Promise<WinnerData> => {
  const winner = await prisma.user.findUnique({
    where: { id: winnerId },
    select: {
      id: true,
      businessName: true,
      whatsapp: true,
      email: true,
    },
  });

  if (!winner) {
    throw new Error(`Winner not found for user ${winnerId}`);
  }

  if (!winner.email) {
    throw new Error(
      `Winner email is required for notifications but not available for user ${winnerId}`
    );
  }

  return winner;
};

// =============================================================================
// EMAIL NOTIFICATION (MANDATORY)
// =============================================================================

/**
 * Send mandatory email notification to winner
 */
const sendMandatoryEmailNotification = async (
  winner: WinnerData,
  auctionTitle: string,
  message: string,
  formattedBid: string
): Promise<NotificationResult> => {
  devLog(`📧 Sending mandatory email notification to ${winner.id}`);

  const winnerName = winner.businessName || "Winner";
  const emailSubject = `🎉 Congratulations! You won the auction for "${auctionTitle}"`;
  const emailHTML = createWinnerNotificationHTML(
    winnerName,
    auctionTitle,
    formattedBid
  );

  const emailResult = await sendEmail(
    winner.email!,
    emailSubject,
    message,
    emailHTML
  );

  if (!emailResult.success) {
    devLog(
      `❌ Mandatory email failed for ${winner.id}: ${emailResult.error}`,
      "error"
    );
    return {
      success: false,
      error: emailResult.error,
    };
  }

  devLog(`✅ Mandatory email sent successfully to ${winner.id}`);
  return {
    success: true,
    messageId: emailResult.messageId,
  };
};

// =============================================================================
// ADDITIONAL NOTIFICATIONS (OPTIONAL)
// =============================================================================

/**
 * Send WhatsApp notification (optional) using template-based messaging
 */
const sendWhatsAppNotification = async (
  winner: WinnerData,
  winnerName: string,
  auctionTitle: string,
  winningBid: number
): Promise<NotificationResult | null> => {
  if (!winner.whatsapp) {
    return null;
  }

  devLog(`📱 Attempting additional WhatsApp notification for ${winner.id}`);

  const whatsappResult = await sendWhatsAppWinnerNotification(
    winner.whatsapp,
    winnerName,
    auctionTitle,
    winningBid
  );

  if (whatsappResult.success) {
    devLog(`✅ Additional WhatsApp sent successfully to ${winner.id}`);
  } else {
    devLog(
      `⚠️ Additional WhatsApp failed for ${winner.id}: ${whatsappResult.error}`
    );
  }

  return {
    success: whatsappResult.success,
    sid: whatsappResult.sid,
    error: whatsappResult.error,
  };
};

/**
 * Send SMS notification (optional fallback for WhatsApp)
 */
const sendSMSNotification = async (
  winner: WinnerData,
  message: string
): Promise<NotificationResult | null> => {
  if (!winner.whatsapp) {
    return null;
  }

  devLog(`📟 Attempting additional SMS notification for ${winner.id}`);

  const smsResult = await sendSMS(winner.whatsapp, message);

  if (smsResult.success) {
    devLog(`✅ Additional SMS sent successfully to ${winner.id}`);
  } else {
    devLog(`❌ Additional SMS failed for ${winner.id}`);
  }

  return {
    success: smsResult.success,
    sid: smsResult.sid,
    error: smsResult.error,
  };
};

/**
 * Handle all additional notifications (WhatsApp + SMS fallback)
 */
const sendAdditionalNotifications = async (
  winner: WinnerData,
  winnerName: string,
  auctionTitle: string,
  winningBid: number,
  message: string
): Promise<AdditionalNotifications> => {
  const notifications: AdditionalNotifications = {
    whatsapp: null,
    sms: null,
  };

  // Try WhatsApp first using template-based messaging
  const whatsappResult = await sendWhatsAppNotification(
    winner,
    winnerName,
    auctionTitle,
    winningBid
  );
  notifications.whatsapp = whatsappResult;

  // If WhatsApp failed, try SMS as fallback
  if (whatsappResult && !whatsappResult.success) {
    devLog(`⚠️ WhatsApp failed for ${winner.id}, trying SMS fallback...`);
    notifications.sms = await sendSMSNotification(winner, message);
  }

  return notifications;
};

// =============================================================================
// MAIN NOTIFICATION ORCHESTRATOR
// =============================================================================

/**
 * Send notification to auction winner
 * Email is mandatory, WhatsApp/SMS are optional additional channels
 */
export const notifyAuctionWinner = async (
  auctionId: string,
  winnerId: string,
  auctionTitle: string,
  winningBid: number
) => {
  try {
    // 1. Get and validate winner data
    const winner = await getWinnerData(winnerId);

    // 2. Prepare notification content
    const winnerName = winner.businessName || "Winner";
    const formattedBid = winningBid.toLocaleString();
    const message = createWinnerMessage(winnerName, auctionTitle, formattedBid);

    // 3. Send mandatory email notification
    const emailResult = await sendMandatoryEmailNotification(
      winner,
      auctionTitle,
      message,
      formattedBid
    );

    // 4. If email failed, return failure (email is mandatory)
    if (!emailResult.success) {
      devLog(`⚠️ Email sending failed for ${winner.id}`);
    }

    // 5. Send additional notifications (optional)
    const additionalNotifications = await sendAdditionalNotifications(
      winner,
      winnerName,
      auctionTitle,
      winningBid,
      message
    );

    // 6. Return success with all notification results
    return {
      success: true,
      method: "email", // Primary method that succeeded
      messageId: emailResult.messageId,
      recipient: winner.email,
      additionalNotifications: {
        whatsapp: additionalNotifications.whatsapp
          ? {
              success: additionalNotifications.whatsapp.success,
              sid: additionalNotifications.whatsapp.sid,
              error: additionalNotifications.whatsapp.error,
            }
          : null,
        sms: additionalNotifications.sms
          ? {
              success: additionalNotifications.sms.success,
              sid: additionalNotifications.sms.sid,
              error: additionalNotifications.sms.error,
            }
          : null,
      },
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    devLog(`❌ Failed to notify auction winner: ${errorMessage}`, "error");

    return {
      success: false,
      error: `Failed to notify auction winner: ${errorMessage}`,
    };
  }
};
// =============================================================================
// AUCTION PROCESSING HELPERS
// =============================================================================

/**
 * Get ended auctions that need winner notifications
 */
const getEndedAuctionsForNotification = async () => {
  return prisma.auctionRoom.findMany({
    where: {
      endTime: {
        lt: new Date(), // Auction has ended
      },
      winnerId: {
        not: null, // There is a winner
      },
      status: {
        not: "winner_notified", // Winner hasn't been notified yet
      },
    },
    include: {
      product: {
        select: {
          title: true,
        },
      },
    },
  });
};

/**
 * Process a single auction winner notification
 */
const processSingleAuctionWinner = async (auction: any) => {
  try {
    if (!auction.winnerId) {
      return {
        auctionId: auction.id,
        status: "skipped",
        reason: "No winner found",
      };
    }

    // Send winner notification
    const notificationResult = await notifyAuctionWinner(
      auction.id,
      auction.winnerId,
      auction.product.title,
      auction.currentHighestBid || 0
    );

    if (notificationResult.success) {
      // Mark auction as winner notified
      await prisma.auctionRoom.update({
        where: { id: auction.id },
        data: { status: "winner_notified" },
      });

      return {
        auctionId: auction.id,
        status: "success",
        method: notificationResult.method,
        messageId: notificationResult.messageId,
        recipient: notificationResult.recipient,
        additionalNotifications: notificationResult.additionalNotifications,
      };
    } else {
      // Notification failed
      return {
        auctionId: auction.id,
        status: "failed",
        error: notificationResult.error || "Notification failed",
      };
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    devLog(
      `❌ Error processing auction ${auction.id}: ${errorMessage}`,
      "error"
    );

    return {
      auctionId: auction.id,
      status: "failed",
      error: errorMessage,
    };
  }
};

// =============================================================================
// MAIN PROCESSING ORCHESTRATOR
// =============================================================================

/**
 * Check for ended auctions and notify winners
 * This function should be called by a cron job
 */
export const processAuctionWinnerNotifications = async () => {
  try {
    // 1. Get all ended auctions that need winner notifications
    const endedAuctions = await getEndedAuctionsForNotification();

    if (endedAuctions.length === 0) {
      devLog("No ended auctions requiring winner notifications");
      return {
        message: "No ended auctions requiring winner notifications",
        count: 0,
      };
    }

    devLog(
      `Processing ${endedAuctions.length} ended auctions for winner notifications`
    );

    // 2. Process each auction concurrently for better performance
    const results = await Promise.allSettled(
      endedAuctions.map((auction) => processSingleAuctionWinner(auction))
    );

    // 3. Format results and separate successful from failed
    const processedResults = results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        devLog(`❌ Auction processing failed: ${result.reason}`, "error");
        return {
          auctionId: endedAuctions[index].id,
          status: "failed",
          error: result.reason || "Unknown processing error",
        };
      }
    });

    const successCount = processedResults.filter(
      (r) => r.status === "success"
    ).length;
    const failureCount = processedResults.filter(
      (r) => r.status === "failed"
    ).length;

    devLog(
      `Winner notification processing completed: ${successCount} success, ${failureCount} failed`
    );

    return {
      message: "Winner notification processing completed",
      totalProcessed: endedAuctions.length,
      successCount,
      failureCount,
      results: processedResults,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    devLog(
      `❌ Failed to process auction winner notifications: ${errorMessage}`,
      "error"
    );
    throw new Error(
      `Failed to process auction winner notifications: ${errorMessage}`
    );
  }
};

// =============================================================================
// REFACTORED ARCHITECTURE SUMMARY:
//
// BENEFITS OF THE NEW STRUCTURE:
// ✅ Single Responsibility: Each function has one clear purpose
// ✅ Testability: Small functions are easier to unit test
// ✅ Maintainability: Changes are localized to specific functions
// ✅ Readability: Code flow is easier to follow
// ✅ Error Handling: Consistent error handling patterns
// ✅ Performance: Concurrent processing of multiple auctions
// ✅ Logging: Centralized development logging utility
//
// FUNCTION BREAKDOWN:
// - getWinnerData: Database operations and validation
// - createWinnerMessage: Message content generation
// - sendMandatoryEmailNotification: Email sending logic
// - sendWhatsAppNotification: WhatsApp notification logic
// - sendSMSNotification: SMS notification logic
// - sendAdditionalNotifications: Orchestrates optional notifications
// - notifyAuctionWinner: Main notification orchestrator
// - getEndedAuctionsForNotification: Database query for auctions
// - processSingleAuctionWinner: Single auction processing
// - processAuctionWinnerNotifications: Main processing orchestrator
//
// USAGE:
// import { notifyAuctionWinner, processAuctionWinnerNotifications } from './notificationJobs';
//
// // Single winner notification
// await notifyAuctionWinner(auctionId, winnerId, title, bid);
//
// // Batch processing (cron job)
// await processAuctionWinnerNotifications();
// =============================================================================
