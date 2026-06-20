BEGIN;

-- =========================================================================
-- 1. ENABLE ROW LEVEL SECURITY ON NEW & EXISTING LEDGER TABLES
-- =========================================================================
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

-- =========================================================================
-- 2. CREATE SECURITY RULES FOR INFRASTRUCTURE & CUSTOMER GROUPS
-- =========================================================================

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
-- Note: dependents does not have store_id. RLS is resolved by checking if the user is authenticated.
DROP POLICY IF EXISTS "dependents_select_policy" ON public.dependents;
CREATE POLICY "dependents_select_policy" ON public.dependents FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "dependents_write_policy" ON public.dependents;
CREATE POLICY "dependents_write_policy" ON public.dependents FOR ALL TO authenticated USING (true);

-- =========================================================================
-- 3. CREATE SECURITY RULES FOR PRODUCT CATALOG & LEDGER TABLES
-- =========================================================================

-- public.product_variants
DROP POLICY IF EXISTS "product_variants_select_policy" ON public.product_variants;
CREATE POLICY "product_variants_select_policy" ON public.product_variants FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "product_variants_admin_policy" ON public.product_variants;
CREATE POLICY "product_variants_admin_policy" ON public.product_variants FOR ALL TO authenticated USING (is_admin_or_super_admin());

-- public.invoices
DROP POLICY IF EXISTS "invoices_select_policy" ON public.invoices;
CREATE POLICY "invoices_select_policy" ON public.invoices FOR SELECT TO authenticated USING (
    is_admin_or_super_admin() OR 
    store_id = auth_user_store_id()
);

DROP POLICY IF EXISTS "invoices_write_policy" ON public.invoices;
CREATE POLICY "invoices_write_policy" ON public.invoices FOR ALL TO authenticated USING (
    is_admin_or_super_admin() OR 
    store_id = auth_user_store_id()
);

-- public.invoice_items
DROP POLICY IF EXISTS "invoice_items_select_policy" ON public.invoice_items;
CREATE POLICY "invoice_items_select_policy" ON public.invoice_items FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.invoices i 
        WHERE i.id = invoice_items.invoice_id 
        AND (i.store_id = auth_user_store_id() OR is_admin_or_super_admin())
    )
);

DROP POLICY IF EXISTS "invoice_items_write_policy" ON public.invoice_items;
CREATE POLICY "invoice_items_write_policy" ON public.invoice_items FOR ALL TO authenticated USING (
    EXISTS (
        SELECT 1 FROM public.invoices i 
        WHERE i.id = invoice_items.invoice_id 
        AND (i.store_id = auth_user_store_id() OR is_admin_or_super_admin())
    )
);

-- public.stock_movements
DROP POLICY IF EXISTS "stock_movements_select_policy" ON public.stock_movements;
CREATE POLICY "stock_movements_select_policy" ON public.stock_movements FOR SELECT TO authenticated USING (
    is_admin_or_super_admin() OR 
    store_id = auth_user_store_id()
);

DROP POLICY IF EXISTS "stock_movements_write_policy" ON public.stock_movements;
CREATE POLICY "stock_movements_write_policy" ON public.stock_movements FOR ALL TO authenticated USING (
    is_admin_or_super_admin() OR 
    store_id = auth_user_store_id()
);

-- public.payroll_history
DROP POLICY IF EXISTS "payroll_history_select_policy" ON public.payroll_history;
CREATE POLICY "payroll_history_select_policy" ON public.payroll_history FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR 
    is_admin_or_super_admin()
);

DROP POLICY IF EXISTS "payroll_history_admin_policy" ON public.payroll_history;
CREATE POLICY "payroll_history_admin_policy" ON public.payroll_history FOR ALL TO authenticated USING (is_admin_or_super_admin());

-- public.leave_requests
DROP POLICY IF EXISTS "leave_requests_select_policy" ON public.leave_requests;
CREATE POLICY "leave_requests_select_policy" ON public.leave_requests FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR 
    is_admin_or_super_admin()
);

DROP POLICY IF EXISTS "leave_requests_write_policy" ON public.leave_requests;
CREATE POLICY "leave_requests_write_policy" ON public.leave_requests FOR ALL TO authenticated USING (
    user_id = auth.uid() OR 
    is_admin_or_super_admin()
);

-- public.lab_orders
DROP POLICY IF EXISTS "lab_orders_select_policy" ON public.lab_orders;
CREATE POLICY "lab_orders_select_policy" ON public.lab_orders FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "lab_orders_write_policy" ON public.lab_orders;
CREATE POLICY "lab_orders_write_policy" ON public.lab_orders FOR ALL TO authenticated USING (
    is_admin_or_super_admin() OR 
    EXISTS (
        SELECT 1 FROM public.orders o 
        WHERE o.id = lab_orders.order_id 
        AND (o.store_id = auth_user_store_id() OR auth_user_store_id() IS NULL)
    )
);

-- public.audit_logs
DROP POLICY IF EXISTS "audit_logs_admin_only" ON public.audit_logs;
CREATE POLICY "audit_logs_admin_only" ON public.audit_logs FOR ALL TO authenticated USING (is_admin_or_super_admin());

-- =========================================================================
-- 4. ANONYMOUS PASS-THROUGH READ RIGHTS FOR BILLING OVERLAYS
-- =========================================================================
DROP POLICY IF EXISTS "Public invoice read invoices" ON public.invoices;
CREATE POLICY "Public invoice read invoices" ON public.invoices FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public invoice read invoice items" ON public.invoice_items;
CREATE POLICY "Public invoice read invoice items" ON public.invoice_items FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Public invoice read dependents" ON public.dependents;
CREATE POLICY "Public invoice read dependents" ON public.dependents FOR SELECT TO anon USING (true);

COMMIT;
