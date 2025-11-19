import { Request, Response } from "express";
import {
  processAuctionWinnerNotifications,
  notifyAuctionWinner,
} from "../jobs/notificationJobs";

/**
 * Manual trigger for processing auction winner notifications
 * GET /api/admin/process-winner-notifications
 */
export const triggerWinnerNotifications = async (
  req: Request,
  res: Response
) => {
  try {
    const result = await processAuctionWinnerNotifications();
    res.json({
      success: true,
      message: "Winner notification processing completed",
      data: result,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
};

/**
 * Manual trigger for sending winner notification to specific user
 * POST /api/admin/notify-winner
 * Body: { auctionId, winnerId, auctionTitle, winningBid }
 */
export const triggerSingleWinnerNotification = async (
  req: Request,
  res: Response
) => {
  try {
    const { auctionId, winnerId, auctionTitle, winningBid } = req.body;

    if (!auctionId || !winnerId || !auctionTitle || !winningBid) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: auctionId, winnerId, auctionTitle, winningBid",
      });
    }

    const result = await notifyAuctionWinner(
      auctionId,
      winnerId,
      auctionTitle,
      winningBid
    );

    res.json({
      success: true,
      message: "Winner notification sent successfully",
      data: result,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
};
