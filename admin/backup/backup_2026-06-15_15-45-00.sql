-- Consolidated Migration Snapshot: Final Role Types & Constraints
-- Generated on 2026-06-15 15:45:00

-- 1. Ensure all hierarchical operation types are allowed in the database
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_operation_type_check;
ALTER TABLE public.users ADD CONSTRAINT users_operation_type_check 
CHECK (operation_type IN ('finance', 'hr', 'retail_ops', 'warehouse', 'company', 'store', 'lab'));
