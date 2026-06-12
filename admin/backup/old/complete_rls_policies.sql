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

-- -------------------------------------------------------------------------
-- 1. STORES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "stores_select" ON public.stores;
CREATE POLICY "stores_select" ON public.stores FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "stores_admin_all" ON public.stores;
CREATE POLICY "stores_admin_all" ON public.stores FOR ALL TO authenticated 
USING (is_admin_or_super_admin()) WITH CHECK (is_admin_or_super_admin());

-- -------------------------------------------------------------------------
-- 2. USERS (Profile Data)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated 
USING (id = auth.uid() OR is_admin_or_super_admin() OR (auth_user_store_id() IS NOT NULL AND store_id = auth_user_store_id()));

DROP POLICY IF EXISTS "users_admin_all" ON public.users;
CREATE POLICY "users_admin_all" ON public.users FOR ALL TO authenticated 
USING (is_admin_or_super_admin()) WITH CHECK (is_admin_or_super_admin());

-- -------------------------------------------------------------------------
-- 3. USER SETTINGS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_settings_self" ON public.user_settings;
CREATE POLICY "user_settings_self" ON public.user_settings FOR ALL TO authenticated 
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- -------------------------------------------------------------------------
-- 4. CUSTOMERS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "customers_store_access" ON public.customers;
CREATE POLICY "customers_store_access" ON public.customers FOR ALL TO authenticated 
USING (is_admin_or_super_admin() OR store_id = auth_user_store_id())
WITH CHECK (is_admin_or_super_admin() OR store_id = auth_user_store_id());

-- -------------------------------------------------------------------------
-- 5. PRESCRIPTIONS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "prescriptions_store_access" ON public.prescriptions;
CREATE POLICY "prescriptions_store_access" ON public.prescriptions FOR ALL TO authenticated 
USING (is_admin_or_super_admin() OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.store_id = auth_user_store_id()))
WITH CHECK (is_admin_or_super_admin() OR EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.store_id = auth_user_store_id()));

-- -------------------------------------------------------------------------
-- 6. PRODUCTS & CATEGORIES (Catalog)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "products_admin_all" ON public.products;
CREATE POLICY "products_admin_all" ON public.products FOR ALL TO authenticated 
USING (is_admin_or_super_admin()) WITH CHECK (is_admin_or_super_admin());

DROP POLICY IF EXISTS "categories_select" ON public.categories;
CREATE POLICY "categories_select" ON public.categories FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
CREATE POLICY "categories_admin_all" ON public.categories FOR ALL TO authenticated 
USING (is_admin_or_super_admin()) WITH CHECK (is_admin_or_super_admin());

-- -------------------------------------------------------------------------
-- 7. STORE INVENTORY
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "inventory_select" ON public.store_inventory;
CREATE POLICY "inventory_select" ON public.store_inventory FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "inventory_all" ON public.store_inventory;
CREATE POLICY "inventory_all" ON public.store_inventory FOR ALL TO authenticated 
USING (is_admin_or_super_admin() OR store_id = auth_user_store_id())
WITH CHECK (is_admin_or_super_admin() OR store_id = auth_user_store_id());

-- -------------------------------------------------------------------------
-- 8. ORDERS & ITEMS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "orders_store_access" ON public.orders;
CREATE POLICY "orders_store_access" ON public.orders FOR ALL TO authenticated 
USING (is_admin_or_super_admin() OR store_id = auth_user_store_id())
WITH CHECK (is_admin_or_super_admin() OR store_id = auth_user_store_id());

DROP POLICY IF EXISTS "order_items_access" ON public.order_items;
CREATE POLICY "order_items_access" ON public.order_items FOR ALL TO authenticated 
USING (is_admin_or_super_admin() OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.store_id = auth_user_store_id()))
WITH CHECK (is_admin_or_super_admin() OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.store_id = auth_user_store_id()));

-- -------------------------------------------------------------------------
-- 9. PAYMENTS
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "payments_access" ON public.payments;
CREATE POLICY "payments_access" ON public.payments FOR ALL TO authenticated 
USING (is_admin_or_super_admin() OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.store_id = auth_user_store_id()))
WITH CHECK (is_admin_or_super_admin() OR EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.store_id = auth_user_store_id()));

-- -------------------------------------------------------------------------
-- 10. VENDORS (Fixed the issue reported)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "vendors_select" ON public.vendors;
CREATE POLICY "vendors_select" ON public.vendors FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "vendors_admin_all" ON public.vendors;
CREATE POLICY "vendors_admin_all" ON public.vendors FOR ALL TO authenticated 
USING (is_admin_or_super_admin()) WITH CHECK (is_admin_or_super_admin());

-- -------------------------------------------------------------------------
-- 11. SHIPMENTS & REQUISITIONS (Logistics)
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "requisitions_access" ON public.store_requisitions;
CREATE POLICY "requisitions_access" ON public.store_requisitions FOR ALL TO authenticated 
USING (is_admin_or_super_admin() OR from_store_id = auth_user_store_id() OR to_store_id = auth_user_store_id())
WITH CHECK (is_admin_or_super_admin() OR from_store_id = auth_user_store_id() OR to_store_id = auth_user_store_id());

DROP POLICY IF EXISTS "requisition_items_access" ON public.store_requisition_items;
CREATE POLICY "requisition_items_access" ON public.store_requisition_items FOR ALL TO authenticated 
USING (is_admin_or_super_admin() OR EXISTS (SELECT 1 FROM public.store_requisitions r WHERE r.id = requisition_id AND (r.from_store_id = auth_user_store_id() OR r.to_store_id = auth_user_store_id())))
WITH CHECK (is_admin_or_super_admin() OR EXISTS (SELECT 1 FROM public.store_requisitions r WHERE r.id = requisition_id AND (r.from_store_id = auth_user_store_id() OR r.to_store_id = auth_user_store_id())));

DROP POLICY IF EXISTS "shipments_access" ON public.shipments;
CREATE POLICY "shipments_access" ON public.shipments FOR ALL TO authenticated 
USING (is_admin_or_super_admin() OR origin_store_id = auth_user_store_id() OR destination_store_id = auth_user_store_id())
WITH CHECK (is_admin_or_super_admin() OR origin_store_id = auth_user_store_id() OR destination_store_id = auth_user_store_id());

DROP POLICY IF EXISTS "shipment_items_access" ON public.shipment_items;
CREATE POLICY "shipment_items_access" ON public.shipment_items FOR ALL TO authenticated 
USING (is_admin_or_super_admin() OR EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND (s.origin_store_id = auth_user_store_id() OR s.destination_store_id = auth_user_store_id())))
WITH CHECK (is_admin_or_super_admin() OR EXISTS (SELECT 1 FROM public.shipments s WHERE s.id = shipment_id AND (s.origin_store_id = auth_user_store_id() OR s.destination_store_id = auth_user_store_id())));

-- -------------------------------------------------------------------------
-- 12. BARCODES
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "barcodes_select" ON public.product_barcodes;
CREATE POLICY "barcodes_select" ON public.product_barcodes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "barcodes_admin_all" ON public.product_barcodes;
CREATE POLICY "barcodes_admin_all" ON public.product_barcodes FOR ALL TO authenticated 
USING (is_admin_or_super_admin()) WITH CHECK (is_admin_or_super_admin());

-- -------------------------------------------------------------------------
-- 13. NOTIFICATIONS & ATTENDANCE
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_self" ON public.notifications;
CREATE POLICY "notifications_self" ON public.notifications FOR ALL TO authenticated 
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "attendance_access" ON public.attendance;
CREATE POLICY "attendance_access" ON public.attendance FOR ALL TO authenticated 
USING (is_admin_or_super_admin() OR user_id = auth.uid() OR (role IN ('manager', 'store_manager') AND EXISTS (SELECT 1 FROM public.users u WHERE u.id = user_id AND u.store_id = auth_user_store_id())))
WITH CHECK (is_admin_or_super_admin() OR user_id = auth.uid());

NOTIFY pgrst, 'reload schema';
