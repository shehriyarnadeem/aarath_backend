import { Router } from "express";
import {
  createProduct,
  updateProduct,
  getProducts,
  getUserProducts,
  getProductById,
  getAuctionRoomDetails,
} from "./productController";
import { verifyFirebaseToken } from "../../middleware/authMiddleware";

const router = Router();

// Public routes (no authentication required)
// Get all products with optional filters (supports query parameters like ?sort=latest&minPrice=100&maxPrice=500&city=lahore)
router.get("/", verifyFirebaseToken, getProducts);

// Specific routes (must come before dynamic /:productId route)
// Get current user's products - requires authentication
router.get("/my-products", verifyFirebaseToken, getUserProducts);

// Get auction room details for a specific product
router.get("/auction-room/:productId", getAuctionRoomDetails);

// Get products by user (keeping for backward compatibility)
router.get("/user/:userId/:status", verifyFirebaseToken, getUserProducts);

// Protected routes (authentication required)
// Create product - requires authentication
router.post("/create", verifyFirebaseToken, createProduct);

// Update product - requires authentication
router.put("/:productId", verifyFirebaseToken, updateProduct);

// Dynamic routes (must come last)
// Get single product by ID (public access for marketplace products, owner access for drafts)
router.get("/:productId", getProductById);

export default router;
