import firebaseAdmin from "../firebase";
import prisma from "../prisma";
import { notifyAuctionWinner } from "./notificationJobs";

/**
 * @fileoverview Auction Jobs - Handles auction lifecycle management
 *
 * This module manages the complete auction lifecycle including:
 * - Monitoring and processing expired auctions
 * - Synchronizing bid data from Firebase to PostgreSQL
 * - Calculating auction statistics and determining winners
 * - Transferring products back to marketplace after auction ends
 * - Coordinating winner notifications through the notification service
 *
 * @author Aarath Backend Team
 * @version 1.0.0
 */

// =============================================================================
// TYPES AND INTERFACES
// =============================================================================

interface Bid {
  id: string;
  userName?: string;
  amount: number;
  bidderId?: string;
  userId?: string;
  timestamp?: string | number | Date;
}

interface AuctionUpdateData {
  status: string;
  updatedAt: Date;
  totalBids: number;
  totalParticipants: number;
  currentHighestBid: number;
  currentHighestBidderId: string | null;
  winnerId: string | null;
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Format Firebase bids object into structured array
 */
const formatBidsFromFirebase = (bids: any): Bid[] => {
  return Object.entries(bids || {}).map(([id, bid]) => {
    const bidObject =
      typeof bid === "object" && bid !== null ? (bid as any) : {};
    return {
      id,
      userName: bidObject.userName || "",
      amount: bidObject.amount || 0,
      bidderId: bidObject.bidderId || "",
      userId: bidObject.userId || bidObject.bidderId || "",
      timestamp: bidObject.timestamp || new Date().toISOString(),
    };
  });
};

/**
 * Log messages only in development mode
 */
const devLog = (message: string, type: "log" | "error" = "log") => {
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

// =============================================================================
// FIREBASE DATA OPERATIONS
// =============================================================================

/**
 * Fetch auction data from Firebase Realtime Database
 */
const fetchAuctionDataFromFirebase = async (auctionId: string) => {
  try {
    const db = firebaseAdmin.database();
    const auctionRoomRef = db.ref(`aarath/auctions/${auctionId}`);
    const snapshot = await auctionRoomRef.once("value");
    const auctionRoom = snapshot.val();
    if (auctionRoom) {
      return { auctionRoom };
    }

    devLog(`No auctionRoom data found for auctionId: ${auctionId}`, "error");
    return null;
  } catch (error) {
    devLog(`Error fetching auction data from Firebase: ${error}`, "error");
    throw error;
  }
};

// =============================================================================
// DATABASE QUERY OPERATIONS
// =============================================================================

/**
 * Get all expired auctions that need processing
 */
const getExpiredAuctions = () => {
  const now = new Date();
  return prisma.auctionRoom.findMany({
    where: {
      status: "active",
      endTime: { lte: now },
    },
    include: {
      product: true,
      bids: { orderBy: { amount: "desc" } },
    },
  });
};

// =============================================================================
// AUCTION JOBS CLASS - MAIN EXPORT
// =============================================================================

export const auctionJobs = {
  /**
   * Save bid history from Firebase to PostgreSQL database
   * Prevents duplicate bids and marks winning bids
   */
  async saveBidHistory(
    auctionId: string,
    bids: Bid[],
    currentHighestBid?: number
  ): Promise<boolean> {
    try {
      for (const bid of bids) {
        const exists = await prisma.auctionBid.findUnique({
          where: { id: bid.id },
        });

        if (!exists) {
          await prisma.auctionBid.create({
            data: {
              id: bid.id,
              auctionRoomId: auctionId,
              bidderName: bid.userName,
              amount: bid.amount,
              bidderId: bid.userId ?? bid.bidderId ?? "unknown",
              timestamp: bid.timestamp ? new Date(bid.timestamp) : new Date(),
              isWinningBid: Boolean(
                currentHighestBid && bid.amount === currentHighestBid
              ),
            },
          });
        }
      }
      return true;
    } catch (error) {
      devLog(`Error saving bid history: ${error}`, "error");
      throw error;
    }
  },

  /**
   * Transfer auction product back to marketplace environment
   * Called when auction ends
   */
  async transferAuctionProductEnvironment(auction: any): Promise<void> {
    try {
      devLog(
        `Transferring product environment for auction ${auction.id} and product ${auction.productId}`
      );

      await prisma.product.update({
        where: { id: auction.productId },
        data: { environment: "MARKETPLACE" },
      });
      return;
    } catch (error) {
      devLog(
        `Error transferring product environment for auction ${auction.id}: ${error}`,
        "error"
      );
      throw error;
    }
  },

  /**
   * Main method to check and process expired auctions
   * - Fetches expired auctions from database
   * - Retrieves bid data from Firebase
   * - Saves bid history and updates statistics
   * - Transfers products back to marketplace
   * - Notifies winners
   */
  async checkExpiredAuctions() {
    try {
      const expiredAuctions = await getExpiredAuctions();

      for (const auction of expiredAuctions) {
        await this.processExpiredAuction(auction);
      }

      if (expiredAuctions.length > 0) {
        devLog(`Updated ${expiredAuctions.length} expired auctions`);
      }
      return true;
    } catch (error) {
      devLog(`Error checking expired auctions: ${error}`, "error");
      return false;
    }
  },

  /**
   * Process a single expired auction
   */
  async processExpiredAuction(auction: any) {
    try {
      // Fetch auction data from Firebase
      const firebaseData = await fetchAuctionDataFromFirebase(auction.id);
      const bidsObj = firebaseData?.auctionRoom?.bids ?? {};
      const bids = formatBidsFromFirebase(bidsObj);
      const totalBids = firebaseData?.auctionRoom?.totalBids ?? 0;
      const currentHighestBid =
        firebaseData?.auctionRoom?.currentHighestBid ?? auction.startingBid;
      let winnerNotified = null;
      // Process auction based on whether there were bids
      if (bids.length > 0) {
        await this.saveBidHistory(auction.id, bids, currentHighestBid);
        const updatedAuction = await this.updateAuctionStats(
          auction,
          bids,
          currentHighestBid,
          totalBids
        );
        devLog(`Auction ${auction.id} completed with ${bids.length} bids`);

        // Notify winner if there is one
        if (updatedAuction.winnerId) {
          winnerNotified = await notifyAuctionWinner(
            auction.id,
            updatedAuction.winnerId,
            auction.product.title,
            currentHighestBid || 0
          );
        }
      } else {
        await this.updateAuctionStats(auction, []);
        devLog(`Auction ${auction.id} completed with no bids`);
      }

      // Transfer product back to marketplace
      await this.transferAuctionProductEnvironment(auction);
      return { notificationStatus: { ...winnerNotified }, success: true };
    } catch (error) {
      devLog(
        `Error processing expired auction ${auction.id}: ${error}`,
        "error"
      );
      throw error;
    }
  },

  /**
   * Update auction statistics and determine winner
   * Calculates total bids, participants, and identifies the highest bidder
   */
  async updateAuctionStats(
    auction: any,
    bids: Bid[] = [],
    currentHighestBid?: number,
    totalBids?: number
  ) {
    try {
      // Calculate unique participants
      const uniqueBidders = new Set(
        bids.map((bid) => bid.bidderId ?? bid.userId).filter(Boolean)
      );

      // Find the highest bid and winner
      let highestBid: Bid | undefined;
      if (bids.length > 0) {
        highestBid = bids.reduce(
          (max, bid) => (bid.amount > (max?.amount ?? -Infinity) ? bid : max),
          undefined as Bid | undefined
        );
      }

      // Prepare update data
      const updateData: AuctionUpdateData = {
        status: "ended",
        updatedAt: new Date(),
        totalBids: totalBids ?? bids.length,
        totalParticipants: uniqueBidders.size,
        currentHighestBid: currentHighestBid ?? auction.startingBid,
        currentHighestBidderId: highestBid?.userId ?? null,
        winnerId: highestBid?.userId ?? null,
      };

      // Update auction in database
      const result = await prisma.auctionRoom.update({
        where: { id: auction.id },
        data: updateData,
      });
      return result;
    } catch (error) {
      devLog(`Error updating auction stats: ${error}`, "error");
      throw error;
    }
  },
};

// =============================================================================
// USAGE EXAMPLE:
//
// import { auctionJobs } from './auctionJobs';
//
// // Process all expired auctions (typically called by cron job)
// await auctionJobs.checkExpiredAuctions();
//
// // Or process individual operations
// await auctionJobs.saveBidHistory(auctionId, bids, highestBid);
// await auctionJobs.updateAuctionStats(auction, bids);
// await auctionJobs.transferAuctionProductEnvironment(auction);
// =============================================================================
