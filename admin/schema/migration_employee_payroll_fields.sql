-- Migration: Employee Payroll Fields
-- Description: Adds salary, bank details, Aadhaar, PF, and ESI fields to users table.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS aadhaar_no TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS account_no TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ifsc_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS micr_code TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pf_uan_no TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS esi_no TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS ctc NUMERIC;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS take_home NUMERIC;
