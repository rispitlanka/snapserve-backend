-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('SALE', 'WASTE');

-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "orderType" "OrderType" NOT NULL DEFAULT 'SALE',
ADD COLUMN "wasteReason" TEXT,
ADD COLUMN "wastedAt" TIMESTAMP(3),
ADD COLUMN "wastedByUserId" TEXT;

-- AddForeignKey
ALTER TABLE "Order"
ADD CONSTRAINT "Order_wastedByUserId_fkey"
FOREIGN KEY ("wastedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
