-- Consolidated Migration Snapshot: Expand Employee Operations
-- Generated on 2026-06-15 14:30:00

-- 1. Add operation_type column to public.users
ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS operation_type TEXT;

-- 2. Add CHECK constraint for operation_type
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_operation_type_check') THEN
        ALTER TABLE public.users ADD CONSTRAINT users_operation_type_check 
        CHECK (operation_type IN ('store', 'company', 'warehouse'));
    END IF;
END
$$;

-- 3. Populate default values for existing users based on context
-- Users with a store_id belong to 'store' operations
UPDATE public.users 
SET operation_type = 'store' 
WHERE store_id IS NOT NULL AND operation_type IS NULL;

-- Admins belong to 'company' operations
UPDATE public.users 
SET operation_type = 'company' 
WHERE role IN ('admin', 'super_admin') AND operation_type IS NULL;

-- Default everything else to 'store' (safest fallback)
UPDATE public.users 
SET operation_type = 'store' 
WHERE operation_type IS NULL;
