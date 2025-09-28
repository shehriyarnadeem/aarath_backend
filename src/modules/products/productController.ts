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
    const { category, title, description, quantity, unit, images } = req.body;
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
    // Create product
    await prisma.product.create({
      data: {
        userId: userId, // userId of currently logged user
        category,
        title,
        description,
        quantity: parseInt(quantity, 10),
        unit,
        images: imageUrls,
        serialNumber,
      },
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error creating product:", error);
    return res.status(500).json({ error: "Server error" });
  }
}
