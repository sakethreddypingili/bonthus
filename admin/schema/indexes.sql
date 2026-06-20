-- INDEXES FETCHED FROM LIVE DATABASE

DROP INDEX IF EXISTS public."idx_users_store";
CREATE INDEX idx_users_store ON public.users USING btree (store_id);

DROP INDEX IF EXISTS public."idx_customers_phone";
CREATE INDEX idx_customers_phone ON public.customers USING btree (phone);

DROP INDEX IF EXISTS public."idx_customers_store";
CREATE INDEX idx_customers_store ON public.customers USING btree (store_id);

DROP INDEX IF EXISTS public."idx_prescriptions_customer";
CREATE INDEX idx_prescriptions_customer ON public.prescriptions USING btree (customer_id);

DROP INDEX IF EXISTS public."uq_store_product";
CREATE UNIQUE INDEX uq_store_product ON public.store_inventory USING btree (store_id, product_id);

DROP INDEX IF EXISTS public."idx_inventory_store";
CREATE INDEX idx_inventory_store ON public.store_inventory USING btree (store_id);

DROP INDEX IF EXISTS public."idx_inventory_product";
CREATE INDEX idx_inventory_product ON public.store_inventory USING btree (product_id);

DROP INDEX IF EXISTS public."idx_orders_customer";
CREATE INDEX idx_orders_customer ON public.orders USING btree (customer_id);

DROP INDEX IF EXISTS public."idx_orders_store";
CREATE INDEX idx_orders_store ON public.orders USING btree (store_id);

DROP INDEX IF EXISTS public."idx_orders_disabled";
CREATE INDEX idx_orders_disabled ON public.orders USING btree (disabled) WHERE (disabled = false);

DROP INDEX IF EXISTS public."idx_order_items_order";
CREATE INDEX idx_order_items_order ON public.order_items USING btree (order_id);

DROP INDEX IF EXISTS public."idx_payments_order";
CREATE INDEX idx_payments_order ON public.payments USING btree (order_id);

DROP INDEX IF EXISTS public."idx_schedules_date";
CREATE INDEX idx_schedules_date ON public.schedules USING btree (scheduled_date);

DROP INDEX IF EXISTS public."idx_notifications_user_unread";
CREATE INDEX idx_notifications_user_unread ON public.notifications USING btree (user_id) WHERE (is_read = false);

DROP INDEX IF EXISTS public."idx_attendance_user";
CREATE INDEX idx_attendance_user ON public.attendance USING btree (user_id);

-- New Optimization Indexes
CREATE INDEX IF NOT EXISTS idx_customers_family ON public.customers(family_id);
CREATE INDEX IF NOT EXISTS idx_dependents_parent ON public.dependents(parent_customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_order ON public.invoices(order_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id);

