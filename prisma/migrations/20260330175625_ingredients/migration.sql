-- CreateTable
CREATE TABLE "MenuItemIngredient" (
    "id" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit" "InventoryUnit" NOT NULL,

    CONSTRAINT "MenuItemIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuItemAddonIngredient" (
    "id" TEXT NOT NULL,
    "menuItemAddonId" TEXT NOT NULL,
    "inventoryItemId" TEXT NOT NULL,
    "quantity" DECIMAL(12,4) NOT NULL,
    "unit" "InventoryUnit" NOT NULL,

    CONSTRAINT "MenuItemAddonIngredient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemIngredient_menuItemId_inventoryItemId_key" ON "MenuItemIngredient"("menuItemId", "inventoryItemId");

-- CreateIndex
CREATE UNIQUE INDEX "MenuItemAddonIngredient_menuItemAddonId_inventoryItemId_key" ON "MenuItemAddonIngredient"("menuItemAddonId", "inventoryItemId");

-- AddForeignKey
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemIngredient" ADD CONSTRAINT "MenuItemIngredient_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemAddonIngredient" ADD CONSTRAINT "MenuItemAddonIngredient_menuItemAddonId_fkey" FOREIGN KEY ("menuItemAddonId") REFERENCES "MenuItemAddon"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MenuItemAddonIngredient" ADD CONSTRAINT "MenuItemAddonIngredient_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
