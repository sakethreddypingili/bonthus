-- Migration: Unified Employee Management
-- Description: Adds detailed employee fields to the users table and cleans up terminology.

-- 1. Add employee-specific columns to users table
ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS personal_email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
ADD COLUMN IF NOT EXISTS designation TEXT,
ADD COLUMN IF NOT EXISTS joined_at DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT true;

-- 2. Add comment to clarify table usage
COMMENT ON TABLE public.users IS 'Unified Employee and User management table.';

-- 3. Update existing records (optional, but good for consistency)
UPDATE public.users SET designation = role WHERE designation IS NULL;
