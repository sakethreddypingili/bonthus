-- Migration: Add Employee ID
-- Description: Adds a unique 7-digit random employee ID column and backfills existing users.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS emp_id TEXT UNIQUE;

-- Backfill existing users that don't have an emp_id
DO $$
DECLARE
    r RECORD;
    new_id TEXT;
    done BOOLEAN;
BEGIN
    FOR r IN SELECT id FROM public.users WHERE emp_id IS NULL LOOP
        done := false;
        WHILE NOT done LOOP
            -- Generate 7 digit random number as string (1000000 to 9999999)
            new_id := floor(random() * 9000000 + 1000000)::text;
            -- Check if it exists
            IF NOT EXISTS (SELECT 1 FROM public.users WHERE emp_id = new_id) THEN
                UPDATE public.users SET emp_id = new_id WHERE id = r.id;
                done := true;
            END IF;
        END LOOP;
    END LOOP;
END $$;
