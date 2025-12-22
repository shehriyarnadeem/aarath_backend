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
  try {
    // Extract base64 content from data URL if present
    let base64Content = imageBase64;
    if (imageBase64.startsWith("data:")) {
      const base64Index = imageBase64.indexOf("base64,");
      if (base64Index !== -1) {
        base64Content = imageBase64.substring(base64Index + 7);
      }
    }

    const form = new URLSearchParams();
    form.append("key", IMGBB_API_KEY!);
    form.append("image", base64Content);

    const response = await axios.post(IMGBB_UPLOAD_URL, form.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return response.data.data.url;
  } catch (error) {
    console.error("Error uploading to imgbb:", error);
    throw new Error("Failed to upload image");
  }
}

// Helper function to map farming method strings to enum values
function mapFarmingMethod(
  method: string
): "ORGANIC" | "TRADITIONAL" | "MODERN" | "HYBRID" | "NATURAL" {
  const methodUpper = method.toUpperCase();

  if (methodUpper.includes("ORGANIC")) return "ORGANIC";
  if (methodUpper.includes("MODERN") || methodUpper.includes("IPM"))
    return "MODERN";
  if (methodUpper.includes("HYBRID")) return "HYBRID";
  if (methodUpper.includes("NATURAL")) return "NATURAL";

  return "TRADITIONAL"; // Default fallback
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
      price,
      priceType,
      available,
      minOrderQty,
      maxOrderQty,
      grade,
      purity,
      moisture,
      variety,
      type,
      farmingMethod,
      harvestSeason,
      storageConditions,
      packagingMethod,
      shelfLife,
      status,
    } = req.body;
    // Basic validation - only require essential fields
    if (!category || !title || !quantity || !unit) {
      return res.status(400).json({
        error: "Category, title, quantity, and unit are required.",
      });
    }

    // Validate images if provided
    if (images && Array.isArray(images) && images.length === 0) {
      return res.status(400).json({
        success: false,
        error: "At least one image is required.",
      });
    }

    // Validate pricing based on auction_live

    // Handle images - URLs or base64 strings
    const imageUrls: string[] = [];
    for (const img of images) {
      if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          // If it's already a URL (like placeholder), use it directly
          imageUrls.push(img);
        } else {
          // Assume it's base64 string, upload to imgbb
          try {
            const url = await uploadImageToImgbb(img);
            imageUrls.push(url);
          } catch (error) {
            console.error("Failed to upload image to imgbb:", error);
            // Use placeholder image as fallback
            imageUrls.push(
              "https://via.placeholder.com/400x400?text=Product+Image"
            );
          }
        }
      } else {
        console.error("Invalid image format received:", typeof img);
        // Use placeholder image as fallback
        imageUrls.push(
          "https://via.placeholder.com/400x400?text=Product+Image"
        );
      }
    }
    // Generate serial number (incremental)
    const lastProduct = await prisma.product.findFirst({
      orderBy: { serialNumber: "desc" },
    });
    const serialNumber = lastProduct ? lastProduct.serialNumber + 1 : 10000;

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
          status: status || "DRAFT",
          images: imageUrls,
          environment: "MARKETPLACE",
          serialNumber,

          // Marketplace fields
          price: parseFloat(price || "0"),
          priceType: priceType,

          // Quantity Management
          availableQty: available
            ? parseInt(available, 10)
            : parseInt(quantity, 10),
          minOrderQty: minOrderQty ? parseInt(minOrderQty, 10) : 1,
          maxOrderQty: maxOrderQty
            ? parseInt(maxOrderQty, 10)
            : parseInt(quantity, 10),

          // Quality Parameters
          grade,
          purity: purity ? parseFloat(purity) : undefined,
          moisture: moisture ? parseFloat(moisture) : undefined,

          // Product Specifications
          variety,
          type: type || "STANDARD",

          // Farming & Processing Details
          farmingMethod: farmingMethod
            ? mapFarmingMethod(farmingMethod)
            : "TRADITIONAL",
          harvestSeason,
          storageConditions,
          packagingMethod,
          shelfLife,
        },
      });

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
// Get marketplace products with filtering and sorting
// Query params:
// - sort: "latest" | "price_low" | "price_high"
// - minPrice: number (minimum price filter)
// - maxPrice: number (maximum price filter)
// - city: string (city name filter, case-insensitive)
// - page: number (pagination)
// - limit: number (items per page)
export async function getProducts(req: Request, res: Response) {
  try {
    const {
      sort,
      page = "1",
      limit = "20",
      minPrice,
      maxPrice,
      city,
    } = req.query;

    const whereClause: any = {
      environment: "MARKETPLACE", // Always filter for MARKETPLACE products
    };

    // Price range filtering
    if (minPrice || maxPrice) {
      whereClause.price = {};
      if (minPrice) {
        const minPriceNum = parseInt(minPrice as string, 10);
        if (!isNaN(minPriceNum) && minPriceNum >= 0) {
          whereClause.price.gte = minPriceNum;
        }
      }
      if (maxPrice) {
        const maxPriceNum = parseInt(maxPrice as string, 10);
        if (!isNaN(maxPriceNum) && maxPriceNum >= 0) {
          whereClause.price.lte = maxPriceNum;
        }
      }
    }

    // Location filtering by city
    if (city) {
      whereClause.city = {
        contains: city as string,
        mode: "insensitive", // Case-insensitive search
      };
    }

    // Sorting
    let orderBy: any = { createdAt: "desc" }; // Default: Latest first

    if (sort === "latest") {
      orderBy = { createdAt: "desc" };
    } else if (sort === "price_low") {
      orderBy = { price: "asc" }; // Cheapest first
    } else if (sort === "price_high") {
      orderBy = { price: "desc" }; // Most expensive first
    } else if (sort === "price_asc") {
      orderBy = { price: "asc" }; // Legacy support
    } else if (sort === "price_desc") {
      orderBy = { price: "desc" }; // Legacy support
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
              role: true,
              email: true,
              businessAddress: true,
              businessRole: true,
              products: true,
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

// Update product
export async function updateProduct(req: Request, res: Response) {
  try {
    const userId = (req as AuthenticatedRequest).user?.uid;
    const { productId } = req.params;

    // Check if user is authenticated
    if (!userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Check if productId is provided
    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Check if product exists and belongs to the user
    const existingProduct = await prisma.product.findFirst({
      where: {
        id: productId,
        userId: userId,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({
        error: "Product not found or you don't have permission to update it",
      });
    }

    const {
      category,
      title,
      description,
      quantity,
      unit,
      images,
      newImages,
      removedImages,
      price,
      priceType,
      available,
      minOrderQty,
      maxOrderQty,
      grade,
      purity,
      moisture,
      variety,
      type,
      // sizeLength, // Field doesn't exist in schema yet
      farmingMethod,
      harvestSeason,
      storageConditions,
      packagingMethod,
      shelfLife,
      status,
      environment,
    } = req.body;

    // Basic validation - only require essential fields if product is being moved to marketplace
    if (environment === "MARKETPLACE") {
      if (!category || !title || !description || !quantity || !unit || !price) {
        return res.status(400).json({
          error:
            "Category, title, description, quantity, unit, and price are required for marketplace listing.",
        });
      }

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({
          success: false,
          error: "At least one image is required for marketplace listing.",
        });
      }
    }

    // Handle images with separate fields for existing, new, and removed images
    const deletedImages: string[] = removedImages || [];
    let uploadedCount = 0;
    const finalImageUrls: string[] = [];

    // Start with existing images (URLs only)
    if (images && Array.isArray(images)) {
      // Process existing images - should only be URLs
      for (const img of images) {
        if (
          typeof img === "string" &&
          img.trim() &&
          (img.startsWith("http://") || img.startsWith("https://"))
        ) {
          finalImageUrls.push(img);
        }
      }
    }

    // Process new images separately (base64 images to upload)
    if (newImages && Array.isArray(newImages)) {
      for (const img of newImages) {
        if (typeof img === "string" && img.trim()) {
          if (
            img.startsWith("data:image/") ||
            (img.length > 100 &&
              !img.startsWith("file://") &&
              !img.startsWith("http"))
          ) {
            // New base64 image - upload to imgbb
            try {
              const url = await uploadImageToImgbb(img);
              finalImageUrls.push(url);
              uploadedCount++;
            } catch (error) {
              console.error("Failed to upload new image:", error);
              // Skip failed uploads rather than adding placeholder
              continue;
            }
          } else if (
            img.startsWith("file://") ||
            img.startsWith("content://")
          ) {
            // Mobile file URI - these should be converted to base64 on frontend
            // For now, skip these as they can't be processed on backend
            continue;
          } else {
            // Other string formats - might be valid URLs or base64 without prefix
            finalImageUrls.push(img);
          }
        }
      }
    }

    // Ensure removed images are not included in the final list
    const imageUrls = finalImageUrls.filter(
      (img) => !deletedImages.includes(img)
    );

    // Note: Removed images are excluded from database, but remain on cloud storage
    // ImgBB free tier doesn't support deletion, so old images remain on their servers

    // Prepare update data - only update fields that are provided
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Basic Information
    if (category !== undefined) updateData.category = category;
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (quantity !== undefined) updateData.quantity = parseInt(quantity, 10);
    if (unit !== undefined) updateData.unit = unit;
    // Update images field - this removes deleted images from DB and adds new ones
    if (images !== undefined) updateData.images = imageUrls;

    // Status and Environment
    if (status !== undefined) updateData.status = status;
    if (environment !== undefined) updateData.environment = environment;

    // Pricing
    if (price !== undefined) updateData.price = parseFloat(price);
    if (priceType !== undefined) updateData.priceType = priceType;

    // Quantity Management
    if (available !== undefined)
      updateData.availableQty = parseInt(available, 10);
    if (minOrderQty !== undefined)
      updateData.minOrderQty = parseInt(minOrderQty, 10);
    if (maxOrderQty !== undefined)
      updateData.maxOrderQty = parseInt(maxOrderQty, 10);

    // Quality Parameters
    if (grade !== undefined) updateData.grade = grade;
    if (purity !== undefined)
      updateData.purity = purity ? parseFloat(purity) : null;
    if (moisture !== undefined)
      updateData.moisture = moisture ? parseFloat(moisture) : null;

    // Product Specifications
    if (variety !== undefined) updateData.variety = variety;
    if (type !== undefined) updateData.type = type;
    // Note: sizeLength field doesn't exist in current schema, consider adding it
    // if (sizeLength !== undefined) updateData.sizeLength = sizeLength;

    // Farming & Processing Details
    if (farmingMethod !== undefined) {
      updateData.farmingMethod = farmingMethod
        ? mapFarmingMethod(farmingMethod)
        : "TRADITIONAL";
    }
    if (harvestSeason !== undefined) updateData.harvestSeason = harvestSeason;
    if (storageConditions !== undefined)
      updateData.storageConditions = storageConditions;
    if (packagingMethod !== undefined)
      updateData.packagingMethod = packagingMethod;
    if (shelfLife !== undefined) updateData.shelfLife = shelfLife;

    // Update the product
    const updatedProduct = await prisma.product.update({
      where: {
        id: productId,
      },
      data: updateData,
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
    });

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
      removedImages: deletedImages, // Array of image URLs that were removed
      imageStats: {
        totalImages: imageUrls.length,
        newUploads: uploadedCount,
        deletedImages: deletedImages.length,
      },
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({ error: "Server error" });
  }
}

// Get user's own products
export async function getUserProducts(req: Request, res: Response) {
  try {
    const userId = (req as AuthenticatedRequest).user?.uid;
    let status = req.params.status as string | null;

    if (status === "all") {
      status = null;
    }
    const products = await prisma.product.findMany({
      where: {
        userId: userId,
        ...(status ? { status: status as any } : {}),
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

// Get single product by ID
export async function getProductById(req: Request, res: Response) {
  try {
    const { productId } = req.params;
    const userId = (req as AuthenticatedRequest).user?.uid;

    if (!productId) {
      return res.status(400).json({ error: "Product ID is required" });
    }

    // Find product - if user is authenticated, they can see their own products even if draft
    // Otherwise, only show published products
    const whereClause: any = { id: productId };

    if (!userId) {
      // Public access - only show marketplace/auction products that are active
      whereClause.environment = { in: ["MARKETPLACE", "AUCTION"] };
      whereClause.status = "active";
    }

    const product = await prisma.product.findFirst({
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
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Check if this is the owner viewing their own product
    const isOwner = userId && product.userId === userId;

    return res.status(200).json({
      success: true,
      product,
      isOwner,
    });
  } catch (error) {
    console.error("Error fetching product:", error);
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
