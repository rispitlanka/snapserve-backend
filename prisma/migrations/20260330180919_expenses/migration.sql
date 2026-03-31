-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('CLEANING', 'DEFAULT', 'INSTALLMENTS', 'KITCHEN', 'MARKETING', 'STAFF_SALARY', 'STAFF_UTILITY', 'UTILITY');

-- CreateEnum
CREATE TYPE "ExpensePaymentMethod" AS ENUM ('CASH', 'CREDIT', 'BANK_TRANSFER', 'UPI', 'CARD', 'OTHER');

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "expenseDate" TIMESTAMP(3) NOT NULL,
    "refNo" TEXT,
    "payeeName" TEXT,
    "description" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "paymentMethod" "ExpensePaymentMethod" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
