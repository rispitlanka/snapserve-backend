-- CreateEnum
CREATE TYPE "CustomerLoyaltyTxnType" AS ENUM ('EARN', 'REDEEM', 'VOID_RESTORE');

-- AlterTable
ALTER TABLE "Customer"
ADD COLUMN "loyaltyPoints" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "loyaltyPointsEarned" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "loyaltyPointsUsed" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CustomerLoyaltyTransaction" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "CustomerLoyaltyTxnType" NOT NULL,
    "pointsDelta" DECIMAL(12,2) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerLoyaltyTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerLoyaltyTransaction_customerId_createdAt_idx" ON "CustomerLoyaltyTransaction"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "CustomerLoyaltyTransaction_restaurantId_createdAt_idx" ON "CustomerLoyaltyTransaction"("restaurantId", "createdAt");

-- AddForeignKey
ALTER TABLE "CustomerLoyaltyTransaction" ADD CONSTRAINT "CustomerLoyaltyTransaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLoyaltyTransaction" ADD CONSTRAINT "CustomerLoyaltyTransaction_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerLoyaltyTransaction" ADD CONSTRAINT "CustomerLoyaltyTransaction_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
