-- Consolidated Migration Snapshot: Separate Labs & Role Hierarchy Refinement
-- Generated on 2026-06-15 16:00:00

-- 1. Create labs table
CREATE TABLE IF NOT EXISTS public.labs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- 2. Add lab_id to users table
ALTER TABLE IF EXISTS public.users 
ADD COLUMN IF NOT EXISTS lab_id UUID REFERENCES public.labs(id);

-- 3. Update operation_type check constraint (if needed, already includes 'lab')
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_operation_type_check;
ALTER TABLE public.users ADD CONSTRAINT users_operation_type_check 
CHECK (operation_type IN ('finance', 'hr', 'retail_ops', 'warehouse', 'company', 'store', 'lab'));
