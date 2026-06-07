-- =========================================================================
-- OPTICAL RETAIL SUITE - ATTENDANCE SYSTEM SCHEMA AND PERMISSIONS FIX
-- =========================================================================

-- 1. Create attendance table if missing
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'leave')),
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    UNIQUE(user_id, attendance_date)
);

-- 2. Create attendance_qr_codes table if missing
CREATE TABLE IF NOT EXISTS public.attendance_qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE,
    qr_type TEXT NOT NULL CHECK (qr_type IN ('check_in', 'check_out')),
    valid_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_qr_codes ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies for attendance_qr_codes
-- Everyone (authenticated) can select QR codes to scan them
DROP POLICY IF EXISTS "qr_codes_select" ON public.attendance_qr_codes;
CREATE POLICY "qr_codes_select" ON public.attendance_qr_codes FOR SELECT TO authenticated USING (true);

-- Only admins/managers can insert/update/delete QR codes
DROP POLICY IF EXISTS "qr_codes_admin_all" ON public.attendance_qr_codes;
CREATE POLICY "qr_codes_admin_all" ON public.attendance_qr_codes FOR ALL TO authenticated 
USING (is_admin_or_super_admin() OR (auth_user_role() IN ('manager', 'store_manager')))
WITH CHECK (is_admin_or_super_admin() OR (auth_user_role() IN ('manager', 'store_manager')));

-- 5. Create RLS Policies for attendance
-- Select: Users see self, Admins/Managers see all in store
DROP POLICY IF EXISTS "attendance_select" ON public.attendance;
CREATE POLICY "attendance_select" ON public.attendance FOR SELECT TO authenticated 
USING (
    user_id = auth.uid() 
    OR is_admin_or_super_admin() 
    OR (auth_user_store_id() IS NOT NULL AND user_id IN (SELECT id FROM public.users WHERE store_id = auth_user_store_id()))
);

-- Insert/Update: Users can check in/out for self
DROP POLICY IF EXISTS "attendance_self_manage" ON public.attendance;
CREATE POLICY "attendance_self_manage" ON public.attendance FOR ALL TO authenticated 
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 6. Grant Permissions (Essential for 'code column not found' cache error)
GRANT ALL ON TABLE public.attendance TO authenticated;
GRANT ALL ON TABLE public.attendance_qr_codes TO authenticated;
GRANT ALL ON TABLE public.attendance TO service_role;
GRANT ALL ON TABLE public.attendance_qr_codes TO service_role;

-- 7. Force Schema Reload
NOTIFY pgrst, 'reload schema';
