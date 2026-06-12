-- INDEXES

-- =========================================================================
-- OPTIMIZATION INDEXES
-- =========================================================================
CREATE INDEX IF NOT EXISTS idx_users_store ON users(store_id);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

CREATE INDEX IF NOT EXISTS idx_customers_store ON customers(store_id);

CREATE INDEX IF NOT EXISTS idx_prescriptions_customer ON prescriptions(customer_id);

CREATE INDEX IF NOT EXISTS idx_inventory_store ON store_inventory(store_id);

CREATE INDEX IF NOT EXISTS idx_inventory_product ON store_inventory(product_id);

CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);

CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_attendance_user ON attendance(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = FALSE;

CREATE INDEX IF NOT EXISTS idx_orders_disabled ON orders(disabled) WHERE disabled = false;