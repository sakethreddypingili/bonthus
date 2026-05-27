-- Align Categories in Products
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE public.online_products DROP CONSTRAINT IF EXISTS online_products_category_check;

-- Instead of a check constraint, let's keep it flexible or use an enum. For now, no strict check constraint to avoid migration issues.

-- Add advanced fields to orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_address text,
  ADD COLUMN IF NOT EXISTS customer_dob date,
  ADD COLUMN IF NOT EXISTS items jsonb,
  ADD COLUMN IF NOT EXISTS rx_details jsonb,
  ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_discount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_paid numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due numeric DEFAULT 0;

ALTER TABLE public.online_orders 
  ADD COLUMN IF NOT EXISTS customer_phone text,
  ADD COLUMN IF NOT EXISTS customer_address text,
  ADD COLUMN IF NOT EXISTS customer_dob date,
  ADD COLUMN IF NOT EXISTS items jsonb,
  ADD COLUMN IF NOT EXISTS rx_details jsonb,
  ADD COLUMN IF NOT EXISTS subtotal numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_discount numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS advance_paid numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due numeric DEFAULT 0;
