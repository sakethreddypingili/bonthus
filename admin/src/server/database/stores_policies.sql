-- Stores RLS (no subqueries on users table — avoids RLS recursion)

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read access to everyone" ON public.stores;
DROP POLICY IF EXISTS "Users can read own store details" ON public.stores;
DROP POLICY IF EXISTS "stores_select" ON public.stores;
DROP POLICY IF EXISTS "stores_insert_admin" ON public.stores;
DROP POLICY IF EXISTS "stores_update_admin" ON public.stores;
DROP POLICY IF EXISTS "stores_delete_admin" ON public.stores;

CREATE POLICY "stores_public_read"
  ON public.stores
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "stores_select"
  ON public.stores
  FOR SELECT
  TO authenticated
  USING (
    is_admin_or_super_admin()
    OR id = auth_user_store_id()
  );

CREATE POLICY "stores_insert_admin"
  ON public.stores
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_super_admin());

CREATE POLICY "stores_update_admin"
  ON public.stores
  FOR UPDATE
  TO authenticated
  USING (is_admin_or_super_admin());

CREATE POLICY "stores_delete_admin"
  ON public.stores
  FOR DELETE
  TO authenticated
  USING (is_admin_or_super_admin());

NOTIFY pgrst, 'reload schema';
