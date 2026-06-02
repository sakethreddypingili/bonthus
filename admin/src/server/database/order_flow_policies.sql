-- RLS for order creation flow (customers, orders, line items, prescriptions, payments)
-- Admins with null store_id can operate on any store; store staff limited to their store_id.

-- -------------------------------------------------------------------------
-- customers
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view customers" ON customers;
DROP POLICY IF EXISTS "Users can insert customers" ON customers;
DROP POLICY IF EXISTS "Users can update customers" ON customers;
DROP POLICY IF EXISTS "Users can delete customers" ON customers;

CREATE POLICY "Users can view customers"
  ON customers FOR SELECT
  TO authenticated
  USING (
    store_id = auth_user_store_id()
    OR is_admin_or_super_admin()
  );

CREATE POLICY "Users can insert customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (
    store_id = auth_user_store_id()
    OR is_admin_or_super_admin()
  );

CREATE POLICY "Users can update customers"
  ON customers FOR UPDATE
  TO authenticated
  USING (
    store_id = auth_user_store_id()
    OR is_admin_or_super_admin()
  );

CREATE POLICY "Users can delete customers"
  ON customers FOR DELETE
  TO authenticated
  USING (
    is_admin_or_super_admin()
  );

-- -------------------------------------------------------------------------
-- prescriptions
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Users can insert prescriptions" ON prescriptions;
DROP POLICY IF EXISTS "Users can update prescriptions" ON prescriptions;

CREATE POLICY "Users can view prescriptions"
  ON prescriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = prescriptions.customer_id
        AND (
          c.store_id = auth_user_store_id()
          OR is_admin_or_super_admin()
        )
    )
  );

CREATE POLICY "Users can insert prescriptions"
  ON prescriptions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = customer_id
        AND (
          c.store_id = auth_user_store_id()
          OR is_admin_or_super_admin()
        )
    )
  );

CREATE POLICY "Users can update prescriptions"
  ON prescriptions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM customers c
      WHERE c.id = prescriptions.customer_id
        AND (
          c.store_id = auth_user_store_id()
          OR is_admin_or_super_admin()
        )
    )
  );

-- -------------------------------------------------------------------------
-- orders
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view orders from their store" ON orders;
DROP POLICY IF EXISTS "Users can only modify orders from their store" ON orders;
DROP POLICY IF EXISTS "Only admins can insert orders" ON orders;
DROP POLICY IF EXISTS "Users can view orders" ON orders;
DROP POLICY IF EXISTS "Users can insert orders" ON orders;
DROP POLICY IF EXISTS "Users can update orders" ON orders;
DROP POLICY IF EXISTS "Users can delete orders" ON orders;

CREATE POLICY "Users can view orders"
  ON orders FOR SELECT
  TO authenticated
  USING (
    store_id = auth_user_store_id()
    OR is_admin_or_super_admin()
  );

CREATE POLICY "Users can insert orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (
    store_id = auth_user_store_id()
    OR is_admin_or_super_admin()
  );

CREATE POLICY "Users can update orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (
    store_id = auth_user_store_id()
    OR is_admin_or_super_admin()
  );

CREATE POLICY "Users can delete orders"
  ON orders FOR DELETE
  TO authenticated
  USING (
    is_admin_or_super_admin()
  );

-- -------------------------------------------------------------------------
-- order_items
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view order items" ON order_items;
DROP POLICY IF EXISTS "Users can insert order items" ON order_items;
DROP POLICY IF EXISTS "Users can update order items" ON order_items;
DROP POLICY IF EXISTS "Users can delete order items" ON order_items;

CREATE POLICY "Users can view order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND (
          o.store_id = auth_user_store_id()
          OR is_admin_or_super_admin()
        )
    )
  );

CREATE POLICY "Users can insert order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (
          o.store_id = auth_user_store_id()
          OR is_admin_or_super_admin()
        )
    )
  );

CREATE POLICY "Users can update order items"
  ON order_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND (
          o.store_id = auth_user_store_id()
          OR is_admin_or_super_admin()
        )
    )
  );

CREATE POLICY "Users can delete order items"
  ON order_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id
        AND (
          o.store_id = auth_user_store_id()
          OR is_admin_or_super_admin()
        )
    )
  );

-- -------------------------------------------------------------------------
-- payments
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view payments" ON payments;
DROP POLICY IF EXISTS "Users can insert payments" ON payments;
DROP POLICY IF EXISTS "Users can update payments" ON payments;

CREATE POLICY "Users can view payments"
  ON payments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = payments.order_id
        AND (
          o.store_id = auth_user_store_id()
          OR is_admin_or_super_admin()
        )
    )
  );

CREATE POLICY "Users can insert payments"
  ON payments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_id
        AND (
          o.store_id = auth_user_store_id()
          OR is_admin_or_super_admin()
        )
    )
  );

CREATE POLICY "Users can update payments"
  ON payments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = payments.order_id
        AND (
          o.store_id = auth_user_store_id()
          OR is_admin_or_super_admin()
        )
    )
  );

NOTIFY pgrst, 'reload schema';
