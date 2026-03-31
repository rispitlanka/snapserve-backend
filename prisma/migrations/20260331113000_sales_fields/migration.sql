-- AlterTable
ALTER TABLE "Order"
ADD COLUMN "invoiceId" TEXT,
ADD COLUMN "invoiceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "saleType" "MenuType" NOT NULL DEFAULT 'DINEIN',
ADD COLUMN "returnedAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN "remarks" TEXT;

-- Backfill invoiceId for existing rows
UPDATE "Order"
SET "invoiceId" = 'INV-' || upper(substr(replace("id", '-', ''), 1, 10))
WHERE "invoiceId" IS NULL;

-- Enforce not null + unique
ALTER TABLE "Order"
ALTER COLUMN "invoiceId" SET NOT NULL;

CREATE UNIQUE INDEX "Order_invoiceId_key" ON "Order"("invoiceId");
