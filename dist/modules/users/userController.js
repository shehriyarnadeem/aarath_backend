"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkProfileCompletion = exports.updateUser = exports.getUserById = exports.createUserWithSession = exports.createUser = exports.getUsers = void 0;
const prisma_1 = __importDefault(require("../../prisma"));
/**
 * Fetch all users from the database.
 */
async function getUsers(req, res) {
    try {
        const users = await prisma_1.default.user.findMany();
        res.json(users);
    }
    catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ error: "Failed to retrieve users" });
    }
}
exports.getUsers = getUsers;
/**
 * Create a new user in the database.
 * Expects an object with `id` (Firebase UID), `email`, `businessName`, `whatsapp`, `state`, `city`, `role`, and `businessCategories` in the request body.
 */
async function createUser(req, res) {
    const { id, email, businessName, whatsapp, state, city, role, businessCategories, } = req.body;
    if (!id || !whatsapp) {
        return res
            .status(400)
            .json({ error: "ID and WhatsApp/mobile number are required" });
    }
    try {
        const user = await prisma_1.default.user.create({
            data: {
                id,
                email,
                businessName,
                whatsapp,
                state,
                city,
                role,
                businessCategories,
            },
        });
        res.status(201).json(user);
    }
    catch (error) {
        console.error("Error creating user:", error);
        res.status(500).json({ error: "Failed to create user" });
    }
}
exports.createUser = createUser;
/**
 * Create a new user after onboarding completion and return user + session
 * Expects: { id, email, businessName, whatsapp, state, city, role, businessCategories }
 * Returns: user object and Firebase custom token
 */
async function createUserWithSession(req, res) {
    const { id, email, businessName, whatsapp, state, city, role, businessCategories, } = req.body;
    if (!id || !whatsapp) {
        return res
            .status(400)
            .json({ error: "ID and WhatsApp/mobile number are required" });
    }
    try {
        // Create user in DB
        const user = await prisma_1.default.user.create({
            data: {
                id,
                email,
                businessName,
                whatsapp,
                state,
                city,
                role,
                businessCategories,
                profileCompleted: true,
            },
        });
        // Issue Firebase custom token for session
        const admin = require("../../firebase").default || require("../../firebase");
        const customToken = await admin.auth().createCustomToken(user.id);
        res.status(201).json({ user, token: customToken });
    }
    catch (error) {
        console.error("Error creating user with session:", error);
        res.status(500).json({ error: "Failed to create user and session" });
    }
}
exports.createUserWithSession = createUserWithSession;
/**
 * Get user by ID
 */
async function getUserById(req, res) {
    const { id } = req.params;
    try {
        const user = await prisma_1.default.user.findUnique({
            where: { id },
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);
    }
    catch (error) {
        console.error("Error fetching user:", error);
        res.status(500).json({ error: "Failed to retrieve user" });
    }
}
exports.getUserById = getUserById;
/**
 * Update user profile
 */
async function updateUser(req, res) {
    const { id } = req.params;
    const { businessName, whatsapp, state, city, role, businessCategories, profileCompleted, email, } = req.body;
    try {
        const user = await prisma_1.default.user.update({
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
    }
    catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Failed to update user" });
    }
}
exports.updateUser = updateUser;
/**
 * Check if user profile is completed
 */
async function checkProfileCompletion(req, res) {
    const { id } = req.params;
    try {
        const user = await prisma_1.default.user.findUnique({
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
            hasCategories: user.businessCategories && user.businessCategories.length > 0,
        });
    }
    catch (error) {
        console.error("Error checking profile completion:", error);
        res.status(500).json({ error: "Failed to check profile completion" });
    }
}
exports.checkProfileCompletion = checkProfileCompletion;
