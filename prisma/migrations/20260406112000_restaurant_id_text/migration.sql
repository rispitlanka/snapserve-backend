-- Widen Restaurant.id and all referencing FK columns from VARCHAR(6) to TEXT.
-- Must drop FKs first; cannot DROP PRIMARY KEY while dependents exist.

-- DropForeignKey
ALTER TABLE "Addon" DROP CONSTRAINT IF EXISTS "Addon_restaurantId_fkey";
ALTER TABLE "Brand" DROP CONSTRAINT IF EXISTS "Brand_restaurantId_fkey";
ALTER TABLE "CashierRegisterSession" DROP CONSTRAINT IF EXISTS "CashierRegisterSession_restaurantId_fkey";
ALTER TABLE "Customer" DROP CONSTRAINT IF EXISTS "Customer_restaurantId_fkey";
ALTER TABLE "Expense" DROP CONSTRAINT IF EXISTS "Expense_restaurantId_fkey";
ALTER TABLE "InventoryItem" DROP CONSTRAINT IF EXISTS "InventoryItem_restaurantId_fkey";
ALTER TABLE "InventoryMovement" DROP CONSTRAINT IF EXISTS "InventoryMovement_restaurantId_fkey";
ALTER TABLE "ItemCategory" DROP CONSTRAINT IF EXISTS "ItemCategory_restaurantId_fkey";
ALTER TABLE "ItemSubCategory" DROP CONSTRAINT IF EXISTS "ItemSubCategory_restaurantId_fkey";
ALTER TABLE "MenuCategory" DROP CONSTRAINT IF EXISTS "MenuCategory_restaurantId_fkey";
ALTER TABLE "MenuItem" DROP CONSTRAINT IF EXISTS "MenuItem_restaurantId_fkey";
ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_restaurantId_fkey";
ALTER TABLE "Purchase" DROP CONSTRAINT IF EXISTS "Purchase_restaurantId_fkey";
ALTER TABLE "Register" DROP CONSTRAINT IF EXISTS "Register_restaurantId_fkey";
ALTER TABLE "Supplier" DROP CONSTRAINT IF EXISTS "Supplier_restaurantId_fkey";
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_restaurantId_fkey";
ALTER TABLE "Variant" DROP CONSTRAINT IF EXISTS "Variant_restaurantId_fkey";

-- AlterTable (child FK columns first)
ALTER TABLE "Addon" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
ALTER TABLE "Brand" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
ALTER TABLE "CashierRegisterSession" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
ALTER TABLE "Customer" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
ALTER TABLE "Expense" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
ALTER TABLE "InventoryItem" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
ALTER TABLE "InventoryMovement" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
ALTER TABLE "ItemCategory" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
ALTER TABLE "ItemSubCategory" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
ALTER TABLE "MenuCategory" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
ALTER TABLE "MenuItem" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
ALTER TABLE "Order" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
ALTER TABLE "Purchase" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
ALTER TABLE "Register" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
ALTER TABLE "Supplier" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
ALTER TABLE "User" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
ALTER TABLE "Variant" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;

-- AlterTable (primary key column; PK stays, no need to drop/recreate)
ALTER TABLE "Restaurant" ALTER COLUMN "id" SET DATA TYPE TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemCategory" ADD CONSTRAINT "ItemCategory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ItemSubCategory" ADD CONSTRAINT "ItemSubCategory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuCategory" ADD CONSTRAINT "MenuCategory_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Variant" ADD CONSTRAINT "Variant_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Addon" ADD CONSTRAINT "Addon_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Register" ADD CONSTRAINT "Register_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashierRegisterSession" ADD CONSTRAINT "CashierRegisterSession_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
