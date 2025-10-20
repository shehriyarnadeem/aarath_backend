-- CreateTable
CREATE TABLE "test_counters" (
    "id" TEXT NOT NULL,
    "counter_id" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "test_counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "websocket_connections" (
    "id" TEXT NOT NULL,
    "connection_id" TEXT NOT NULL,
    "counter_id" TEXT,
    "user_id" TEXT,
    "connected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "websocket_connections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "test_counters_counter_id_key" ON "test_counters"("counter_id");

-- CreateIndex
CREATE UNIQUE INDEX "websocket_connections_connection_id_key" ON "websocket_connections"("connection_id");

-- CreateIndex
CREATE INDEX "websocket_connections_counter_id_idx" ON "websocket_connections"("counter_id");

-- CreateIndex
CREATE INDEX "websocket_connections_expires_at_idx" ON "websocket_connections"("expires_at");

-- CreateIndex
CREATE INDEX "websocket_connections_user_id_idx" ON "websocket_connections"("user_id");
