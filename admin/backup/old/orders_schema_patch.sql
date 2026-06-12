-- Align orders table with app expectations (soft-disable flag)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_orders_disabled ON orders(disabled) WHERE disabled = false;

NOTIFY pgrst, 'reload schema';
