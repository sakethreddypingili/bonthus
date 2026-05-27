-- Migration: Add store_id to orders table and company details to store table

-- 1. Add store_id column to orders table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'orders' AND column_name = 'store_id'
  ) THEN
    ALTER TABLE orders ADD COLUMN store_id text REFERENCES store(id);
  END IF;
END $$;



-- 3. Add company details columns to store table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'store' AND column_name = 'gstin'
  ) THEN
    ALTER TABLE store ADD COLUMN gstin text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'store' AND column_name = 'phone'
  ) THEN
    ALTER TABLE store ADD COLUMN phone text;
  END IF;
END $$;

-- 4. Create store_tax_rates table if it doesn't exist
CREATE TABLE IF NOT EXISTS store_tax_rates (
  id text primary key default gen_id('STR-', 4),
  store_id text references store(id),
  sgst numeric DEFAULT 9,
  cgst numeric DEFAULT 9,
  igst numeric DEFAULT 18,
  created_at timestamp with time zone default now(),
  UNIQUE(store_id)
);

-- 5. Enable RLS on store_tax_rates if needed
ALTER TABLE store_tax_rates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_authenticated" ON store_tax_rates 
  FOR ALL USING (auth.role() = 'authenticated');

-- 6. Create index on orders.store_id for better query performance
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
