-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "UserRole" ADD VALUE 'RESELLER';
ALTER TYPE "UserRole" ADD VALUE 'SELLER';
ALTER TYPE "UserRole" ADD VALUE 'TRADER';
ALTER TYPE "UserRole" ADD VALUE 'SHELLER_MILLER_PROCESSOR';
ALTER TYPE "UserRole" ADD VALUE 'EXPORTER';
ALTER TYPE "UserRole" ADD VALUE 'STOCK_INVESTOR';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "email" DROP NOT NULL;
