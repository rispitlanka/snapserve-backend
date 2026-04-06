-- AlterTable (IF NOT EXISTS: DB may already have this column from db push or a prior partial apply)
ALTER TABLE "OrderPayment" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
