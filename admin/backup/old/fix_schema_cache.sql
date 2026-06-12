-- Force refresh of PostgREST schema cache
-- Run this in your Supabase SQL Editor

-- 1. Ensure the column exists (Safety check)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_qr_codes' AND column_name='code') THEN
        ALTER TABLE public.attendance_qr_codes ADD COLUMN code TEXT UNIQUE NOT NULL;
    END IF;
END $$;

-- 2. Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';

-- 3. Grant proper permissions just in case
GRANT SELECT, INSERT, UPDATE ON public.attendance_qr_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.attendance_qr_codes TO anon;
GRANT SELECT, INSERT, UPDATE ON public.attendance_qr_codes TO service_role;
