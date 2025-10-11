"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserProducts = exports.getProducts = exports.createProduct = exports.uploadImageToImgbb = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
const axios_1 = __importDefault(require("axios"));
const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
const IMGBB_UPLOAD_URL = "https://api.imgbb.com/1/upload";
// Helper to upload image to imgbb
async function uploadImageToImgbb(imageBase64) {
    const form = new URLSearchParams();
    form.append("key", IMGBB_API_KEY);
    form.append("image", imageBase64);
    const response = await axios_1.default.post(IMGBB_UPLOAD_URL, form.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return response.data.data.url;
}
exports.uploadImageToImgbb = uploadImageToImgbb;
// Create product listing
async function createProduct(req, res) {
    try {
        const userId = req.user?.uid; // Get userId from session
        const { category, title, description, quantity, unit, images, auction_live, price, priceType, startingBid, auctionDuration, } = req.body;
        if (!category ||
            !title ||
            !description ||
            !quantity ||
            !unit ||
            !images ||
            images.length === 0) {
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
        }
        else {
            if (!price || parseFloat(price) <= 0) {
                return res.status(400).json({
                    error: "Valid price is required for marketplace listings.",
                });
            }
        }
        // Upload images to imgbb
        const imageUrls = [];
        for (const img of images) {
            // img should be base64 string
            const url = await uploadImageToImgbb(img);
            imageUrls.push(url);
        }
        // Generate serial number (incremental)
        const lastProduct = await prisma_1.default.product.findFirst({
            orderBy: { serialNumber: "desc" },
        });
        const serialNumber = lastProduct ? lastProduct.serialNumber + 1 : 10000;
        // Calculate auction end time if it's an auction
        const auctionEndTime = auction_live && auctionDuration
            ? new Date(Date.now() + parseInt(auctionDuration) * 60 * 60 * 1000)
            : null;
        // Create product
        await prisma_1.default.product.create({
            data: {
                userId: userId,
                category,
                title,
                description,
                quantity: parseInt(quantity, 10),
                unit,
                images: imageUrls,
                serialNumber,
                auction_live: auction_live || false,
                // Marketplace fields
                price: auction_live ? null : parseFloat(price),
                priceType: auction_live ? null : priceType,
                // Auction fields
                startingBid: auction_live ? parseFloat(startingBid) : null,
                auctionDuration: auction_live ? parseInt(auctionDuration) : null,
                currentBid: auction_live ? parseFloat(startingBid) : null,
                auctionEndTime: auctionEndTime,
                auctionStatus: auction_live ? "active" : null,
            },
        });
        return res.status(200).json({ success: true });
    }
    catch (error) {
        console.error("Error creating product:", error);
        return res.status(500).json({ error: "Server error" });
    }
}
exports.createProduct = createProduct;
// Get products by auction status
async function getProducts(req, res) {
    try {
        const { auction_live, status } = req.query;
        const whereClause = {};
        // Filter by auction status if specified
        if (auction_live !== undefined) {
            whereClause.auction_live = auction_live === "true";
        }
        // Filter by auction status if specified
        if (status && auction_live === "true") {
            whereClause.auctionStatus = status;
        }
        const products = await prisma_1.default.product.findMany({
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
                    },
                },
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return res.status(200).json({ success: true, products });
    }
    catch (error) {
        console.error("Error fetching products:", error);
        return res.status(500).json({ error: "Server error" });
    }
}
exports.getProducts = getProducts;
// Get user's own products
async function getUserProducts(req, res) {
    try {
        const userId = req.user?.uid;
        const products = await prisma_1.default.product.findMany({
            where: {
                userId: userId,
            },
            orderBy: {
                createdAt: "desc",
            },
        });
        return res.status(200).json({ success: true, products });
    }
    catch (error) {
        console.error("Error fetching user products:", error);
        return res.status(500).json({ error: "Server error" });
    }
}
exports.getUserProducts = getUserProducts;
