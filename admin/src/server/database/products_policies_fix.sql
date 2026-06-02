-- Products RLS without users subqueries

DROP POLICY IF EXISTS "Only admins can insert products" ON products;
DROP POLICY IF EXISTS "Only admins can modify products" ON products;
DROP POLICY IF EXISTS "Only super_admin can delete products" ON products;

CREATE POLICY "Only admins can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_super_admin());

CREATE POLICY "Only admins can modify products"
  ON products FOR UPDATE
  TO authenticated
  USING (is_admin_or_super_admin());

CREATE POLICY "Only super_admin can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (auth_user_role() = 'super_admin');

NOTIFY pgrst, 'reload schema';
