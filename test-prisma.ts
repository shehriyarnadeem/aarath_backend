import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Available Prisma models:");
  console.log(Object.keys(prisma));
}

main()
  .catch((err) => console.error(err))
  .finally(() => prisma.$disconnect());
