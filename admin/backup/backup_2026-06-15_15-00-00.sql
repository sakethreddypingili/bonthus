-- Consolidated Migration Snapshot: Enterprise Role Hierarchy & Address Fields
-- Generated on 2026-06-15 15:00:00

-- 1. Add new address columns to public.users
ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS current_address TEXT,
ADD COLUMN IF NOT EXISTS permanent_address TEXT;

-- 2. Update existing address data (migration of old 'address' field)
UPDATE public.users 
SET current_address = address 
WHERE current_address IS NULL AND address IS NOT NULL;

-- 3. Cleanup: Update operation_type check constraint to include new categories
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_operation_type_check;
ALTER TABLE public.users ADD CONSTRAINT users_operation_type_check 
CHECK (operation_type IN ('finance', 'hr', 'retail_ops', 'warehouse', 'store', 'lab', 'company'));
