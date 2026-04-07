-- CreateEnum
CREATE TYPE "PurchaseSettlementMethod" AS ENUM ('CASH', 'BANK_TRANSFER', 'UPI', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "PurchasePaymentStatus" AS ENUM ('PENDING', 'PAID', 'CREDIT');

-- AlterTable
ALTER TABLE "Purchase"
ADD COLUMN "paymentStatus" "PurchasePaymentStatus" NOT NULL DEFAULT 'PAID';

-- Backfill based on existing paymentMethod
UPDATE "Purchase"
SET "paymentStatus" = CASE
  WHEN "paymentMethod" = 'CREDIT' THEN 'CREDIT'::"PurchasePaymentStatus"
  ELSE 'PAID'::"PurchasePaymentStatus"
END;

-- CreateTable
CREATE TABLE "PurchasePayment" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "method" "PurchaseSettlementMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchasePayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PurchasePayment" ADD CONSTRAINT "PurchasePayment_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
