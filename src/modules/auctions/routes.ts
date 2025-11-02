import express from "express";
import { getAllAuctions, getAuctionById } from "./auctionController";

const router = express.Router();

// GET /api/auctions - Get all auctions with filtering and pagination
// Query parameters:
// - status: filter by auction status (active, ended, scheduled, cancelled)
// - limit: number of results per page (default: 20)
// - offset: number of results to skip (default: 0)
// - sortBy: sort field (createdAt, endTime, currentHighestBid, totalBids)
// - sortOrder: asc or desc (default: desc)
router.get("/", getAllAuctions);

// GET /api/auctions/:auctionId - Get single auction with full details
router.get("/:auctionId", getAuctionById);

export default router;
