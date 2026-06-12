-- store_inventory RLS: align with products table (admin + super_admin can manage any store)

DROP POLICY IF EXISTS "Users can view store inventory" ON store_inventory;
DROP POLICY IF EXISTS "Users can insert store inventory" ON store_inventory;
DROP POLICY IF EXISTS "Users can update store inventory" ON store_inventory;
DROP POLICY IF EXISTS "Users can delete store inventory" ON store_inventory;

CREATE POLICY "Users can view store inventory"
  ON store_inventory FOR SELECT
  TO authenticated
  USING (
    store_id = auth_user_store_id()
    OR is_admin_or_super_admin()
  );

CREATE POLICY "Users can insert store inventory"
  ON store_inventory FOR INSERT
  TO authenticated
  WITH CHECK (
    store_id = auth_user_store_id()
    OR is_admin_or_super_admin()
  );

CREATE POLICY "Users can update store inventory"
  ON store_inventory FOR UPDATE
  TO authenticated
  USING (
    store_id = auth_user_store_id()
    OR is_admin_or_super_admin()
  );

CREATE POLICY "Users can delete store inventory"
  ON store_inventory FOR DELETE
  TO authenticated
  USING (
    store_id = auth_user_store_id()
    OR is_admin_or_super_admin()
  );

NOTIFY pgrst, 'reload schema';
