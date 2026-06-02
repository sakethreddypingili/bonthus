-- Public invoice links: allow reading order graph by order_number (anon share links)
-- order_number is unique and non-guessable (e.g. OD-365867)

DROP POLICY IF EXISTS "Public invoice read orders" ON orders;
CREATE POLICY "Public invoice read orders"
  ON orders FOR SELECT
  TO anon
  USING (order_number IS NOT NULL);

DROP POLICY IF EXISTS "Public invoice read customers" ON customers;
CREATE POLICY "Public invoice read customers"
  ON customers FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.customer_id = customers.id AND o.order_number IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public invoice read order items" ON order_items;
CREATE POLICY "Public invoice read order items"
  ON order_items FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.id = order_items.order_id AND o.order_number IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public invoice read prescriptions" ON prescriptions;
CREATE POLICY "Public invoice read prescriptions"
  ON prescriptions FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM orders o
      WHERE o.customer_id = prescriptions.customer_id AND o.order_number IS NOT NULL
    )
  );

DROP POLICY IF EXISTS "Public invoice read products" ON products;
CREATE POLICY "Public invoice read products"
  ON products FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.product_id = products.id AND o.order_number IS NOT NULL
    )
  );

NOTIFY pgrst, 'reload schema';
