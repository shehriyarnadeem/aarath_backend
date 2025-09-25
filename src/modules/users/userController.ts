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
 * Expects an object with `id` (Firebase UID), `email` and optionally `name` in the request body.
 */
export async function createUser(req: Request, res: Response) {
  const { id, email, name } = req.body;

  if (!id || !email) {
    return res.status(400).json({ error: "ID and email are required" });
  }

  try {
    const user = await prisma.user.create({
      data: {
        id,
        email,
        name,
      },
    });
    res.status(201).json(user);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
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
    name,
    role,
    state,
    city,
    businessCategories,
    profileCompleted,
    whatsapp,
    whatsappVerified,
    accountType,
    personal = {},
    company = {},
  } = req.body;

  try {
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(role && { role }),
        ...(state && { state }),
        ...(city && { city }),
        ...(businessCategories && { businessCategories }),
        ...(profileCompleted !== undefined && { profileCompleted }),
        ...(whatsapp && { whatsapp }),
        ...(whatsappVerified !== undefined && { whatsappVerified }),
        ...(accountType && { accountType }),
        // Personal fields
        ...(personal.name && { personalName: personal.name }),
        ...(personal.location && { personalLocation: personal.location }),
        ...(typeof personal.profilePicture === "string" &&
          personal.profilePicture && {
            personalProfilePic: personal.profilePicture,
          }),
        // Company fields
        ...(company.companyName && { companyName: company.companyName }),
        ...(company.businessAddress && {
          businessAddress: company.businessAddress,
        }),
        ...(company.businessRole && { businessRole: company.businessRole }),
        ...(typeof company.companyPicture === "string" &&
          company.companyPicture && {
            companyPicture: company.companyPicture,
          }),
      },
    });

    res.json(user);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
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
