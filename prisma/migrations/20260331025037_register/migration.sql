DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'CashierRegisterSession'
  ) THEN
    BEGIN
      ALTER TABLE "CashierRegisterSession" DROP CONSTRAINT IF EXISTS "CashierRegisterSession_restaurantId_fkey";
      ALTER TABLE "CashierRegisterSession" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
      ALTER TABLE "CashierRegisterSession"
        ADD CONSTRAINT "CashierRegisterSession_restaurantId_fkey"
        FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
    END;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'Register'
  ) THEN
    BEGIN
      ALTER TABLE "Register" DROP CONSTRAINT IF EXISTS "Register_restaurantId_fkey";
      ALTER TABLE "Register" ALTER COLUMN "restaurantId" SET DATA TYPE TEXT;
      ALTER TABLE "Register"
        ADD CONSTRAINT "Register_restaurantId_fkey"
        FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    EXCEPTION
      WHEN undefined_table THEN
        NULL;
    END;
  END IF;
END $$;
