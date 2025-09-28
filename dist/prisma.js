"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
// Instantiate a single PrismaClient. In production you may want
// to ensure this is reused across function calls to avoid exhausting
// database connections.
const prisma = new client_1.PrismaClient();
exports.default = prisma;
