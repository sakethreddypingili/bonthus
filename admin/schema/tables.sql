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
    store_id UUID,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
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

