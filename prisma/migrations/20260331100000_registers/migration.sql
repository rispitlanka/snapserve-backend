-- CreateTable
CREATE TABLE "Register" (
    "id" TEXT NOT NULL,
    "restaurantId" VARCHAR(6) NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "occupiedBySessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Register_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashierRegisterSession" (
    "id" TEXT NOT NULL,
    "restaurantId" VARCHAR(6) NOT NULL,
    "registerId" TEXT NOT NULL,
    "cashierUserId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "lastHeartbeatAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashierRegisterSession_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "registerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Register_occupiedBySessionId_key" ON "Register"("occupiedBySessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Register_restaurantId_name_key" ON "Register"("restaurantId", "name");

-- CreateIndex
CREATE INDEX "CashierRegisterSession_restaurantId_cashierUserId_endedAt_idx" ON "CashierRegisterSession"("restaurantId", "cashierUserId", "endedAt");

-- CreateIndex
CREATE INDEX "CashierRegisterSession_restaurantId_registerId_endedAt_idx" ON "CashierRegisterSession"("restaurantId", "registerId", "endedAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "Register"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Register" ADD CONSTRAINT "Register_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Register" ADD CONSTRAINT "Register_occupiedBySessionId_fkey" FOREIGN KEY ("occupiedBySessionId") REFERENCES "CashierRegisterSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashierRegisterSession" ADD CONSTRAINT "CashierRegisterSession_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashierRegisterSession" ADD CONSTRAINT "CashierRegisterSession_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "Register"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashierRegisterSession" ADD CONSTRAINT "CashierRegisterSession_cashierUserId_fkey" FOREIGN KEY ("cashierUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
