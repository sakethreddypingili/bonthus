-- TABLES FETCHED FROM LIVE DATABASE

-- -------------------------------------------------------------------------
-- Table: attendance
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    store_id UUID NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    clock_out TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'present'::text,
    latitude NUMERIC,
    longitude NUMERIC,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: attendance_qr_codes
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance_qr_codes (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    qr_code_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    qr_type TEXT NOT NULL DEFAULT 'check_in'::text,
    valid_date DATE NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: categories
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: brands
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brands (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT brands_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: family
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.family (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    family_code text NOT NULL UNIQUE,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT family_pkey PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: customers
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    street TEXT,
    town TEXT,
    district TEXT,
    state TEXT,
    postal_code TEXT,
    store_id UUID,
    family_id uuid REFERENCES public.family(id) ON DELETE SET NULL,
    parent_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    relationship TEXT,
    age INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: notifications
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: order_items
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC NOT NULL,
    discount_amount NUMERIC NOT NULL DEFAULT 0.00,
    total_price NUMERIC NOT NULL,
    custom_lens_specs JSONB,
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: orders
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL,
    customer_id UUID NOT NULL,
    store_id UUID NOT NULL,
    prescription_id UUID,
    status TEXT NOT NULL DEFAULT 'pending'::text,
    subtotal NUMERIC NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC NOT NULL DEFAULT 0.00,
    net_amount NUMERIC NOT NULL DEFAULT 0.00,
    due_amount NUMERIC NOT NULL DEFAULT 0.00,
    payment_status TEXT NOT NULL DEFAULT 'unpaid'::text,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    disabled BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: payments
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL,
    amount NUMERIC NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_ref TEXT,
    status TEXT NOT NULL DEFAULT 'completed'::text,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: prescriptions
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.prescriptions (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    optometrist_id UUID,
    dv_re_sph TEXT,
    dv_re_cyl TEXT,
    dv_re_axis TEXT,
    dv_le_sph TEXT,
    dv_le_cyl TEXT,
    dv_le_axis TEXT,
    nv_re_sph TEXT,
    nv_re_cyl TEXT,
    nv_re_axis TEXT,
    nv_le_sph TEXT,
    nv_le_cyl TEXT,
    nv_le_axis TEXT,
    pd_distance NUMERIC,
    pd_near NUMERIC,
    pd_re NUMERIC,
    pd_le NUMERIC,
    prism_re TEXT,
    prism_le TEXT,
    is_bifocal_progressive BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    prescribed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: product_barcodes
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_barcodes (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    barcode TEXT NOT NULL,
    product_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'::text,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: product_categories
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sgst NUMERIC DEFAULT 0.00,
    cgst NUMERIC DEFAULT 0.00,
    igst NUMERIC DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: products
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL,
    upc TEXT,
    name TEXT NOT NULL,
    brand TEXT,
    brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
    description TEXT,
    base_price NUMERIC NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    category_id UUID,
    vendor_id UUID,
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: schedules
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    scheduled_date DATE NOT NULL,
    scheduled_time TEXT,
    assigned_to_id UUID,
    type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'::text,
    store_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: shipment_items
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipment_items (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    shipment_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: shipments
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shipments (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    tracking_number TEXT NOT NULL,
    carrier TEXT,
    status TEXT NOT NULL DEFAULT 'in_transit'::text,
    origin_store_id UUID,
    destination_store_id UUID,
    vendor_id UUID,
    requisition_id UUID,
    estimated_delivery DATE,
    shipped_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: store_inventory
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_inventory (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    store_id UUID NOT NULL,
    product_id UUID NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC,
    low_stock_threshold INTEGER NOT NULL DEFAULT 5,
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: store_requisition_items
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_requisition_items (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    requisition_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL,
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: store_requisitions
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_requisitions (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    request_number TEXT NOT NULL,
    from_store_id UUID NOT NULL,
    to_store_id UUID,
    requested_by_id UUID NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending'::text,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: stores
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.stores (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    gst_no TEXT NOT NULL,
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: labs
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.labs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- Table: user_settings
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_settings (
    user_id UUID NOT NULL,
    email_notifications BOOLEAN NOT NULL DEFAULT true,
    sms_notifications BOOLEAN NOT NULL DEFAULT false,
    low_stock_alerts BOOLEAN NOT NULL DEFAULT true,
    theme TEXT NOT NULL DEFAULT 'light'::text,
    compact_layout BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id)
);

-- -------------------------------------------------------------------------
-- Table: users
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT,
    operation_type TEXT,
    store_id UUID,
    lab_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    personal_email TEXT,
    phone TEXT,
    address TEXT,
    emergency_contact TEXT,
    designation TEXT,
    joined_at DATE DEFAULT CURRENT_DATE,
    must_reset_password BOOLEAN DEFAULT true,
    current_address TEXT,
    permanent_address TEXT,
    aadhaar_no TEXT,
    bank_name TEXT,
    account_no TEXT,
    ifsc_code TEXT,
    micr_code TEXT,
    pf_uan_no TEXT,
    esi_no TEXT,
    ctc NUMERIC,
    take_home NUMERIC,
    emp_id TEXT UNIQUE,
    PRIMARY KEY (id)
);


-- -------------------------------------------------------------------------
-- Table: vendors
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_name TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- -------------------------------------------------------------------------
-- New tables from live database
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

