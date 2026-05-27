-- Fix live schema drift for store location updates.
-- This matches the Master Schema Specification where public.store includes address.

ALTER TABLE IF EXISTS public.store
    ADD COLUMN IF NOT EXISTS address text;

-- Refresh PostgREST so the admin UI can update the new column immediately.
NOTIFY pgrst, 'reload schema';