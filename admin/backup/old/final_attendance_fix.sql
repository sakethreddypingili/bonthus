-- Final schema fix for attendance_qr_codes
-- Ensures all columns used by the application exist and are correctly named

DO $$ 
BEGIN 
    -- 1. Rename 'code' to 'qr_code_token' if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_qr_codes' AND column_name='code') THEN
        ALTER TABLE public.attendance_qr_codes RENAME COLUMN code TO qr_code_token;
    END IF;

    -- 2. Add qr_code_token if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_qr_codes' AND column_name='qr_code_token') THEN
        ALTER TABLE public.attendance_qr_codes ADD COLUMN qr_code_token TEXT UNIQUE NOT NULL;
    END IF;

    -- 3. Add qr_type if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_qr_codes' AND column_name='qr_type') THEN
        ALTER TABLE public.attendance_qr_codes ADD COLUMN qr_type TEXT NOT NULL DEFAULT 'check_in' CHECK (qr_type IN ('check_in', 'check_out'));
    END IF;

    -- 4. Add valid_date if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_qr_codes' AND column_name='valid_date') THEN
        ALTER TABLE public.attendance_qr_codes ADD COLUMN valid_date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;

END $$;

-- Force refresh PostgREST cache
NOTIFY pgrst, 'reload schema';

-- Verify permissions
GRANT ALL ON TABLE public.attendance_qr_codes TO authenticated;
GRANT ALL ON TABLE public.attendance_qr_codes TO anon;
GRANT ALL ON TABLE public.attendance_qr_codes TO service_role;
