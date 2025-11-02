-- CreateTable
CREATE TABLE "auction_rooms" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "startingBid" DOUBLE PRECISION NOT NULL,
    "currentHighestBid" DOUBLE PRECISION,
    "currentHighestBidderId" TEXT,
    "winnerId" TEXT,
    "reservePrice" DOUBLE PRECISION DEFAULT 0.00,
    "minBidIncrement" DOUBLE PRECISION NOT NULL DEFAULT 50.00,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "totalBids" INTEGER NOT NULL DEFAULT 0,
    "totalParticipants" INTEGER NOT NULL DEFAULT 0,
    "isReserveReached" BOOLEAN NOT NULL DEFAULT false,
    "buyNowPrice" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auction_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_bids" (
    "id" TEXT NOT NULL,
    "auctionRoomId" TEXT NOT NULL,
    "bidderId" TEXT NOT NULL,
    "bidderName" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isWinningBid" BOOLEAN NOT NULL DEFAULT false,
    "previousBidAmount" DOUBLE PRECISION,
    "bidType" TEXT NOT NULL DEFAULT 'regular',
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "auction_bids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auction_participants" (
    "id" TEXT NOT NULL,
    "auctionRoomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userName" TEXT,
    "firstJoinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalBidsPlaced" INTEGER NOT NULL DEFAULT 0,
    "highestBidAmount" DOUBLE PRECISION,
    "isWinner" BOOLEAN NOT NULL DEFAULT false,
    "hasLeftRoom" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "auction_participants_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "auction_rooms_productId_key" ON "auction_rooms"("productId");

-- CreateIndex
CREATE INDEX "auction_bids_auctionRoomId_timestamp_idx" ON "auction_bids"("auctionRoomId", "timestamp");

-- CreateIndex
CREATE INDEX "auction_bids_bidderId_idx" ON "auction_bids"("bidderId");

-- CreateIndex
CREATE INDEX "auction_participants_userId_idx" ON "auction_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "auction_participants_auctionRoomId_userId_key" ON "auction_participants"("auctionRoomId", "userId");

-- AddForeignKey
ALTER TABLE "auction_rooms" ADD CONSTRAINT "auction_rooms_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_bids" ADD CONSTRAINT "auction_bids_auctionRoomId_fkey" FOREIGN KEY ("auctionRoomId") REFERENCES "auction_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auction_participants" ADD CONSTRAINT "auction_participants_auctionRoomId_fkey" FOREIGN KEY ("auctionRoomId") REFERENCES "auction_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
