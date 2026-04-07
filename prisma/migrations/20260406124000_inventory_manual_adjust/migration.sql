-- Add enum value for manual stock corrections
ALTER TYPE "InventoryMovementKind" ADD VALUE IF NOT EXISTS 'MANUAL_ADJUST';
