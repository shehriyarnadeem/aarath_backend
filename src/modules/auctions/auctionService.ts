import prisma from "../../prisma";

// Types for service functions
export interface AuctionFilters {
  status?: string;
  limit?: number;
  offset?: number;
  sortBy?: "createdAt" | "endTime" | "currentHighestBid" | "totalBids";
  sortOrder?: "asc" | "desc";
}

export interface AuctionWithMetrics {
  id: string;
  productId: string;
  startingBid: number;
  currentHighestBid?: number;
  currentHighestBidderId?: string;
  winnerId?: string;
  reservePrice?: number;
  minBidIncrement: number;
  startTime: Date;
  endTime: Date;
  status: string;
  totalBids: number;
  totalParticipants: number;
  isReserveReached: boolean;
  buyNowPrice?: number;
  createdAt: Date;
  updatedAt: Date;
  // Calculated fields
  timeRemaining: number;
  timeRemainingFormatted: string;
  isActive: boolean;
  hasEnded: boolean;
  bidIncrement: number;
  nextMinBid: number;
  activeParticipants: number;
  reserveMet: boolean;
  bidProgress: string;
}

// Service class for auction business logic
export class AuctionService {
  /**
   * Get all auctions with filtering, pagination, and enriched data
   */
  static async getAllAuctions(filters: AuctionFilters) {
    const {
      status,
      limit = 100,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = filters;

    // Build where clause for filtering
    const whereClause: any = {};
    if (status) {
      whereClause.status = status;
    }

    // Build order by clause
    const orderByClause: any = {};
    if (sortBy === "endTime") {
      orderByClause.endTime = sortOrder;
    } else if (sortBy === "currentHighestBid") {
      orderByClause.currentHighestBid = sortOrder;
    } else if (sortBy === "totalBids") {
      orderByClause.totalBids = sortOrder;
    } else {
      orderByClause.createdAt = sortOrder;
    }

    // Fetch auctions with comprehensive relational data
    const [auctions, totalCount] = await Promise.all([
      prisma.auctionRoom.findMany({
        where: whereClause,
        include: {
          // Product information
          product: {
            select: {
              id: true,
              title: true,
              description: true,
              category: true,
              images: true,
              serialNumber: true,
              quantity: true,
              unit: true,
              createdAt: true,
              // Product owner info
              user: {
                select: {
                  id: true,
                  name: true,
                  personalName: true,
                  companyName: true,
                  businessName: true,
                  state: true,
                  city: true,
                  role: true,
                  businessAddress: true,
                  email: true,
                  whatsapp: true,
                },
              },
            },
          },
          // Recent bids (last 5)
          bids: {
            orderBy: {
              timestamp: "desc",
            },
            take: 5,
            select: {
              id: true,
              amount: true,
              timestamp: true,
              bidderName: true,
              isWinningBid: true,
              bidType: true,
            },
          },
          // Active participants
          participants: {
            where: {
              hasLeftRoom: false,
            },
            select: {
              id: true,
              userName: true,
              totalBidsPlaced: true,
              highestBidAmount: true,
              lastSeenAt: true,
              isWinner: true,
            },
          },
          // Count statistics
          _count: {
            select: {
              bids: true,
              participants: true,
            },
          },
        },
        orderBy: orderByClause,
        take: limit,
        skip: offset,
      }),
      prisma.auctionRoom.count({ where: whereClause }),
    ]);

    // Enrich auctions with calculated metrics
    const enrichedAuctions = auctions.map((auction) =>
      this.enrichAuctionWithMetrics(auction)
    );

    return {
      auctions: enrichedAuctions,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount,
      },
    };
  }

  /**
   * Get single auction by ID with full details
   */
  static async getAuctionById(auctionId: string) {
    const auction = await prisma.auctionRoom.findUnique({
      where: { id: auctionId },
      include: {
        // Complete product information
        product: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                personalName: true,
                companyName: true,
                businessName: true,
                state: true,
                city: true,
                email: true,
                whatsapp: true,
              },
            },
          },
        },
        // All bids with full history
        bids: {
          orderBy: {
            timestamp: "desc",
          },
          select: {
            id: true,
            amount: true,
            timestamp: true,
            bidderName: true,
            bidderId: true,
            isWinningBid: true,
            bidType: true,
            previousBidAmount: true,
          },
        },
        // All participants with detailed info
        participants: {
          orderBy: {
            totalBidsPlaced: "desc",
          },
          select: {
            id: true,
            userId: true,
            userName: true,
            firstJoinedAt: true,
            lastSeenAt: true,
            totalBidsPlaced: true,
            highestBidAmount: true,
            isWinner: true,
            hasLeftRoom: true,
          },
        },
      },
    });

    if (!auction) {
      return null;
    }

    // Calculate enhanced metrics
    return this.enrichAuctionWithDetailedMetrics(auction);
  }

  /**
   * Get auctions by product IDs
   */
  static async getAuctionsByProductIds(productIds: string[]) {
    return await prisma.auctionRoom.findMany({
      where: {
        productId: {
          in: productIds,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            images: true,
          },
        },
        _count: {
          select: {
            bids: true,
            participants: true,
          },
        },
      },
    });
  }

  /**
   * Get active auctions (status = 'active' and not expired)
   */
  static async getActiveAuctions(limit: number = 10) {
    const now = new Date();

    return await prisma.auctionRoom.findMany({
      where: {
        status: "active",
        endTime: {
          gt: now,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            images: true,
            category: true,
          },
        },
        _count: {
          select: {
            bids: true,
            participants: true,
          },
        },
      },
      orderBy: {
        endTime: "asc",
      },
      take: limit,
    });
  }

  /**
   * Get auctions ending soon (within next 24 hours)
   */
  static async getAuctionsEndingSoon(hours: number = 24) {
    const now = new Date();
    const endingSoon = new Date(now.getTime() + hours * 60 * 60 * 1000);

    return await prisma.auctionRoom.findMany({
      where: {
        status: "active",
        endTime: {
          gt: now,
          lte: endingSoon,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            images: true,
          },
        },
        _count: {
          select: {
            bids: true,
            participants: true,
          },
        },
      },
      orderBy: {
        endTime: "asc",
      },
    });
  }

  /**
   * Enrich auction with basic metrics
   */
  private static enrichAuctionWithMetrics(auction: any) {
    const timeRemaining = auction.endTime.getTime() - Date.now();
    const isActive = auction.status === "active" && timeRemaining > 0;
    const hasEnded = timeRemaining <= 0 || auction.status === "ended";

    return {
      ...auction,
      // Time calculations
      timeRemaining: Math.max(0, timeRemaining),
      timeRemainingFormatted: this.formatTimeRemaining(timeRemaining),
      isActive,
      hasEnded,

      // Bid analytics
      bidIncrement: auction.minBidIncrement,
      nextMinBid: auction.currentHighestBid
        ? auction.currentHighestBid + auction.minBidIncrement
        : auction.startingBid,

      // Participation metrics
      activeParticipants: auction.participants.length,
      totalBids: auction._count.bids,
      totalParticipants: auction._count.participants,

      // Progress indicators
      reserveMet: auction.isReserveReached,
      bidProgress: auction.currentHighestBid
        ? (
            ((auction.currentHighestBid - auction.startingBid) /
              auction.startingBid) *
            100
          ).toFixed(1)
        : "0.0",
    };
  }

  /**
   * Enrich auction with detailed metrics for single auction view
   */
  private static enrichAuctionWithDetailedMetrics(auction: any) {
    const timeRemaining = auction.endTime.getTime() - Date.now();
    const isActive = auction.status === "active" && timeRemaining > 0;
    const hasEnded = timeRemaining <= 0 || auction.status === "ended";

    return {
      ...auction,
      // Time calculations
      timeRemaining: Math.max(0, timeRemaining),
      timeRemainingFormatted: this.formatTimeRemaining(timeRemaining),
      isActive,
      hasEnded,

      // Enhanced bid analytics
      bidHistory: auction.bids,
      winningBid: auction.bids.find((bid: any) => bid.isWinningBid),
      bidIncrement: auction.minBidIncrement,
      nextMinBid: auction.currentHighestBid
        ? auction.currentHighestBid + auction.minBidIncrement
        : auction.startingBid,

      // Participant analytics
      activeParticipants: auction.participants.filter(
        (p: any) => !p.hasLeftRoom
      ).length,
      topBidders: auction.participants
        .filter((p: any) => p.totalBidsPlaced > 0)
        .sort(
          (a: any, b: any) =>
            (b.highestBidAmount || 0) - (a.highestBidAmount || 0)
        )
        .slice(0, 5),
    };
  }

  /**
   * Format time remaining into human-readable string
   */
  private static formatTimeRemaining(milliseconds: number): string {
    if (milliseconds <= 0) return "Ended";

    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  }

  /**
   * Check if auction is valid and active for bidding
   */
  static isAuctionActiveForBidding(auction: any): boolean {
    const now = Date.now();
    return (
      auction.status === "active" &&
      auction.endTime.getTime() > now &&
      auction.startTime.getTime() <= now
    );
  }

  /**
   * Calculate next minimum bid amount
   */
  static calculateNextMinBid(auction: any): number {
    return auction.currentHighestBid
      ? auction.currentHighestBid + auction.minBidIncrement
      : auction.startingBid;
  }

  /**
   * Validate bid amount
   */
  static validateBidAmount(
    auction: any,
    bidAmount: number
  ): { isValid: boolean; message: string } {
    if (!this.isAuctionActiveForBidding(auction)) {
      return { isValid: false, message: "Auction is not active for bidding" };
    }

    const nextMinBid = this.calculateNextMinBid(auction);
    if (bidAmount < nextMinBid) {
      return {
        isValid: false,
        message: `Bid must be at least ${nextMinBid}`,
      };
    }

    if (auction.buyNowPrice && bidAmount >= auction.buyNowPrice) {
      return {
        isValid: true,
        message: "Buy now price triggered",
      };
    }

    return { isValid: true, message: "Valid bid" };
  }
}
