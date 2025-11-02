import { PrismaClient, AuctionRoom, AuctionBid } from "@prisma/client";
import firebaseAdmin from "../firebase";

const prisma = new PrismaClient(); // Consider using a singleton in your app

interface Bid {
  id: string;
  userName?: string;
  amount: number;
  bidderId?: string;
  userId?: string;
  timestamp?: string | number | Date;
}

function formattedBids(bids: any): any {
  return Object.entries(bids || {}).map(([id, bid]) => ({
    id,
    ...(typeof bid === "object" && bid !== null ? bid : {}),
  }));
}

export const auctionJobs = {
  async fetchAuctionDataFromFirebase(auctionId: string) {
    try {
      const db = firebaseAdmin.database();
      const auctionRoomRef = db.ref(`auctions/${auctionId}`);
      const snapshot = await auctionRoomRef.once("value");
      const auctionRoom = snapshot.val();
      if (auctionRoom) {
        return { auctionRoom };
      }
      console.log(`No auctionRoom data found for auctionId: ${auctionId}`);
      return null;
    } catch (error) {
      console.error("Error fetching auction data from Firebase:", error);
      throw error;
    }
  },

  async saveBidHistory(auctionId: string, bids: any[]) {
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
              bidderId: bid.bidderId ?? bid.userId,
              timestamp: bid.timestamp ? new Date(bid.timestamp) : new Date(),
            },
          });
        }
      }
      return true;
    } catch (error) {
      console.error("Error saving bid history:", error);
      throw error;
    }
  },

  async getExpiredAuctions() {
    const now = new Date();
    return prisma.auctionRoom.findMany({
      where: {
        status: "active",
        // endTime: { lte: now },
      },
      include: {
        product: true,
        bids: { orderBy: { amount: "desc" }, take: 1 },
      },
    });
  },

  async checkExpiredAuctions() {
    try {
      const expiredAuctions = await this.getExpiredAuctions();
      for (const auction of expiredAuctions) {
        const firebaseData = await this.fetchAuctionDataFromFirebase(
          auction.id
        );
        const bidsObj = firebaseData?.auctionRoom?.bids ?? {};
        const bids = formattedBids(bidsObj);

        if (bids.length > 0) {
          await this.saveBidHistory(auction.id, bids);
          await this.updateAuctionStats(auction, bids);
          console.log(`Auction ${auction.id} completed with bids`);
        } else {
          await this.updateAuctionStats(auction, []);
          console.log(`Auction ${auction.id} completed with no bids`);
        }
      }
      if (expiredAuctions.length > 0)
        console.log(`Updated ${expiredAuctions.length} expired auctions`);
    } catch (error) {
      console.error("Error checking expired auctions:", error);
    }
  },

  async updateAuctionStats(auction: AuctionRoom, bids: Bid[] = []) {
    try {
      const updateData: any = {
        status: "closed",
        updatedAt: new Date(),
      };

      const highestBid = bids.length
        ? bids.reduce(
            (max, bid) => (bid.amount > max.amount ? bid : max),
            bids[0]
          )
        : null;
      const uniqueBidders = Array.from(
        new Set(bids.map((bid) => bid.bidderId ?? bid.userId).filter(Boolean))
      );

      updateData.totalBids = bids.length;
      updateData.totalParticipants = uniqueBidders.length;
      updateData.currentHighestBid = highestBid?.amount ?? auction.startingBid;
      updateData.currentHighestBidderId =
        highestBid?.userId ?? highestBid?.bidderId ?? null;
      updateData.winnerId = highestBid?.userId ?? highestBid?.bidderId ?? null;

      await prisma.auctionRoom.update({
        where: { id: auction.id },
        data: updateData,
      });
    } catch (error) {
      console.error("Error updating auction stats:", error);
      throw error;
    }
  },
};
