-- Fix infinite recursion: policies must not SELECT from users under users RLS.
-- Use SECURITY DEFINER helpers instead.

CREATE OR REPLACE FUNCTION public.auth_user_store_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT store_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_store_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.auth_user_role() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_or_super_admin() TO authenticated, anon;

DROP POLICY IF EXISTS "Users can view store staff" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;

CREATE POLICY "users_select"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR is_admin_or_super_admin()
    OR (
      auth_user_store_id() IS NOT NULL
      AND store_id = auth_user_store_id()
    )
  );

NOTIFY pgrst, 'reload schema';
