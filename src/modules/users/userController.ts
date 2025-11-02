import { Request, Response } from "express";
import prisma from "../../prisma";

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
export async function createUserWithSession(req: Request, res: Response) {
  const {
    email,
    businessName,
    whatsapp,
    state,
    city,
    role,
    businessCategories,
  } = req.body;

  if (!whatsapp) {
    return res
      .status(400)
      .json({ error: "ID and WhatsApp/mobile number are required" });
  }
  try {
    // Check for duplicate email or id
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ whatsapp }],
      },
    });
    if (existingUser) {
      return res.status(409).json({
        error: "User with this WhatsApp/mobile or email already exists",
      });
    }
    // Create user in DB
    const userData = {
      email: email === "" ? null : email,
      businessName,
      whatsapp,
      state,
      city,
      role,
      businessCategories,
      profileCompleted: true,
    };
    const user = await prisma.user.create({
      data: userData as import("@prisma/client").Prisma.UserUncheckedCreateInput,
    });
    // Issue Firebase custom token for session
    const admin =
      require("../../firebase").default || require("../../firebase");
    const customToken = await admin.auth().createCustomToken(user.id);
    res.status(201).json({ user, token: customToken });
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
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    res.status(500).json({ error: "Failed to retrieve user" });
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
  } = req.body;

  try {
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
        ...(email && { email }),
      },
    });
    res.json(user);
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
  const { whatsapp } = req.body;

  if (!whatsapp) {
    return res
      .status(400)
      .json({ error: "WhatsApp/mobile number is required" });
  }

  try {
    const user = await prisma.user.findFirst({
      where: { whatsapp },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const admin =
      require("../../firebase").default || require("../../firebase");
    const customToken = await admin.auth().createCustomToken(user.id);

    return res.status(200).json({ user, token: customToken });
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
