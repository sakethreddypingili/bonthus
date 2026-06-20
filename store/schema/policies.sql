-- POLICIES

-- =========================================================================
-- OPTICAL RETAIL SUITE - COMPREHENSIVE RLS POLICIES
-- =========================================================================

-- -------------------------------------------------------------------------
-- 0. ENABLE RLS ON ALL TABLES
-- -------------------------------------------------------------------------
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_barcodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 1. STORES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "stores_public_read" ON public.stores;
DROP POLICY IF EXISTS "stores_select" ON public.stores;
DROP POLICY IF EXISTS "stores_insert_admin" ON public.stores;
DROP POLICY IF EXISTS "stores_update_admin" ON public.stores;
DROP POLICY IF EXISTS "stores_delete_admin" ON public.stores;
DROP POLICY IF EXISTS "stores_admin_all" ON public.stores;
DROP POLICY IF EXISTS "Allow read access to everyone" ON public.stores;
DROP POLICY IF EXISTS "Users can read own store details" ON public.stores;

CREATE POLICY "stores_public_read" ON public.stores FOR SELECT TO anon USING (true);
CREATE POLICY "stores_select" ON public.stores FOR SELECT TO authenticated USING (is_admin_or_super_admin() OR id = auth_user_store_id());
CREATE POLICY "stores_insert_admin" ON public.stores FOR INSERT TO authenticated WITH CHECK (is_admin_or_super_admin());
CREATE POLICY "stores_update_admin" ON public.stores FOR UPDATE TO authenticated USING (is_admin_or_super_admin());
CREATE POLICY "stores_delete_admin" ON public.stores FOR DELETE TO authenticated USING (is_admin_or_super_admin());

-- -------------------------------------------------------------------------
-- 2. USERS (Profile Data)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own details" ON public.users;
DROP POLICY IF EXISTS "Users and admins can update profile details" ON public.users;
DROP POLICY IF EXISTS "Users can view store staff" ON public.users;

CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated USING (id = auth.uid() OR is_admin_or_super_admin() OR (auth_user_store_id() IS NOT NULL AND store_id = auth_user_store_id()));
CREATE POLICY "users_admin_all" ON public.users FOR ALL TO authenticated USING (is_admin_or_super_admin()) WITH CHECK (is_admin_or_super_admin());

-- -------------------------------------------------------------------------
-- 3. USER SETTINGS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_settings_self" ON public.user_settings;
CREATE POLICY "user_settings_self" ON public.user_settings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- -------------------------------------------------------------------------
-- 4. CUSTOMERS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "customers_store_access" ON public.customers;
DROP POLICY IF EXISTS "Users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Users can update customers" ON public.customers;
DROP POLICY IF EXISTS "Users can delete customers" ON public.customers;

CREATE POLICY "Users can view customers" ON public.customers FOR SELECT TO authenticated USING (store_id = auth_user_store_id() OR is_admin_or_super_admin());
CREATE POLICY "Users can insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (store_id = auth_user_store_id() OR is_admin_or_super_admin());
CREATE POLICY "Users can update customers" ON public.customers FOR UPDATE TO authenticated USING (store_id = auth_user_store_id() OR is_admin_or_super_admin());
CREATE POLICY "Users can delete customers" ON public.customers FOR DELETE TO authenticated USING (is_admin_or_super_admin());

-- -------------------------------------------------------------------------
-- 5. PRESCRIPTIONS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "prescriptions_store_access" ON public.prescriptions;
DROP POLICY IF EXISTS "Users can view prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Users can insert prescriptions" ON public.prescriptions;
DROP POLICY IF EXISTS "Users can update prescriptions" ON public.prescriptions;

CREATE POLICY "Users can view prescriptions" ON public.prescriptions FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = prescriptions.customer_id AND (c.store_id = auth_user_store_id() OR is_admin_or_super_admin())));
CREATE POLICY "Users can insert prescriptions" ON public.prescriptions FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND (c.store_id = auth_user_store_id() OR is_admin_or_super_admin())));
CREATE POLICY "Users can update prescriptions" ON public.prescriptions FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.customers c WHERE c.id = prescriptions.customer_id AND (c.store_id = auth_user_store_id() OR is_admin_or_super_admin())));

-- -------------------------------------------------------------------------
-- 6. PRODUCTS & CATEGORIES (Catalog)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "products_select" ON public.products;
DROP POLICY IF EXISTS "products_admin_all" ON public.products;
DROP POLICY IF EXISTS "Only admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Only admins can modify products" ON public.products;
DROP POLICY IF EXISTS "Only super_admin can delete products" ON public.products;

CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Only admins can insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (is_admin_or_super_admin());
CREATE POLICY "Only admins can modify products" ON public.products FOR UPDATE TO authenticated USING (is_admin_or_super_admin());
CREATE POLICY "Only super_admin can delete products" ON public.products FOR DELETE TO authenticated USING (auth_user_role() = 'super_admin');

DROP POLICY IF EXISTS "categories_select" ON public.categories;
DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;

CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories_admin_all" ON public.categories FOR ALL TO authenticated USING (is_admin_or_super_admin()) WITH CHECK (is_admin_or_super_admin());

-- -------------------------------------------------------------------------
-- 7. STORE INVENTORY
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "inventory_select" ON public.store_inventory;
DROP POLICY IF EXISTS "inventory_all" ON public.store_inventory;
DROP POLICY IF EXISTS "Users can view store inventory" ON public.store_inventory;
DROP POLICY IF EXISTS "Users can insert store inventory" ON public.store_inventory;
DROP POLICY IF EXISTS "Users can update store inventory" ON public.store_inventory;
DROP POLICY IF EXISTS "Users can delete store inventory" ON public.store_inventory;

CREATE POLICY "Users can view store inventory" ON public.store_inventory FOR SELECT TO authenticated USING (store_id = auth_user_store_id() OR is_admin_or_super_admin());
CREATE POLICY "Users can insert store inventory" ON public.store_inventory FOR INSERT TO authenticated WITH CHECK (store_id = auth_user_store_id() OR is_admin_or_super_admin());
CREATE POLICY "Users can update store inventory" ON public.store_inventory FOR UPDATE TO authenticated USING (store_id = auth_user_store_id() OR is_admin_or_super_admin());
CREATE POLICY "Users can delete store inventory" ON public.store_inventory FOR DELETE TO authenticated USING (store_id = auth_user_store_id() OR is_admin_or_super_admin());

-- -------------------------------------------------------------------------
-- 8. ORDERS & ITEMS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "orders_store_access" ON public.orders;
DROP POLICY IF EXISTS "Users can view orders" ON public.orders;
DROP POLICY IF EXISTS "Users can insert orders" ON public.orders;
DROP POLICY IF EXISTS "Users can update orders" ON public.orders;
DROP POLICY IF EXISTS "Users can delete orders" ON public.orders;

CREATE POLICY "Users can view orders" ON public.orders FOR SELECT TO authenticated USING (store_id = auth_user_store_id() OR is_admin_or_super_admin());
CREATE POLICY "Users can insert orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (store_id = auth_user_store_id() OR is_admin_or_super_admin());
CREATE POLICY "Users can update orders" ON public.orders FOR UPDATE TO authenticated USING (store_id = auth_user_store_id() OR is_admin_or_super_admin());
CREATE POLICY "Users can delete orders" ON public.orders FOR DELETE TO authenticated USING (is_admin_or_super_admin());

DROP POLICY IF EXISTS "order_items_access" ON public.order_items;
DROP POLICY IF EXISTS "Users can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Users can delete order items" ON public.order_items;

CREATE POLICY "Users can view order items" ON public.order_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.store_id = auth_user_store_id() OR is_admin_or_super_admin())));
CREATE POLICY "Users can insert order items" ON public.order_items FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.store_id = auth_user_store_id() OR is_admin_or_super_admin())));
CREATE POLICY "Users can update order items" ON public.order_items FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.store_id = auth_user_store_id() OR is_admin_or_super_admin())));
CREATE POLICY "Users can delete order items" ON public.order_items FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (o.store_id = auth_user_store_id() OR is_admin_or_super_admin())));

-- -------------------------------------------------------------------------
-- 9. PAYMENTS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "payments_access" ON public.payments;
DROP POLICY IF EXISTS "Users can view payments" ON public.payments;
DROP POLICY IF EXISTS "Users can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Users can update payments" ON public.payments;

CREATE POLICY "Users can view payments" ON public.payments FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = payments.order_id AND (o.store_id = auth_user_store_id() OR is_admin_or_super_admin())));
CREATE POLICY "Users can insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (o.store_id = auth_user_store_id() OR is_admin_or_super_admin())));
CREATE POLICY "Users can update payments" ON public.payments FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = payments.order_id AND (o.store_id = auth_user_store_id() OR is_admin_or_super_admin())));

-- -------------------------------------------------------------------------
-- 10. VENDORS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "vendors_select" ON public.vendors;
DROP POLICY IF EXISTS "vendors_admin_all" ON public.vendors;

CREATE POLICY "vendors_select" ON public.vendors FOR SELECT TO authenticated USING (true);
CREATE POLICY "vendors_admin_all" ON public.vendors FOR ALL TO authenticated USING (is_admin_or_super_admin()) WITH CHECK (is_admin_or_super_admin());

-- -------------------------------------------------------------------------
-- 11. SHIPMENTS & REQUISITIONS (Logistics)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "requisitions_access" ON public.store_requisitions;
CREATE POLICY "requisitions_access" ON public.store_requisitions FOR ALL TO authenticated USING (is_admin_or_super_admin() OR from_store_id = auth_user_store_id() OR to_store_id = auth_user_store_id()) WITH CHECK (is_admin_or_super_admin() OR from_store_id = auth_user_store_id() OR to_store_id = auth_user_store_id());

DROP POLICY IF EXISTS "requisition_items_access" ON public.store_requisition_items;
CREATE POLICY "requisition_items_access" ON public.store_requisition_items FOR ALL TO authenticated USING (is_admin_or_super_admin() OR EXISTS (SELECT 1 FROM public.store_requisitions r WHERE r.id = requisition_id AND (r.from_store_id = auth_user_store_id() OR r.to_store_id = auth_user_store_id()))) WITH CHECK (is_admin_or_super_admin() OR EXISTS (SELECT 1 FROM public.store_requisitions r WHERE r.id = requisition_id AND (r.from_store_id = auth_user_store_id() OR r.to_store_id = auth_user_store_id())));

DROP POLICY IF EXISTS "shipments_access" ON public.shipments;
CREATE POLICY "shipments_access" ON public.shipments FOR ALL TO authenticated USING (is_admin_or_super_admin() OR origin_store_id = auth_user_store_id() OR destination_store_id = auth_user_store_id()) WITH CHECK (is_admin_or_super_admin() OR origin_store_id = auth_user_store_id() OR destination_store_id = auth_user_store_id());

DROP POLICY IF EXISTS "shipment_items_access" ON public.shipment_items;
CREATE POLICY "shipment_items_access" ON public.shipment_items FOR ALL TO authenticated USING (is_admin_or_super_admin() OR EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND (s.origin_store_id = auth_user_store_id() OR s.destination_store_id = auth_user_store_id()))) WITH CHECK (is_admin_or_super_admin() OR EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND (s.origin_store_id = auth_user_store_id() OR s.destination_store_id = auth_user_store_id())));

-- -------------------------------------------------------------------------
-- 12. BARCODES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "barcodes_select" ON public.product_barcodes;
DROP POLICY IF EXISTS "barcodes_admin_all" ON public.product_barcodes;

CREATE POLICY "barcodes_select" ON public.product_barcodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "barcodes_admin_all" ON public.product_barcodes FOR ALL TO authenticated USING (is_admin_or_super_admin()) WITH CHECK (is_admin_or_super_admin());

-- -------------------------------------------------------------------------
-- 13. NOTIFICATIONS & ATTENDANCE
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_self" ON public.notifications;
CREATE POLICY "notifications_self" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "attendance_access" ON public.attendance;
CREATE POLICY "attendance_access" ON public.attendance FOR ALL TO authenticated USING (is_admin_or_super_admin() OR user_id = auth.uid() OR (auth_user_role() IN ('manager', 'store_manager') AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND u.store_id = auth_user_store_id()))) WITH CHECK (is_admin_or_super_admin() OR user_id = auth.uid());

DROP POLICY IF EXISTS "qr_codes_select" ON public.attendance_qr_codes;
DROP POLICY IF EXISTS "qr_codes_admin_all" ON public.attendance_qr_codes;

CREATE POLICY "qr_codes_select" ON public.attendance_qr_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "qr_codes_admin_all" ON public.attendance_qr_codes FOR ALL TO authenticated USING (is_admin_or_super_admin() OR (auth_user_role() IN ('manager', 'store_manager'))) WITH CHECK (is_admin_or_super_admin() OR (auth_user_role() IN ('manager', 'store_manager')));

-- -------------------------------------------------------------------------
-- 14. PUBLIC INVOICE ANONYMOUS ACCESS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public invoice read orders" ON public.orders;
CREATE POLICY "Public invoice read orders" ON public.orders FOR SELECT TO anon USING (order_number IS NOT NULL);

DROP POLICY IF EXISTS "Public invoice read customers" ON public.customers;
CREATE POLICY "Public invoice read customers" ON public.customers FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.customer_id = customers.id AND o.order_number IS NOT NULL));

DROP POLICY IF EXISTS "Public invoice read order items" ON public.order_items;
CREATE POLICY "Public invoice read order items" ON public.order_items FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.order_number IS NOT NULL));

DROP POLICY IF EXISTS "Public invoice read prescriptions" ON public.prescriptions;
CREATE POLICY "Public invoice read prescriptions" ON public.prescriptions FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.customer_id = prescriptions.customer_id AND o.order_number IS NOT NULL));

DROP POLICY IF EXISTS "Public invoice read products" ON public.products;
CREATE POLICY "Public invoice read products" ON public.products FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id WHERE oi.product_id = products.id AND o.order_number IS NOT NULL));

-- -------------------------------------------------------------------------
-- 15. NEW NORMALIZED & LEDGER TABLES
-- -------------------------------------------------------------------------

-- public.labs
DROP POLICY IF EXISTS "labs_select_policy" ON public.labs;
CREATE POLICY "labs_select_policy" ON public.labs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "labs_admin_policy" ON public.labs;
CREATE POLICY "labs_admin_policy" ON public.labs FOR ALL TO authenticated USING (is_admin_or_super_admin());

-- public.brands
DROP POLICY IF EXISTS "brands_select_policy" ON public.brands;
CREATE POLICY "brands_select_policy" ON public.brands FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "brands_admin_policy" ON public.brands;
CREATE POLICY "brands_admin_policy" ON public.brands FOR ALL TO authenticated USING (is_admin_or_super_admin());

-- public.family
DROP POLICY IF EXISTS "family_select_policy" ON public.family;
CREATE POLICY "family_select_policy" ON public.family FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "family_admin_policy" ON public.family;
CREATE POLICY "family_admin_policy" ON public.family FOR ALL TO authenticated USING (is_admin_or_super_admin());

-- public.dependents
DROP POLICY IF EXISTS "dependents_select_policy" ON public.dependents;
CREATE POLICY "dependents_select_policy" ON public.dependents FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "dependents_write_policy" ON public.dependents;
CREATE POLICY "dependents_write_policy" ON public.dependents FOR ALL TO authenticated USING (true);
DROP POLICY IF EXISTS "Public invoice read dependents" ON public.dependents;
CREATE POLICY "Public invoice read dependents" ON public.dependents FOR SELECT TO anon USING (true);

-- public.product_variants
DROP POLICY IF EXISTS "product_variants_select_policy" ON public.product_variants;
CREATE POLICY "product_variants_select_policy" ON public.product_variants FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "product_variants_admin_policy" ON public.product_variants;
CREATE POLICY "product_variants_admin_policy" ON public.product_variants FOR ALL TO authenticated USING (is_admin_or_super_admin());

-- public.invoices
DROP POLICY IF EXISTS "invoices_select_policy" ON public.invoices;
CREATE POLICY "invoices_select_policy" ON public.invoices FOR SELECT TO authenticated USING (is_admin_or_super_admin() OR store_id = auth_user_store_id());
DROP POLICY IF EXISTS "invoices_write_policy" ON public.invoices;
CREATE POLICY "invoices_write_policy" ON public.invoices FOR ALL TO authenticated USING (is_admin_or_super_admin() OR store_id = auth_user_store_id());
DROP POLICY IF EXISTS "Public invoice read invoices" ON public.invoices;
CREATE POLICY "Public invoice read invoices" ON public.invoices FOR SELECT TO anon USING (true);

-- public.invoice_items
DROP POLICY IF EXISTS "invoice_items_select_policy" ON public.invoice_items;
CREATE POLICY "invoice_items_select_policy" ON public.invoice_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND (i.store_id = auth_user_store_id() OR is_admin_or_super_admin())));
DROP POLICY IF EXISTS "invoice_items_write_policy" ON public.invoice_items;
CREATE POLICY "invoice_items_write_policy" ON public.invoice_items FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_items.invoice_id AND (i.store_id = auth_user_store_id() OR is_admin_or_super_admin())));
DROP POLICY IF EXISTS "Public invoice read invoice items" ON public.invoice_items;
CREATE POLICY "Public invoice read invoice items" ON public.invoice_items FOR SELECT TO anon USING (true);

-- public.stock_movements
DROP POLICY IF EXISTS "stock_movements_select_policy" ON public.stock_movements;
CREATE POLICY "stock_movements_select_policy" ON public.stock_movements FOR SELECT TO authenticated USING (is_admin_or_super_admin() OR store_id = auth_user_store_id());
DROP POLICY IF EXISTS "stock_movements_write_policy" ON public.stock_movements;
CREATE POLICY "stock_movements_write_policy" ON public.stock_movements FOR ALL TO authenticated USING (is_admin_or_super_admin() OR store_id = auth_user_store_id());

-- public.payroll_history
DROP POLICY IF EXISTS "payroll_history_select_policy" ON public.payroll_history;
CREATE POLICY "payroll_history_select_policy" ON public.payroll_history FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin_or_super_admin());
DROP POLICY IF EXISTS "payroll_history_admin_policy" ON public.payroll_history;
CREATE POLICY "payroll_history_admin_policy" ON public.payroll_history FOR ALL TO authenticated USING (is_admin_or_super_admin());

-- public.leave_requests
DROP POLICY IF EXISTS "leave_requests_select_policy" ON public.leave_requests;
CREATE POLICY "leave_requests_select_policy" ON public.leave_requests FOR SELECT TO authenticated USING (user_id = auth.uid() OR is_admin_or_super_admin());
DROP POLICY IF EXISTS "leave_requests_write_policy" ON public.leave_requests;
CREATE POLICY "leave_requests_write_policy" ON public.leave_requests FOR ALL TO authenticated USING (user_id = auth.uid() OR is_admin_or_super_admin());

-- public.lab_orders
DROP POLICY IF EXISTS "lab_orders_select_policy" ON public.lab_orders;
CREATE POLICY "lab_orders_select_policy" ON public.lab_orders FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "lab_orders_write_policy" ON public.lab_orders;
CREATE POLICY "lab_orders_write_policy" ON public.lab_orders FOR ALL TO authenticated USING (is_admin_or_super_admin() OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = lab_orders.order_id AND (o.store_id = auth_user_store_id() OR auth_user_store_id() IS NULL)));

-- public.audit_logs
DROP POLICY IF EXISTS "audit_logs_admin_only" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_only" ON public.audit_logs FOR ALL TO authenticated USING (is_admin_or_super_admin());