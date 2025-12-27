import { Request, Response } from "express";
import prisma from "../../prisma";
import { sendWelcomeEmail } from "../../config/email";
import { uploadImageToImgbb } from "../products/productController";

/**
 * Fetch all users from the database.
 */
export async function getUsers(req: Request, res: Response) {
  try {
    const users = await prisma.user.findMany();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to retrieve users" });
  }
}

/**
 * Create a new user in the database.
 * Expects an object with `id` (Firebase UID), `email`, `businessName`, `whatsapp`, `state`, `city`, `role`, and `businessCategories` in the request body.
 */
export async function createUser(req: Request, res: Response) {
  const {
    id,
    email,
    businessName,
    whatsapp,
    state,
    city,
    role,
    businessCategories,
  } = req.body;

  if (!id || !whatsapp) {
    return res
      .status(400)
      .json({ error: "ID and WhatsApp/mobile number are required" });
  }

  try {
    const user = await prisma.user.create({
      data: {
        id,
        email: email === "" ? null : email,
        businessName,
        whatsapp,
        state,
        city,
        role,
        businessCategories,
      },
    });
    res.status(201).json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
}

/**
 * Create a new user after onboarding completion and return user + session
 * Expects: { id, email, businessName, whatsapp, state, city, role, businessCategories }
 * Returns: user object and Firebase custom token
 */
export async function completeUserOnboarding(req: Request, res: Response) {
  const {
    email,
    businessName,
    state,
    city,
    role,
    businessCategories,
    userId,
    latitude,
    longitude,
    businessAddress,
  } = req.body;

  try {
    // Create user in DB
    const userData = {
      email: email === "" ? null : email,
      businessName: businessName === null ? null : businessName,
      state: state === null ? null : state,
      city: city === null ? null : city,
      role: role === null ? null : role,
      businessCategories:
        businessCategories === null ? null : businessCategories,
      profileCompleted: true,
      longitude: longitude === null ? null : longitude,
      latitude: latitude === null ? null : latitude,
      businessAddress: businessAddress === null ? null : businessAddress,
    };

    const existingEmail = await prisma.user.findFirst({
      where: {
        OR: [{ email }],
      },
    });
    if (existingEmail) {
      return res.status(404).json({
        error: {
          message: "User with this email already exists",
        },
      });
    }

    const updateUser = await prisma.user.update({
      where: { id: userId },
      data: userData,
    });

    if (email && email !== "") {
      console.log("📧 Sending welcome email to:", email);

      try {
        const emailSent = await sendWelcomeEmail({
          name: businessName || `${role} User`,
          email: email,
          role: role || "Member",
          businessName: businessName || undefined,
          city: city || undefined,
          state: state || undefined,
        });

        if (emailSent) {
          console.log("✅ Welcome email sent successfully to:", email);
        } else {
          console.log("⚠️ Welcome email failed to send to:", email);
        }
      } catch (emailError) {
        // Don't fail the registration if email fails
        console.error("❌ Email service error:", emailError);
      }
    } else {
      console.log("⏭️ Skipping welcome email (no email provided)");
    }

    const admin =
      require("../../firebase").default || require("../../firebase");
    const customToken = await admin.auth().createCustomToken(userId);

    return res.status(200).json({
      success: true,
      user: updateUser,
      token: customToken,
      message: "Profile completed successfully! Welcome to Aarath 🌾",
    });
  } catch (error) {
    console.error("Error creating user with session:", error);
    res.status(500).json({ error: "Failed to create user and session" });
  }
}

/**
 * Get user by ID
 */
export async function getUserById(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res
      .status(500)
      .json({ success: false, error: "Failed to retrieve user" });
  }
}

/**
 * Update user profile
 */
export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const {
    businessName,
    whatsapp,
    state,
    city,
    role,
    businessCategories,
    profileCompleted,
    email,
    longitude,
    latitude,
    businessAddress,
    personalProfilePicBase64,
  } = req.body;

  try {
    // If a new profile picture is provided as base64, upload to CDN first
    let profilePicUrl: string | undefined;
    if (
      personalProfilePicBase64 &&
      typeof personalProfilePicBase64 === "string"
    ) {
      try {
        profilePicUrl = await uploadImageToImgbb(personalProfilePicBase64);
      } catch (err) {
        console.error("Failed to upload profile picture:", err);
      }
    }

    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(businessName && { businessName }),
        ...(whatsapp && { whatsapp }),
        ...(state && { state }),
        ...(city && { city }),
        ...(role && { role }),
        ...(businessCategories && { businessCategories }),
        ...(profileCompleted !== undefined && { profileCompleted }),
        ...(longitude !== null && { longitude: longitude }),
        ...(latitude !== null && { latitude: latitude }),
        ...(businessAddress !== undefined && { businessAddress }),
        ...(email && { email }),
        ...(profilePicUrl && { personalProfilePic: profilePicUrl }),
      },
    });
    return res.json({ success: true, user });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
}

/**
 * Login user with WhatsApp number and return Firebase token
 * Expects: { whatsapp }
 * Returns: user object and Firebase custom token
 */
export async function loginUser(req: Request, res: Response) {
  const { mobile } = req.body;

  if (!mobile) {
    return res
      .status(400)
      .json({ error: "WhatsApp/mobile number is required" });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { whatsapp: mobile },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const admin =
      require("../../firebase").default || require("../../firebase");
    const customToken = await admin.auth().createCustomToken(user.id);

    return res.status(200).json({ success: true, user, token: customToken });
  } catch (error) {
    console.error("Error logging in user:", error);
    throw error;
  }
}
/**
 * Check if user profile is completed
 */
export async function checkProfileCompletion(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        profileCompleted: true,
        role: true,
        state: true,
        city: true,
        businessCategories: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      profileCompleted: user.profileCompleted,
      hasRole: !!user.role,
      hasLocation: !!(user.state && user.city),
      hasCategories:
        user.businessCategories && user.businessCategories.length > 0,
    });
  } catch (error) {
    console.error("Error checking profile completion:", error);
    res.status(500).json({ error: "Failed to check profile completion" });
  }
}

/**
 * Get user profile statistics and performance data
 */
export async function getUserProfileStats(req: Request, res: Response) {
  const { id } = req.params;

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        products: {
          select: {
            id: true,
            createdAt: true,
            // Add other product fields you might need for stats
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Calculate basic stats
    const totalListings = user.products.length;
    const successfulSales = Math.floor(totalListings * 0.75); // Mock calculation
    const activeListings = Math.floor(totalListings * 0.25); // Mock calculation
    const rating = 4.8; // Mock rating
    const reviews = Math.floor(totalListings * 6.5); // Mock reviews count
    const responseRate = "98%"; // Mock response rate
    const totalRevenue = `₹${(successfulSales * 2500).toLocaleString()}`; // Mock revenue

    // Get join date
    const joinedDate = new Date(user.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });

    // Mock recent activity - in real app, you'd query orders/transactions table
    const recentActivity = [
      {
        id: 1,
        type: "sale",
        title: "Sold Premium Wheat",
        amount: "₹2,500",
        date: "2 hours ago",
        status: "completed",
      },
      {
        id: 2,
        type: "listing",
        title: "Listed Basmati Rice",
        amount: "₹3,200",
        date: "1 day ago",
        status: "active",
      },
      {
        id: 3,
        type: "review",
        title: "Received 5-star review",
        amount: "",
        date: "3 days ago",
        status: "positive",
      },
    ];

    const profileStats = {
      totalListings,
      successfulSales,
      activeListings,
      rating,
      reviews,
      responseRate,
      totalRevenue,
      joinedDate,
      recentActivity,
      // Add achievement data
      achievements: {
        topSeller: successfulSales >= 50,
        qualityProducts: rating >= 4.5,
        fastResponder: true, // Mock
        premiumTrader: successfulSales >= 100,
      },
    };

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.businessName || "User",
        email: user.email,
        whatsapp: user.whatsapp,
        location: user.city ? `${user.city}, ${user.state}` : user.state,
        role: user.role,
        createdAt: user.createdAt,
      },
      stats: profileStats,
    });
  } catch (error) {
    console.error("Error fetching profile stats:", error);
    res.status(500).json({ error: "Failed to fetch profile statistics" });
  }
}
