-- Drop unique phone constraints on the customers table
-- This allows multiple customer entries (e.g. primary account holders and their family dependents)
-- to share the same phone number (which is extremely common for family profiles).
ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS customers_phone_key;
DROP INDEX IF EXISTS public.customers_phone_key;

-- Ensure we still have an index for fast lookups on phone number but NOT unique
CREATE INDEX IF NOT EXISTS idx_customers_phone ON public.customers(phone);
