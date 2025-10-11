"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const productController_1 = require("./productController");
const prisma_1 = __importDefault(require("../../prisma"));
const router = (0, express_1.Router)();
router.post("/create", productController_1.createProduct);
// Get all products with optional filters
router.get("/", productController_1.getProducts);
// Get current user's products
router.get("/my-products", productController_1.getUserProducts);
// Get products by user (keeping for backward compatibility)
router.get("/user/:userId", async (req, res) => {
    try {
        const { userId } = req.params;
        const products = await prisma_1.default.product.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
        return res.json({ products });
    }
    catch (error) {
        console.error("Error fetching user's products:", error);
        return res.status(500).json({ error: "Server error" });
    }
});
exports.default = router;
