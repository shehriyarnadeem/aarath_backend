-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "auctionDuration" INTEGER,
ADD COLUMN     "auctionEndTime" TIMESTAMP(3),
ADD COLUMN     "auctionStatus" TEXT,
ADD COLUMN     "auction_live" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "currentBid" DOUBLE PRECISION,
ADD COLUMN     "price" DOUBLE PRECISION,
ADD COLUMN     "priceType" TEXT,
ADD COLUMN     "startingBid" DOUBLE PRECISION;
