-- Consolidated Migration Snapshot: Refined Hierarchy Cleanup
-- Generated on 2026-06-15 15:30:00

-- 1. Update existing records to match new consolidated hierarchy
UPDATE public.users SET operation_type = 'retail_ops' WHERE operation_type = 'store';
UPDATE public.users SET operation_type = 'warehouse' WHERE operation_type = 'lab';

-- 2. Refine the CHECK constraint for operation_type
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_operation_type_check;
ALTER TABLE public.users ADD CONSTRAINT users_operation_type_check 
CHECK (operation_type IN ('finance', 'hr', 'retail_ops', 'warehouse', 'company'));
