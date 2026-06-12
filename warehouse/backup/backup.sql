-- TYPES

-- TABLES

-- =========================================================================
-- OPTICAL RETAIL SUITE - ATTENDANCE SYSTEM SCHEMA AND PERMISSIONS FIX
-- =========================================================================


-- -------------------------------------------------------------------------
-- TABLE 1: stores
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    gst_no TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- TABLE 2: users
-- -------------------------------------------------------------------------
-- NOTE: In a standard Supabase setup, the 'id' of custom user tables often 
-- references Supabase's internal 'auth.users' table. 
-- You can modify the 'id' field below to: id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('admin', 'optometrist', 'sales', 'manager')),
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    must_reset_password BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- TABLE 3: user_settings
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    sms_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    low_stock_alerts BOOLEAN NOT NULL DEFAULT TRUE,
    theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light', 'dark')),
    compact_layout BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- TABLE 4: customers
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT UNIQUE NOT NULL,
    email TEXT,
    street TEXT,
    town TEXT,
    district TEXT,
    state TEXT,
    postal_code TEXT,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- TABLE 5: prescriptions
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    optometrist_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    -- Distance Vision (Right/Left Eye parameters)
    dv_re_sph TEXT,
    dv_re_cyl TEXT,
    dv_re_axis TEXT,
    dv_le_sph TEXT,
    dv_le_cyl TEXT,
    dv_le_axis TEXT,
    
    -- Near Vision (Right/Left Eye parameters)
    nv_re_sph TEXT,
    nv_re_cyl TEXT,
    nv_re_axis TEXT,
    nv_le_sph TEXT,
    nv_le_cyl TEXT,
    nv_le_axis TEXT,

    -- Additional Clinical Measurements
    pd_distance NUMERIC(5,2), -- Distance Pupillary Distance (mm)
    pd_near NUMERIC(5,2),     -- Near Pupillary Distance (mm)
    prism_re TEXT,            -- Right Eye Prism correction
    prism_le TEXT,            -- Left Eye Prism correction
    
    is_bifocal_progressive BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    prescribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- TABLE 5.5: product_categories
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sgst NUMERIC(5,2) DEFAULT 0.00,
    cgst NUMERIC(5,2) DEFAULT 0.00,
    igst NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- TABLE 6: products
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT UNIQUE NOT NULL,
    upc TEXT UNIQUE,
    name TEXT NOT NULL,
    brand TEXT,
    category_id UUID REFERENCES product_categories(id) ON DELETE SET NULL,
    description TEXT,
    base_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- TABLE 7: store_inventory
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS store_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    unit_price NUMERIC(12,2), -- NULL overrides point back to catalog base_price
    low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
    
    -- Prevent duplicate product mappings within the same physical branch
    CONSTRAINT uq_store_product UNIQUE (store_id, product_id)
);

-- -------------------------------------------------------------------------
-- TABLE 8: orders
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    prescription_id UUID REFERENCES prescriptions(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'ready', 'delivered', 'cancelled')),
    
    -- Calculations
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0.00),
    tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0.00),
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0.00),
    net_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (net_amount >= 0.00),
    due_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'fully_paid')),
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- TABLE 9: order_items
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price NUMERIC(12,2) NOT NULL CHECK (unit_price >= 0.00),
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0.00),
    total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0.00),
    custom_lens_specs JSONB -- Flexible dynamic specs (coatings, tints, index material, etc.)
);

-- -------------------------------------------------------------------------
-- TABLE 10: payments
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL CHECK (amount > 0.00),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card', 'digital_wallet', 'bank_transfer')),
    transaction_ref TEXT,
    status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- TABLE 11: schedules
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    scheduled_date DATE NOT NULL,
    scheduled_time TEXT,
    assigned_to_id UUID REFERENCES users(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('eye_test', 'follow_up', 'staff_meeting', 'task')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- TABLE 12: notifications
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    type TEXT NOT NULL CHECK (type IN ('order_status', 'stock_alert', 'customer_followup', 'system')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------------------
-- TABLE 13: attendance
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'absent', 'leave')),
    check_in TIMESTAMPTZ,
    check_out TIMESTAMPTZ,
    UNIQUE(user_id, attendance_date)
);

-- -------------------------------------------------------------------------
-- TABLE 14: attendance_qr_codes
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_qr_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    store_id UUID REFERENCES stores(id) ON DELETE CASCADE,
    qr_type TEXT NOT NULL CHECK (qr_type IN ('check_in', 'check_out')),
    valid_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Align orders table with app expectations (soft-disable flag)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS disabled BOOLEAN NOT NULL DEFAULT false;

-- Final schema fix for attendance_qr_codes
-- Ensures all columns used by the application exist and are correctly named

DO $$ 
BEGIN 
    -- 1. Rename 'code' to 'qr_code_token' if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_qr_codes' AND column_name='code') THEN
        ALTER TABLE public.attendance_qr_codes RENAME COLUMN code TO qr_code_token;
    END IF;

    -- 2. Add qr_code_token if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_qr_codes' AND column_name='qr_code_token') THEN
        ALTER TABLE public.attendance_qr_codes ADD COLUMN qr_code_token TEXT UNIQUE NOT NULL;
    END IF;

    -- 3. Add qr_type if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_qr_codes' AND column_name='qr_type') THEN
        ALTER TABLE public.attendance_qr_codes ADD COLUMN qr_type TEXT NOT NULL DEFAULT 'check_in' CHECK (qr_type IN ('check_in', 'check_out'));
    END IF;

    -- 4. Add valid_date if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='attendance_qr_codes' AND column_name='valid_date') THEN
        ALTER TABLE public.attendance_qr_codes ADD COLUMN valid_date DATE NOT NULL DEFAULT CURRENT_DATE;
    END IF;

END $$;

-- OTHER / PATCHES

-- 6. Grant Permissions (Essential for 'code column not found' cache error)
GRANT ALL ON TABLE public.attendance TO authenticated;

GRANT ALL ON TABLE public.attendance_qr_codes TO authenticated;

GRANT ALL ON TABLE public.attendance TO service_role;

GRANT ALL ON TABLE public.attendance_qr_codes TO service_role;

-- 7. Force Schema Reload
NOTIFY pgrst, 'reload schema';

-- 2. Notify PostgREST to reload the schema
NOTIFY pgrst, 'reload schema';

-- 3. Grant proper permissions just in case
GRANT SELECT, INSERT, UPDATE ON public.attendance_qr_codes TO authenticated;

GRANT SELECT, INSERT, UPDATE ON public.attendance_qr_codes TO anon;

GRANT SELECT, INSERT, UPDATE ON public.attendance_qr_codes TO service_role;

-- =========================================================================
-- OPTICAL RETAIL SUITE - SUPABASE POSTGRESQL SCHEMA INITIALIZATION
-- =========================================================================

-- Enable UUID extension (typically enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

NOTIFY pgrst, 'reload schema';

-- Force refresh PostgREST cache
NOTIFY pgrst, 'reload schema';

-- Verify permissions
GRANT ALL ON TABLE public.attendance_qr_codes TO authenticated;

GRANT ALL ON TABLE public.attendance_qr_codes TO anon;

-- Grant PostgREST roles access to public schema (required for Supabase API / JS client)
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO postgres, anon, authenticated, service_role;

-- Create the trigger on auth.users (runs after insert/updates on the auth schema)
DROP TRIGGER IF EXISTS tr_auth_user_link ON auth.users;

GRANT EXECUTE ON FUNCTION public.auth_user_store_id() TO authenticated, anon;

GRANT EXECUTE ON FUNCTION public.auth_user_role() TO authenticated, anon;

GRANT EXECUTE ON FUNCTION public.is_admin_or_super_admin() TO authenticated, anon;-- CONSTRAINTS

-- STORAGE

-- VIEWS

-- FUNCTIONS

-- -------------------------------------------------------------------------
-- TRIGGER FUNCTION: Automatic updated_at timestamp updating
-- -------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Trigger function to automatically link auth.users to public.users by email
CREATE OR REPLACE FUNCTION public.handle_auth_user_link()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET id = NEW.id
  WHERE email = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fix infinite recursion: policies must not SELECT from users under users RLS.
-- Use SECURITY DEFINER helpers instead.

CREATE OR REPLACE FUNCTION public.auth_user_store_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT store_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auth_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$$;-- TRIGGERS

-- Apply updated_at trigger to user_settings
DROP TRIGGER IF EXISTS set_timestamp_user_settings ON user_settings;
CREATE TRIGGER set_timestamp_user_settings
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Apply updated_at trigger to orders
DROP TRIGGER IF EXISTS set_timestamp_orders ON orders;
CREATE TRIGGER set_timestamp_orders
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Apply trigger to auth.users
DROP TRIGGER IF EXISTS tr_auth_user_link ON auth.users;
CREATE TRIGGER tr_auth_user_link
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_link();-- POLICIES

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
CREATE POLICY "Public invoice read products" ON public.products FOR SELECT TO anon USING (EXISTS (SELECT 1 FROM public.order_items oi JOIN public.orders o ON o.id = oi.order_id WHERE oi.product_id = products.id AND o.order_number IS NOT NULL));-- INDEXES

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

CREATE INDEX IF NOT EXISTS idx_orders_disabled ON orders(disabled) WHERE disabled = false;-- SEEDS

