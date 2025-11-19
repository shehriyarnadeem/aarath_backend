import { Router } from "express";
import { getProducts } from "../products/productController";
const router = Router();

// Get all products with optional filters
router.get("/products", getProducts);

export default router;
