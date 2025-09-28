import { Router } from "express";
import { createProduct } from "./productController";
import prisma from "../../prisma";

const router = Router();

router.post("/create", createProduct);

// Get products by user
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
