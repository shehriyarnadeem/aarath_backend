/*
  Warnings:

  - You are about to drop the column `auctionDuration` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `auctionEndTime` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `auctionStatus` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `auction_live` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `currentBid` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `startingBid` on the `Product` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('MARKETPLACE', 'AUCTION');

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "auctionDuration",
DROP COLUMN "auctionEndTime",
DROP COLUMN "auctionStatus",
DROP COLUMN "auction_live",
DROP COLUMN "currentBid",
DROP COLUMN "startingBid",
ADD COLUMN     "environment" "ProductType" NOT NULL DEFAULT 'MARKETPLACE';

-- AlterTable
ALTER TABLE "auction_rooms" ADD COLUMN     "closed" BOOLEAN NOT NULL DEFAULT true;
