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
-- TABLE 1.1: brands
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brands (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT brands_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- TABLE 1.2: family
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.family (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    family_code text NOT NULL UNIQUE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT family_pkey PRIMARY KEY (id)
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
    phone TEXT NOT NULL,
    email TEXT,
    street TEXT,
    town TEXT,
    district TEXT,
    state TEXT,
    postal_code TEXT,
    store_id UUID REFERENCES stores(id) ON DELETE SET NULL,
    family_id UUID REFERENCES family(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    relationship TEXT,
    age INTEGER,
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
-- TABLE 5.6: categories (Primary category table used in app)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
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
    brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
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

-- -------------------------------------------------------------------------
-- New Tables from live database
-- -------------------------------------------------------------------------



CREATE TABLE IF NOT EXISTS public.product_variants (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku text NOT NULL UNIQUE,
    size_attribute text,
    color_attribute text,
    additional_cost numeric DEFAULT 0.00,
    stock_quantity integer DEFAULT 0 CHECK (stock_quantity >= 0),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT product_variants_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.invoices (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_number text NOT NULL UNIQUE,
    order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
    customer_id uuid REFERENCES public.customers(id) ON DELETE RESTRICT,
    store_id uuid REFERENCES public.stores(id) ON DELETE RESTRICT,
    tax_amount numeric NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0.00),
    discount_amount numeric NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0.00),
    net_amount numeric NOT NULL DEFAULT 0.00 CHECK (net_amount >= 0.00),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT invoices_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.invoice_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id uuid REFERENCES public.products(id) ON DELETE RESTRICT,
    quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price numeric NOT NULL CHECK (unit_price >= 0.00),
    sgst numeric DEFAULT 0.00,
    cgst numeric DEFAULT 0.00,
    igst numeric DEFAULT 0.00,
    total_price numeric NOT NULL CHECK (total_price >= 0.00),
    CONSTRAINT invoice_items_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
    store_id uuid NOT NULL REFERENCES public.stores(id) ON DELETE RESTRICT,
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    quantity integer NOT NULL,
    movement_type text CHECK (movement_type = ANY (ARRAY['purchase'::text, 'sales_deduction'::text, 'adjustment'::text, 'requisition_transfer'::text])),
    notes text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT stock_movements_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.lab_orders (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    lab_id uuid NOT NULL REFERENCES public.labs(id) ON DELETE RESTRICT,
    status text DEFAULT 'sent_to_lab'::text CHECK (status = ANY (ARRAY['sent_to_lab'::text, 'processing'::text, 'completed'::text, 'cancelled'::text])),
    sent_at timestamp with time zone DEFAULT now(),
    completed_at timestamp with time zone,
    notes text,
    CONSTRAINT lab_orders_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.payroll_history (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    basic_salary numeric NOT NULL CHECK (basic_salary >= 0.00),
    allowances numeric DEFAULT 0.00 CHECK (allowances >= 0.00),
    deductions numeric DEFAULT 0.00 CHECK (deductions >= 0.00),
    net_disbursed numeric NOT NULL CHECK (net_disbursed >= 0.00),
    payment_date date NOT NULL DEFAULT CURRENT_DATE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT payroll_history_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    start_date date NOT NULL,
    end_date date NOT NULL,
    leave_type text CHECK (leave_type = ANY (ARRAY['sick'::text, 'casual'::text, 'annual'::text, 'unpaid'::text])),
    status text DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT leave_requests_pkey PRIMARY KEY (id),
    CONSTRAINT check_dates CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
    action text NOT NULL CHECK (action = ANY (ARRAY['INSERT'::text, 'UPDATE'::text, 'DELETE'::text])),
    target_table text NOT NULL,
    record_id uuid NOT NULL,
    old_data jsonb,
    new_data jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT audit_logs_pkey PRIMARY KEY (id)
);

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

GRANT EXECUTE ON FUNCTION public.is_admin_or_super_admin() TO authenticated, anon;