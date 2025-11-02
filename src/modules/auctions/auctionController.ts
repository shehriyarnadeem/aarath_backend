import { Request, Response } from "express";
import { AuctionService, AuctionFilters } from "./auctionService";

// Get all auctions with comprehensive relational data
export async function getAllAuctions(req: Request, res: Response) {
  try {
    const {
      status,
      limit = 20,
      offset = 0,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    const filters: AuctionFilters = {
      status: status as string,
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
      sortBy: sortBy as AuctionFilters["sortBy"],
      sortOrder: sortOrder as AuctionFilters["sortOrder"],
    };

    const result = await AuctionService.getAllAuctions(filters);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error fetching auctions:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch auctions",
    });
  }
}

// Get single auction by ID with full details
export async function getAuctionById(req: Request, res: Response) {
  try {
    const { auctionId } = req.params;

    if (!auctionId) {
      return res.status(400).json({
        success: false,
        error: "Auction ID is required",
      });
    }

    const auction = await AuctionService.getAuctionById(auctionId);

    if (!auction) {
      return res.status(404).json({
        success: false,
        error: "Auction not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: auction,
    });
  } catch (error) {
    console.error("Error fetching auction details:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch auction details",
    });
  }
}
