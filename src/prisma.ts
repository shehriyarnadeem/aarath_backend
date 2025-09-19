import { PrismaClient } from "@prisma/client";

// Instantiate a single PrismaClient. In production you may want
// to ensure this is reused across function calls to avoid exhausting
// database connections.
const prisma = new PrismaClient();

export default prisma;
