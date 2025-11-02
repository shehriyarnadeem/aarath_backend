import { Router } from "express";
import {
  createProduct,
  getProducts,
  getUserProducts,
  getAuctionRoomDetails,
} from "./productController";
import { verifyFirebaseToken } from "../../middleware/authMiddleware";
import prisma from "../../prisma";

const router = Router();

// Create product - requires authentication
router.post("/create", verifyFirebaseToken, createProduct);

// Get all products with optional filters
router.get("/", verifyFirebaseToken, getProducts);

// Get current user's products - requires authentication
router.get("/my-products", verifyFirebaseToken, getUserProducts);

// Get auction room details for a specific product
router.get("/auction-room/:productId", getAuctionRoomDetails);

// Get products by user (keeping for backward compatibility)
router.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const products = await prisma.product.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ products });
  } catch (error) {
    console.error("Error fetching user's products:", error);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
