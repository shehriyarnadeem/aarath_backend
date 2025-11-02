import { Request, Response } from "express";
import prisma from "../../prisma";
import axios from "axios";

// Add AuthenticatedRequest type for req.user
interface AuthenticatedRequest extends Request {
  user: { uid: string };
}

const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";

// Helper to upload image to imgbb
export async function uploadImageToImgbb(imageBase64: string): Promise<string> {
  const form = new URLSearchParams();
  form.append("key", IMGBB_API_KEY!);
  form.append("image", imageBase64);

  const response = await axios.post(IMGBB_UPLOAD_URL, form.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return response.data.data.url;
}

// Create product listing
export async function createProduct(req: Request, res: Response) {
  try {
    const userId = (req as AuthenticatedRequest).user?.uid; // Get userId from session

    // Check if user exists in database
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    const userExists = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!userExists) {
      return res.status(404).json({
        error: "User not found in database. Please complete onboarding first.",
      });
    }

    const {
      category,
      title,
      description,
      quantity,
      unit,
      images,
      auction_live,
      price,
      priceType,
      startingBid,
      auctionDuration,
    } = req.body;
    if (
      !category ||
      !title ||
      !description ||
      !quantity ||
      !unit ||
      !images ||
      images.length === 0
    ) {
      return res.status(400).json({
        error: "All fields including at least one image are required.",
      });
    }

    // Validate pricing based on auction_live
    if (auction_live) {
      if (!startingBid || parseFloat(startingBid) <= 0) {
        return res.status(400).json({
          error: "Valid starting bid is required for auction listings.",
        });
      }
    } else {
      if (!price || parseFloat(price) <= 0) {
        return res.status(400).json({
          error: "Valid price is required for marketplace listings.",
        });
      }
    }
    // Upload images to imgbb
    const imageUrls: string[] = [];
    for (const img of images) {
      // img should be base64 string
      const url = await uploadImageToImgbb(img);
      imageUrls.push(url);
    }
    // Generate serial number (incremental)
    const lastProduct = await prisma.product.findFirst({
      orderBy: { serialNumber: "desc" },
    });
    const serialNumber = lastProduct ? lastProduct.serialNumber + 1 : 10000;
    // Calculate auction end time if it's an auction
    const auctionEndTime =
      auction_live && auctionDuration
        ? new Date(Date.now() + parseInt(auctionDuration) * 60 * 60 * 1000)
        : null;

    // Create product and auction room in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create product first
      const product = await tx.product.create({
        data: {
          userId: userId, // userId of currently logged user
          category,
          title,
          description,
          quantity: parseInt(quantity, 10),
          unit,
          images: imageUrls,
          environment: auction_live ? "AUCTION" : "MARKETPLACE",
          serialNumber,
          // Marketplace fields
          price: auction_live ? null : parseFloat(price),
          priceType: auction_live ? null : priceType,
        },
      });

      // If it's an auction, create the auction room
      if (auction_live && startingBid && auctionEndTime) {
        await tx.auctionRoom.create({
          data: {
            productId: product.id,
            startingBid: parseFloat(startingBid),
            currentHighestBid: null, // No bids yet
            startTime: new Date(), // Start immediately or you can set a future time
            endTime: auctionEndTime,
            status: "active", // or "scheduled" if starting in the future
            minBidIncrement: 50.0, // Default increment, you can make this configurable
            reservePrice: 0.0, // You can add reserve price to the form later
            closed: false,
          },
        });
      }

      return product;
    });

    return res.status(200).json({
      success: true,
      product: {
        id: result.id,
        serialNumber: result.serialNumber,
      },
    });
  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

// Get products by auction status
export async function getProducts(req: Request, res: Response) {
  try {
    const {
      environment,
      category,
      keyword,
      sort,
      timeline,
      page = "1",
      limit = "20",
    } = req.query;

    const whereClause: any = {};

    // Filter by auction status if specified
    if (environment !== undefined) {
      whereClause.environment = environment;
    }

    // Filter by category if specified
    if (category) {
      whereClause.category = category;
    }

    // Keyword search in title or description
    if (keyword) {
      whereClause.OR = [
        { title: { contains: keyword as string, mode: "insensitive" } },
        { description: { contains: keyword as string, mode: "insensitive" } },
      ];
    }

    // Timeline filtering based on createdAt date
    if (timeline) {
      const now = new Date();
      let cutoffDate: Date | null = new Date();

      const timelineNum = parseInt(timeline as string, 10);

      switch (timelineNum) {
        case 1:
          cutoffDate.setMonth(now.getMonth() - 1);
          break;
        case 3:
          cutoffDate.setMonth(now.getMonth() - 3);
          break;
        case 6:
          cutoffDate.setMonth(now.getMonth() - 6);
          break;
        case 12:
          cutoffDate.setFullYear(now.getFullYear() - 1);
          break;
        default:
          // If invalid timeline, ignore the filter
          cutoffDate = null;
          break;
      }

      if (cutoffDate) {
        whereClause.createdAt = {
          gte: cutoffDate,
        };
      }
    }

    // Sorting
    let orderBy: any = { createdAt: "desc" };
    if (sort === "price_asc") {
      orderBy = { price: "asc" };
    } else if (sort === "price_desc") {
      orderBy = { price: "desc" };
    }

    // Pagination
    const pageNum = Math.max(parseInt(page as string, 10), 1);
    const limitNum = Math.max(parseInt(limit as string, 10), 1);
    const skip = (pageNum - 1) * limitNum;

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              personalName: true,
              companyName: true,
              state: true,
              city: true,
              businessName: true,
            },
          },
        },
        orderBy,
        skip,
        take: limitNum,
      }),
      prisma.product.count({ where: whereClause }),
    ]);

    return res.status(200).json({
      success: true,
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

// Get user's own products
export async function getUserProducts(req: Request, res: Response) {
  try {
    const userId = (req as AuthenticatedRequest).user?.uid;

    const products = await prisma.product.findMany({
      where: {
        userId: userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json({ success: true, products });
  } catch (error) {
    console.error("Error fetching user products:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

// Get auction room details for a specific product
export async function getAuctionRoomDetails(req: Request, res: Response) {
  try {
    const { productId } = req.params;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    const auctionRoom = await prisma.auctionRoom.findUnique({
      where: {
        productId: productId,
      },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            description: true,
            images: true,
            category: true,
            serialNumber: true,
          },
        },
        bids: {
          orderBy: {
            timestamp: "desc",
          },
          take: 10, // Get latest 10 bids
          select: {
            id: true,
            amount: true,
            timestamp: true,
            bidderName: true,
            isWinningBid: true,
            bidType: true,
          },
        },
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

    if (!auctionRoom) {
      return res.status(404).json({ error: "Auction room not found" });
    }

    return res.status(200).json({ success: true, auctionRoom });
  } catch (error) {
    console.error("Error fetching auction room details:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
