-- TYPES FETCHED FROM LIVE DATABASE

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

-- CONSTRAINTS FETCHED FROM LIVE DATABASE

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS "users_email_key";
ALTER TABLE public.users ADD CONSTRAINT "users_email_key" UNIQUE (email);

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS "users_store_id_fkey";
ALTER TABLE public.users ADD CONSTRAINT "users_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;

ALTER TABLE public.user_settings DROP CONSTRAINT IF EXISTS "user_settings_theme_check";
ALTER TABLE public.user_settings ADD CONSTRAINT "user_settings_theme_check" CHECK ((theme = ANY (ARRAY['light'::text, 'dark'::text])));

ALTER TABLE public.user_settings DROP CONSTRAINT IF EXISTS "user_settings_user_id_fkey";
ALTER TABLE public.user_settings ADD CONSTRAINT "user_settings_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS "customers_phone_key";
ALTER TABLE public.customers ADD CONSTRAINT "customers_phone_key" UNIQUE (phone);

ALTER TABLE public.customers DROP CONSTRAINT IF EXISTS "customers_store_id_fkey";
ALTER TABLE public.customers ADD CONSTRAINT "customers_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;

ALTER TABLE public.prescriptions DROP CONSTRAINT IF EXISTS "prescriptions_customer_id_fkey";
ALTER TABLE public.prescriptions ADD CONSTRAINT "prescriptions_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;

ALTER TABLE public.prescriptions DROP CONSTRAINT IF EXISTS "prescriptions_optometrist_id_fkey";
ALTER TABLE public.prescriptions ADD CONSTRAINT "prescriptions_optometrist_id_fkey" FOREIGN KEY (optometrist_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS "products_sku_key";
ALTER TABLE public.products ADD CONSTRAINT "products_sku_key" UNIQUE (sku);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS "products_upc_key";
ALTER TABLE public.products ADD CONSTRAINT "products_upc_key" UNIQUE (upc);

ALTER TABLE public.store_inventory DROP CONSTRAINT IF EXISTS "store_inventory_stock_quantity_check";
ALTER TABLE public.store_inventory ADD CONSTRAINT "store_inventory_stock_quantity_check" CHECK ((stock_quantity >= 0));

ALTER TABLE public.store_inventory DROP CONSTRAINT IF EXISTS "store_inventory_low_stock_threshold_check";
ALTER TABLE public.store_inventory ADD CONSTRAINT "store_inventory_low_stock_threshold_check" CHECK ((low_stock_threshold >= 0));

ALTER TABLE public.store_inventory DROP CONSTRAINT IF EXISTS "uq_store_product";
ALTER TABLE public.store_inventory ADD CONSTRAINT "uq_store_product" UNIQUE (store_id, product_id);

ALTER TABLE public.store_inventory DROP CONSTRAINT IF EXISTS "store_inventory_store_id_fkey";
ALTER TABLE public.store_inventory ADD CONSTRAINT "store_inventory_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE public.store_inventory DROP CONSTRAINT IF EXISTS "store_inventory_product_id_fkey";
ALTER TABLE public.store_inventory ADD CONSTRAINT "store_inventory_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_status_check";
ALTER TABLE public.orders ADD CONSTRAINT "orders_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'ready'::text, 'delivered'::text, 'cancelled'::text])));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_subtotal_check";
ALTER TABLE public.orders ADD CONSTRAINT "orders_subtotal_check" CHECK ((subtotal >= 0.00));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_tax_amount_check";
ALTER TABLE public.orders ADD CONSTRAINT "orders_tax_amount_check" CHECK ((tax_amount >= 0.00));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_discount_amount_check";
ALTER TABLE public.orders ADD CONSTRAINT "orders_discount_amount_check" CHECK ((discount_amount >= 0.00));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_net_amount_check";
ALTER TABLE public.orders ADD CONSTRAINT "orders_net_amount_check" CHECK ((net_amount >= 0.00));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_payment_status_check";
ALTER TABLE public.orders ADD CONSTRAINT "orders_payment_status_check" CHECK ((payment_status = ANY (ARRAY['unpaid'::text, 'partially_paid'::text, 'fully_paid'::text])));

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_order_number_key";
ALTER TABLE public.orders ADD CONSTRAINT "orders_order_number_key" UNIQUE (order_number);

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_customer_id_fkey";
ALTER TABLE public.orders ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_store_id_fkey";
ALTER TABLE public.orders ADD CONSTRAINT "orders_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE RESTRICT;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS "orders_prescription_id_fkey";
ALTER TABLE public.orders ADD CONSTRAINT "orders_prescription_id_fkey" FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE SET NULL;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS "order_items_quantity_check";
ALTER TABLE public.order_items ADD CONSTRAINT "order_items_quantity_check" CHECK ((quantity > 0));

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS "order_items_unit_price_check";
ALTER TABLE public.order_items ADD CONSTRAINT "order_items_unit_price_check" CHECK ((unit_price >= 0.00));

ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS "schedules_assigned_to_id_fkey";
ALTER TABLE public.schedules ADD CONSTRAINT "schedules_assigned_to_id_fkey" FOREIGN KEY (assigned_to_id) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS "order_items_discount_amount_check";
ALTER TABLE public.order_items ADD CONSTRAINT "order_items_discount_amount_check" CHECK ((discount_amount >= 0.00));

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS "order_items_total_price_check";
ALTER TABLE public.order_items ADD CONSTRAINT "order_items_total_price_check" CHECK ((total_price >= 0.00));

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS "order_items_order_id_fkey";
ALTER TABLE public.order_items ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE public.order_items DROP CONSTRAINT IF EXISTS "order_items_product_id_fkey";
ALTER TABLE public.order_items ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT;

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS "payments_amount_check";
ALTER TABLE public.payments ADD CONSTRAINT "payments_amount_check" CHECK ((amount > 0.00));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS "payments_payment_method_check";
ALTER TABLE public.payments ADD CONSTRAINT "payments_payment_method_check" CHECK ((payment_method = ANY (ARRAY['cash'::text, 'card'::text, 'digital_wallet'::text, 'bank_transfer'::text])));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS "payments_status_check";
ALTER TABLE public.payments ADD CONSTRAINT "payments_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'failed'::text, 'refunded'::text])));

ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS "payments_order_id_fkey";
ALTER TABLE public.payments ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS "schedules_type_check";
ALTER TABLE public.schedules ADD CONSTRAINT "schedules_type_check" CHECK ((type = ANY (ARRAY['eye_test'::text, 'follow_up'::text, 'staff_meeting'::text, 'task'::text])));

ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS "schedules_status_check";
ALTER TABLE public.schedules ADD CONSTRAINT "schedules_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text])));

ALTER TABLE public.schedules DROP CONSTRAINT IF EXISTS "schedules_store_id_fkey";
ALTER TABLE public.schedules ADD CONSTRAINT "schedules_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS "notifications_type_check";
ALTER TABLE public.notifications ADD CONSTRAINT "notifications_type_check" CHECK ((type = ANY (ARRAY['order_status'::text, 'stock_alert'::text, 'customer_followup'::text, 'system'::text])));

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS "notifications_user_id_fkey";
ALTER TABLE public.notifications ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS "users_role_check";
ALTER TABLE public.users ADD CONSTRAINT "users_role_check" CHECK ((role = ANY (ARRAY['super_admin'::text, 'admin'::text, 'optometrist'::text, 'sales'::text, 'manager'::text])));

ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS "categories_name_key";
ALTER TABLE public.categories ADD CONSTRAINT "categories_name_key" UNIQUE (name);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS "products_category_id_fkey";
ALTER TABLE public.products ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE public.store_requisitions DROP CONSTRAINT IF EXISTS "store_requisitions_status_check";
ALTER TABLE public.store_requisitions ADD CONSTRAINT "store_requisitions_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'fulfilled'::text, 'cancelled'::text])));

ALTER TABLE public.store_requisitions DROP CONSTRAINT IF EXISTS "store_requisitions_request_number_key";
ALTER TABLE public.store_requisitions ADD CONSTRAINT "store_requisitions_request_number_key" UNIQUE (request_number);

ALTER TABLE public.store_requisitions DROP CONSTRAINT IF EXISTS "requisitions_from_store_fkey";
ALTER TABLE public.store_requisitions ADD CONSTRAINT "requisitions_from_store_fkey" FOREIGN KEY (from_store_id) REFERENCES stores(id);

ALTER TABLE public.store_requisitions DROP CONSTRAINT IF EXISTS "requisitions_to_store_fkey";
ALTER TABLE public.store_requisitions ADD CONSTRAINT "requisitions_to_store_fkey" FOREIGN KEY (to_store_id) REFERENCES stores(id);

ALTER TABLE public.store_requisitions DROP CONSTRAINT IF EXISTS "requisitions_requested_by_fkey";
ALTER TABLE public.store_requisitions ADD CONSTRAINT "requisitions_requested_by_fkey" FOREIGN KEY (requested_by_id) REFERENCES users(id);

ALTER TABLE public.store_requisition_items DROP CONSTRAINT IF EXISTS "store_requisition_items_quantity_check";
ALTER TABLE public.store_requisition_items ADD CONSTRAINT "store_requisition_items_quantity_check" CHECK ((quantity > 0));

ALTER TABLE public.store_requisition_items DROP CONSTRAINT IF EXISTS "req_items_requisition_fkey";
ALTER TABLE public.store_requisition_items ADD CONSTRAINT "req_items_requisition_fkey" FOREIGN KEY (requisition_id) REFERENCES store_requisitions(id) ON DELETE CASCADE;

ALTER TABLE public.store_requisition_items DROP CONSTRAINT IF EXISTS "req_items_product_fkey";
ALTER TABLE public.store_requisition_items ADD CONSTRAINT "req_items_product_fkey" FOREIGN KEY (product_id) REFERENCES products(id);

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS "shipments_status_check";
ALTER TABLE public.shipments ADD CONSTRAINT "shipments_status_check" CHECK ((status = ANY (ARRAY['preparing'::text, 'in_transit'::text, 'delivered'::text, 'exception'::text])));

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS "shipments_tracking_number_key";
ALTER TABLE public.shipments ADD CONSTRAINT "shipments_tracking_number_key" UNIQUE (tracking_number);

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS "shipments_origin_store_fkey";
ALTER TABLE public.shipments ADD CONSTRAINT "shipments_origin_store_fkey" FOREIGN KEY (origin_store_id) REFERENCES stores(id);

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS "shipments_destination_store_fkey";
ALTER TABLE public.shipments ADD CONSTRAINT "shipments_destination_store_fkey" FOREIGN KEY (destination_store_id) REFERENCES stores(id);

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS "shipments_vendor_fkey";
ALTER TABLE public.shipments ADD CONSTRAINT "shipments_vendor_fkey" FOREIGN KEY (vendor_id) REFERENCES vendors(id);

ALTER TABLE public.shipments DROP CONSTRAINT IF EXISTS "shipments_requisition_fkey";
ALTER TABLE public.shipments ADD CONSTRAINT "shipments_requisition_fkey" FOREIGN KEY (requisition_id) REFERENCES store_requisitions(id);

ALTER TABLE public.shipment_items DROP CONSTRAINT IF EXISTS "shipment_items_quantity_check";
ALTER TABLE public.shipment_items ADD CONSTRAINT "shipment_items_quantity_check" CHECK ((quantity > 0));

ALTER TABLE public.shipment_items DROP CONSTRAINT IF EXISTS "shipment_items_shipment_fkey";
ALTER TABLE public.shipment_items ADD CONSTRAINT "shipment_items_shipment_fkey" FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE;

ALTER TABLE public.shipment_items DROP CONSTRAINT IF EXISTS "shipment_items_product_fkey";
ALTER TABLE public.shipment_items ADD CONSTRAINT "shipment_items_product_fkey" FOREIGN KEY (product_id) REFERENCES products(id);

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS "products_vendor_id_fkey";
ALTER TABLE public.products ADD CONSTRAINT "products_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES vendors(id);

ALTER TABLE public.product_barcodes DROP CONSTRAINT IF EXISTS "product_barcodes_status_check";
ALTER TABLE public.product_barcodes ADD CONSTRAINT "product_barcodes_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text])));

ALTER TABLE public.product_barcodes DROP CONSTRAINT IF EXISTS "product_barcodes_barcode_key";
ALTER TABLE public.product_barcodes ADD CONSTRAINT "product_barcodes_barcode_key" UNIQUE (barcode);

ALTER TABLE public.product_barcodes DROP CONSTRAINT IF EXISTS "product_barcodes_product_id_fkey";
ALTER TABLE public.product_barcodes ADD CONSTRAINT "product_barcodes_product_id_fkey" FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE;

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS "attendance_status_check";
ALTER TABLE public.attendance ADD CONSTRAINT "attendance_status_check" CHECK ((status = ANY (ARRAY['present'::text, 'late'::text, 'half_day'::text, 'absent'::text])));

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS "attendance_user_id_fkey";
ALTER TABLE public.attendance ADD CONSTRAINT "attendance_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id);

ALTER TABLE public.attendance DROP CONSTRAINT IF EXISTS "attendance_store_id_fkey";
ALTER TABLE public.attendance ADD CONSTRAINT "attendance_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id);

ALTER TABLE public.attendance_qr_codes DROP CONSTRAINT IF EXISTS "attendance_qr_codes_qr_code_token_key";
ALTER TABLE public.attendance_qr_codes ADD CONSTRAINT "attendance_qr_codes_qr_code_token_key" UNIQUE (qr_code_token);

ALTER TABLE public.attendance_qr_codes DROP CONSTRAINT IF EXISTS "attendance_qr_codes_store_id_fkey";
ALTER TABLE public.attendance_qr_codes ADD CONSTRAINT "attendance_qr_codes_store_id_fkey" FOREIGN KEY (store_id) REFERENCES stores(id);

ALTER TABLE public.attendance_qr_codes DROP CONSTRAINT IF EXISTS "attendance_qr_codes_qr_type_check";
ALTER TABLE public.attendance_qr_codes ADD CONSTRAINT "attendance_qr_codes_qr_type_check" CHECK ((qr_type = ANY (ARRAY['check_in'::text, 'check_out'::text])));

-- STORAGE BUCKETS FETCHED FROM LIVE DATABASE

-- VIEWS FETCHED FROM LIVE DATABASE

-- FUNCTIONS FETCHED FROM LIVE DATABASE

-- Function: handle_auth_user_link
CREATE OR REPLACE FUNCTION public.handle_auth_user_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.users
  SET id = NEW.id
  WHERE email = NEW.email;
  RETURN NEW;
END;
$function$
;

-- Function: trigger_set_timestamp
CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$
;

-- Function: is_admin_or_super_admin
CREATE OR REPLACE FUNCTION public.is_admin_or_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
  );
$function$
;

-- Function: auth_user_store_id
CREATE OR REPLACE FUNCTION public.auth_user_store_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT store_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$function$
;

-- Function: auth_user_role
CREATE OR REPLACE FUNCTION public.auth_user_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT role FROM public.users WHERE id = auth.uid() LIMIT 1;
$function$
;

-- TRIGGERS FETCHED FROM LIVE DATABASE

-- Trigger: set_timestamp_user_settings on user_settings
DROP TRIGGER IF EXISTS "set_timestamp_user_settings" ON public.user_settings;
CREATE TRIGGER set_timestamp_user_settings BEFORE UPDATE ON public.user_settings FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- Trigger: set_timestamp_orders on orders
DROP TRIGGER IF EXISTS "set_timestamp_orders" ON public.orders;
CREATE TRIGGER set_timestamp_orders BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

-- POLICIES FETCHED FROM LIVE DATABASE

-- 0. ENABLE ROW LEVEL SECURITY
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_requisition_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_barcodes ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- Policies for table: categories
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Allow admin delete" ON public.categories;
CREATE POLICY "Allow admin delete" ON public.categories
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

DROP POLICY IF EXISTS "Allow admin insert" ON public.categories;
CREATE POLICY "Allow admin insert" ON public.categories
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

DROP POLICY IF EXISTS "Allow admin update" ON public.categories;
CREATE POLICY "Allow admin update" ON public.categories
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = auth.uid()) AND (users.role = ANY (ARRAY['admin'::text, 'super_admin'::text]))))));

DROP POLICY IF EXISTS "Allow public select" ON public.categories;
CREATE POLICY "Allow public select" ON public.categories
  FOR SELECT
  TO public
  USING (true);

DROP POLICY IF EXISTS "categories_admin_all" ON public.categories;
CREATE POLICY "categories_admin_all" ON public.categories
  FOR ALL
  TO authenticated
  USING (is_admin_or_super_admin())
  WITH CHECK (is_admin_or_super_admin());

DROP POLICY IF EXISTS "categories_select" ON public.categories;
CREATE POLICY "categories_select" ON public.categories
  FOR SELECT
  TO authenticated
  USING (true);

-- -------------------------------------------------------------------------
-- Policies for table: user_settings
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "user_settings_self" ON public.user_settings;
CREATE POLICY "user_settings_self" ON public.user_settings
  FOR ALL
  TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

-- -------------------------------------------------------------------------
-- Policies for table: store_requisitions
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "requisitions_access" ON public.store_requisitions;
CREATE POLICY "requisitions_access" ON public.store_requisitions
  FOR ALL
  TO authenticated
  USING ((is_admin_or_super_admin() OR (from_store_id = auth_user_store_id()) OR (to_store_id = auth_user_store_id())))
  WITH CHECK ((is_admin_or_super_admin() OR (from_store_id = auth_user_store_id()) OR (to_store_id = auth_user_store_id())));

-- -------------------------------------------------------------------------
-- Policies for table: store_requisition_items
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "requisition_items_access" ON public.store_requisition_items;
CREATE POLICY "requisition_items_access" ON public.store_requisition_items
  FOR ALL
  TO authenticated
  USING ((is_admin_or_super_admin() OR (EXISTS ( SELECT 1
   FROM store_requisitions r
  WHERE ((r.id = store_requisition_items.requisition_id) AND ((r.from_store_id = auth_user_store_id()) OR (r.to_store_id = auth_user_store_id())))))))
  WITH CHECK ((is_admin_or_super_admin() OR (EXISTS ( SELECT 1
   FROM store_requisitions r
  WHERE ((r.id = store_requisition_items.requisition_id) AND ((r.from_store_id = auth_user_store_id()) OR (r.to_store_id = auth_user_store_id())))))));

DROP POLICY IF EXISTS "store_requisition_items_access" ON public.store_requisition_items;
CREATE POLICY "store_requisition_items_access" ON public.store_requisition_items
  FOR ALL
  TO authenticated
  USING ((is_admin_or_super_admin() OR (EXISTS ( SELECT 1
   FROM store_requisitions
  WHERE ((store_requisitions.id = store_requisition_items.requisition_id) AND ((store_requisitions.from_store_id = auth_user_store_id()) OR (store_requisitions.to_store_id = auth_user_store_id())))))));

-- -------------------------------------------------------------------------
-- Policies for table: stores
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "global_admin_all" ON public.stores;
CREATE POLICY "global_admin_all" ON public.stores
  FOR ALL
  TO authenticated
  USING (is_admin_or_super_admin());

DROP POLICY IF EXISTS "global_select" ON public.stores;
CREATE POLICY "global_select" ON public.stores
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "stores_delete_admin" ON public.stores;
CREATE POLICY "stores_delete_admin" ON public.stores
  FOR DELETE
  TO authenticated
  USING (is_admin_or_super_admin());

DROP POLICY IF EXISTS "stores_insert_admin" ON public.stores;
CREATE POLICY "stores_insert_admin" ON public.stores
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_super_admin());

DROP POLICY IF EXISTS "stores_public_read" ON public.stores;
CREATE POLICY "stores_public_read" ON public.stores
  FOR SELECT
  TO anon
  USING (true);

DROP POLICY IF EXISTS "stores_select" ON public.stores;
CREATE POLICY "stores_select" ON public.stores
  FOR SELECT
  TO authenticated
  USING ((is_admin_or_super_admin() OR (id = auth_user_store_id())));

DROP POLICY IF EXISTS "stores_update_admin" ON public.stores;
CREATE POLICY "stores_update_admin" ON public.stores
  FOR UPDATE
  TO authenticated
  USING (is_admin_or_super_admin());

-- -------------------------------------------------------------------------
-- Policies for table: users
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "users_admin_all" ON public.users;
CREATE POLICY "users_admin_all" ON public.users
  FOR ALL
  TO authenticated
  USING (is_admin_or_super_admin())
  WITH CHECK (is_admin_or_super_admin());

DROP POLICY IF EXISTS "users_select" ON public.users;
CREATE POLICY "users_select" ON public.users
  FOR SELECT
  TO authenticated
  USING (((id = auth.uid()) OR is_admin_or_super_admin() OR ((auth_user_store_id() IS NOT NULL) AND (store_id = auth_user_store_id()))));

DROP POLICY IF EXISTS "users_select_all" ON public.users;
CREATE POLICY "users_select_all" ON public.users
  FOR SELECT
  TO authenticated
  USING (true);

-- -------------------------------------------------------------------------
-- Policies for table: customers
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public invoice read customers" ON public.customers;
CREATE POLICY "Public invoice read customers" ON public.customers
  FOR SELECT
  TO anon
  USING ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.customer_id = customers.id) AND (o.order_number IS NOT NULL)))));

DROP POLICY IF EXISTS "Users can delete customers" ON public.customers;
CREATE POLICY "Users can delete customers" ON public.customers
  FOR DELETE
  TO authenticated
  USING (is_admin_or_super_admin());

DROP POLICY IF EXISTS "Users can insert customers" ON public.customers;
CREATE POLICY "Users can insert customers" ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (((store_id = auth_user_store_id()) OR is_admin_or_super_admin()));

DROP POLICY IF EXISTS "Users can update customers" ON public.customers;
CREATE POLICY "Users can update customers" ON public.customers
  FOR UPDATE
  TO authenticated
  USING (((store_id = auth_user_store_id()) OR is_admin_or_super_admin()));

DROP POLICY IF EXISTS "Users can view and manage store customers" ON public.customers;
CREATE POLICY "Users can view and manage store customers" ON public.customers
  FOR ALL
  TO authenticated
  USING (((store_id = ( SELECT users.store_id
   FROM users
  WHERE (users.id = auth.uid()))) OR is_admin_or_super_admin()));

DROP POLICY IF EXISTS "Users can view customers" ON public.customers;
CREATE POLICY "Users can view customers" ON public.customers
  FOR SELECT
  TO authenticated
  USING (((store_id = auth_user_store_id()) OR is_admin_or_super_admin()));

-- -------------------------------------------------------------------------
-- Policies for table: prescriptions
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public invoice read prescriptions" ON public.prescriptions;
CREATE POLICY "Public invoice read prescriptions" ON public.prescriptions
  FOR SELECT
  TO anon
  USING ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.customer_id = prescriptions.customer_id) AND (o.order_number IS NOT NULL)))));

DROP POLICY IF EXISTS "Users can insert prescriptions" ON public.prescriptions;
CREATE POLICY "Users can insert prescriptions" ON public.prescriptions
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = prescriptions.customer_id) AND ((c.store_id = auth_user_store_id()) OR is_admin_or_super_admin())))));

DROP POLICY IF EXISTS "Users can manage prescriptions in store" ON public.prescriptions;
CREATE POLICY "Users can manage prescriptions in store" ON public.prescriptions
  FOR ALL
  TO authenticated
  USING (((customer_id IN ( SELECT customers.id
   FROM customers
  WHERE (customers.store_id = ( SELECT users.store_id
           FROM users
          WHERE (users.id = auth.uid()))))) OR is_admin_or_super_admin()));

DROP POLICY IF EXISTS "Users can update prescriptions" ON public.prescriptions;
CREATE POLICY "Users can update prescriptions" ON public.prescriptions
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = prescriptions.customer_id) AND ((c.store_id = auth_user_store_id()) OR is_admin_or_super_admin())))));

DROP POLICY IF EXISTS "Users can view prescriptions" ON public.prescriptions;
CREATE POLICY "Users can view prescriptions" ON public.prescriptions
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM customers c
  WHERE ((c.id = prescriptions.customer_id) AND ((c.store_id = auth_user_store_id()) OR is_admin_or_super_admin())))));

-- -------------------------------------------------------------------------
-- Policies for table: products
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "All authenticated users can view products" ON public.products;
CREATE POLICY "All authenticated users can view products" ON public.products
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Only admins can insert products" ON public.products;
CREATE POLICY "Only admins can insert products" ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (is_admin_or_super_admin());

DROP POLICY IF EXISTS "Only admins can modify products" ON public.products;
CREATE POLICY "Only admins can modify products" ON public.products
  FOR UPDATE
  TO authenticated
  USING (is_admin_or_super_admin());

DROP POLICY IF EXISTS "Only super_admin can delete products" ON public.products;
CREATE POLICY "Only super_admin can delete products" ON public.products
  FOR DELETE
  TO authenticated
  USING ((auth_user_role() = 'super_admin'::text));

DROP POLICY IF EXISTS "Public invoice read products" ON public.products;
CREATE POLICY "Public invoice read products" ON public.products
  FOR SELECT
  TO anon
  USING ((EXISTS ( SELECT 1
   FROM (order_items oi
     JOIN orders o ON ((o.id = oi.order_id)))
  WHERE ((oi.product_id = products.id) AND (o.order_number IS NOT NULL)))));

DROP POLICY IF EXISTS "products_select" ON public.products;
CREATE POLICY "products_select" ON public.products
  FOR SELECT
  TO authenticated
  USING (true);

-- -------------------------------------------------------------------------
-- Policies for table: store_inventory
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can delete store inventory" ON public.store_inventory;
CREATE POLICY "Users can delete store inventory" ON public.store_inventory
  FOR DELETE
  TO authenticated
  USING (((store_id = auth_user_store_id()) OR is_admin_or_super_admin()));

DROP POLICY IF EXISTS "Users can insert store inventory" ON public.store_inventory;
CREATE POLICY "Users can insert store inventory" ON public.store_inventory
  FOR INSERT
  TO authenticated
  WITH CHECK (((store_id = auth_user_store_id()) OR is_admin_or_super_admin()));

DROP POLICY IF EXISTS "Users can manage store inventory" ON public.store_inventory;
CREATE POLICY "Users can manage store inventory" ON public.store_inventory
  FOR ALL
  TO authenticated
  USING (((store_id = ( SELECT users.store_id
   FROM users
  WHERE (users.id = auth.uid()))) OR is_admin_or_super_admin()));

DROP POLICY IF EXISTS "Users can update store inventory" ON public.store_inventory;
CREATE POLICY "Users can update store inventory" ON public.store_inventory
  FOR UPDATE
  TO authenticated
  USING (((store_id = auth_user_store_id()) OR is_admin_or_super_admin()));

DROP POLICY IF EXISTS "Users can view store inventory" ON public.store_inventory;
CREATE POLICY "Users can view store inventory" ON public.store_inventory
  FOR SELECT
  TO authenticated
  USING (((store_id = auth_user_store_id()) OR is_admin_or_super_admin()));

-- -------------------------------------------------------------------------
-- Policies for table: orders
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public invoice read orders" ON public.orders;
CREATE POLICY "Public invoice read orders" ON public.orders
  FOR SELECT
  TO anon
  USING ((order_number IS NOT NULL));

DROP POLICY IF EXISTS "Users can delete orders" ON public.orders;
CREATE POLICY "Users can delete orders" ON public.orders
  FOR DELETE
  TO authenticated
  USING (is_admin_or_super_admin());

DROP POLICY IF EXISTS "Users can insert orders" ON public.orders;
CREATE POLICY "Users can insert orders" ON public.orders
  FOR INSERT
  TO authenticated
  WITH CHECK (((store_id = auth_user_store_id()) OR is_admin_or_super_admin()));

DROP POLICY IF EXISTS "Users can manage store orders" ON public.orders;
CREATE POLICY "Users can manage store orders" ON public.orders
  FOR ALL
  TO authenticated
  USING (((store_id = ( SELECT users.store_id
   FROM users
  WHERE (users.id = auth.uid()))) OR is_admin_or_super_admin()));

DROP POLICY IF EXISTS "Users can update orders" ON public.orders;
CREATE POLICY "Users can update orders" ON public.orders
  FOR UPDATE
  TO authenticated
  USING (((store_id = auth_user_store_id()) OR is_admin_or_super_admin()));

DROP POLICY IF EXISTS "Users can view orders" ON public.orders;
CREATE POLICY "Users can view orders" ON public.orders
  FOR SELECT
  TO authenticated
  USING (((store_id = auth_user_store_id()) OR is_admin_or_super_admin()));

-- -------------------------------------------------------------------------
-- Policies for table: order_items
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Public invoice read order items" ON public.order_items;
CREATE POLICY "Public invoice read order items" ON public.order_items
  FOR SELECT
  TO anon
  USING ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND (o.order_number IS NOT NULL)))));

DROP POLICY IF EXISTS "Users can delete order items" ON public.order_items;
CREATE POLICY "Users can delete order items" ON public.order_items
  FOR DELETE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND ((o.store_id = auth_user_store_id()) OR is_admin_or_super_admin())))));

DROP POLICY IF EXISTS "Users can insert order items" ON public.order_items;
CREATE POLICY "Users can insert order items" ON public.order_items
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND ((o.store_id = auth_user_store_id()) OR is_admin_or_super_admin())))));

DROP POLICY IF EXISTS "Users can manage store order items" ON public.order_items;
CREATE POLICY "Users can manage store order items" ON public.order_items
  FOR ALL
  TO authenticated
  USING (((order_id IN ( SELECT orders.id
   FROM orders
  WHERE (orders.store_id = ( SELECT users.store_id
           FROM users
          WHERE (users.id = auth.uid()))))) OR is_admin_or_super_admin()));

DROP POLICY IF EXISTS "Users can update order items" ON public.order_items;
CREATE POLICY "Users can update order items" ON public.order_items
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND ((o.store_id = auth_user_store_id()) OR is_admin_or_super_admin())))));

DROP POLICY IF EXISTS "Users can view order items" ON public.order_items;
CREATE POLICY "Users can view order items" ON public.order_items
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = order_items.order_id) AND ((o.store_id = auth_user_store_id()) OR is_admin_or_super_admin())))));

DROP POLICY IF EXISTS "order_items_store_access" ON public.order_items;
CREATE POLICY "order_items_store_access" ON public.order_items
  FOR ALL
  TO authenticated
  USING ((is_admin_or_super_admin() OR (EXISTS ( SELECT 1
   FROM orders
  WHERE ((orders.id = order_items.order_id) AND (orders.store_id = auth_user_store_id()))))));

-- -------------------------------------------------------------------------
-- Policies for table: payments
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can insert payments" ON public.payments;
CREATE POLICY "Users can insert payments" ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = payments.order_id) AND ((o.store_id = auth_user_store_id()) OR is_admin_or_super_admin())))));

DROP POLICY IF EXISTS "Users can manage store payments" ON public.payments;
CREATE POLICY "Users can manage store payments" ON public.payments
  FOR ALL
  TO authenticated
  USING (((order_id IN ( SELECT orders.id
   FROM orders
  WHERE (orders.store_id = ( SELECT users.store_id
           FROM users
          WHERE (users.id = auth.uid()))))) OR is_admin_or_super_admin()));

DROP POLICY IF EXISTS "Users can update payments" ON public.payments;
CREATE POLICY "Users can update payments" ON public.payments
  FOR UPDATE
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = payments.order_id) AND ((o.store_id = auth_user_store_id()) OR is_admin_or_super_admin())))));

DROP POLICY IF EXISTS "Users can view payments" ON public.payments;
CREATE POLICY "Users can view payments" ON public.payments
  FOR SELECT
  TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM orders o
  WHERE ((o.id = payments.order_id) AND ((o.store_id = auth_user_store_id()) OR is_admin_or_super_admin())))));

DROP POLICY IF EXISTS "payments_store_access" ON public.payments;
CREATE POLICY "payments_store_access" ON public.payments
  FOR ALL
  TO authenticated
  USING ((is_admin_or_super_admin() OR (EXISTS ( SELECT 1
   FROM orders
  WHERE ((orders.id = payments.order_id) AND (orders.store_id = auth_user_store_id()))))));

-- -------------------------------------------------------------------------
-- Policies for table: schedules
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage store schedules" ON public.schedules;
CREATE POLICY "Users can manage store schedules" ON public.schedules
  FOR ALL
  TO authenticated
  USING (((store_id = ( SELECT users.store_id
   FROM users
  WHERE (users.id = auth.uid()))) OR is_admin_or_super_admin()));

DROP POLICY IF EXISTS "schedules_access" ON public.schedules;
CREATE POLICY "schedules_access" ON public.schedules
  FOR ALL
  TO authenticated
  USING ((is_admin_or_super_admin() OR (store_id = auth_user_store_id())));

-- -------------------------------------------------------------------------
-- Policies for table: notifications
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "notifications_self" ON public.notifications;
CREATE POLICY "notifications_self" ON public.notifications
  FOR ALL
  TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

-- -------------------------------------------------------------------------
-- Policies for table: attendance
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "attendance_access" ON public.attendance;
CREATE POLICY "attendance_access" ON public.attendance
  FOR ALL
  TO authenticated
  USING ((is_admin_or_super_admin() OR (user_id = auth.uid()) OR ((auth_user_role() = ANY (ARRAY['manager'::text, 'store_manager'::text])) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = attendance.user_id) AND (u.store_id = auth_user_store_id())))))))
  WITH CHECK ((is_admin_or_super_admin() OR (user_id = auth.uid())));

DROP POLICY IF EXISTS "attendance_self" ON public.attendance;
CREATE POLICY "attendance_self" ON public.attendance
  FOR ALL
  TO authenticated
  USING (((user_id = auth.uid()) OR is_admin_or_super_admin()));

-- -------------------------------------------------------------------------
-- Policies for table: attendance_qr_codes
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "attendance_qr_admin_all" ON public.attendance_qr_codes;
CREATE POLICY "attendance_qr_admin_all" ON public.attendance_qr_codes
  FOR ALL
  TO authenticated
  USING (is_admin_or_super_admin());

DROP POLICY IF EXISTS "attendance_qr_select" ON public.attendance_qr_codes;
CREATE POLICY "attendance_qr_select" ON public.attendance_qr_codes
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "qr_codes_admin_all" ON public.attendance_qr_codes;
CREATE POLICY "qr_codes_admin_all" ON public.attendance_qr_codes
  FOR ALL
  TO authenticated
  USING ((is_admin_or_super_admin() OR (auth_user_role() = ANY (ARRAY['manager'::text, 'store_manager'::text]))))
  WITH CHECK ((is_admin_or_super_admin() OR (auth_user_role() = ANY (ARRAY['manager'::text, 'store_manager'::text]))));

DROP POLICY IF EXISTS "qr_codes_select" ON public.attendance_qr_codes;
CREATE POLICY "qr_codes_select" ON public.attendance_qr_codes
  FOR SELECT
  TO authenticated
  USING (true);

-- -------------------------------------------------------------------------
-- Policies for table: vendors
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "vendors_admin_all" ON public.vendors;
CREATE POLICY "vendors_admin_all" ON public.vendors
  FOR ALL
  TO authenticated
  USING (is_admin_or_super_admin())
  WITH CHECK (is_admin_or_super_admin());

DROP POLICY IF EXISTS "vendors_select" ON public.vendors;
CREATE POLICY "vendors_select" ON public.vendors
  FOR SELECT
  TO authenticated
  USING (true);

-- -------------------------------------------------------------------------
-- Policies for table: shipments
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "shipments_access" ON public.shipments;
CREATE POLICY "shipments_access" ON public.shipments
  FOR ALL
  TO authenticated
  USING ((is_admin_or_super_admin() OR (origin_store_id = auth_user_store_id()) OR (destination_store_id = auth_user_store_id())))
  WITH CHECK ((is_admin_or_super_admin() OR (origin_store_id = auth_user_store_id()) OR (destination_store_id = auth_user_store_id())));

-- -------------------------------------------------------------------------
-- Policies for table: shipment_items
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "shipment_items_access" ON public.shipment_items;
CREATE POLICY "shipment_items_access" ON public.shipment_items
  FOR ALL
  TO authenticated
  USING ((is_admin_or_super_admin() OR (EXISTS ( SELECT 1
   FROM shipments s
  WHERE ((s.id = shipment_items.shipment_id) AND ((s.origin_store_id = auth_user_store_id()) OR (s.destination_store_id = auth_user_store_id())))))))
  WITH CHECK ((is_admin_or_super_admin() OR (EXISTS ( SELECT 1
   FROM shipments s
  WHERE ((s.id = shipment_items.shipment_id) AND ((s.origin_store_id = auth_user_store_id()) OR (s.destination_store_id = auth_user_store_id())))))));

-- -------------------------------------------------------------------------
-- Policies for table: product_barcodes
-- -------------------------------------------------------------------------
DROP POLICY IF EXISTS "barcodes_admin_all" ON public.product_barcodes;
CREATE POLICY "barcodes_admin_all" ON public.product_barcodes
  FOR ALL
  TO authenticated
  USING (is_admin_or_super_admin())
  WITH CHECK (is_admin_or_super_admin());

DROP POLICY IF EXISTS "barcodes_select" ON public.product_barcodes;
CREATE POLICY "barcodes_select" ON public.product_barcodes
  FOR SELECT
  TO authenticated
  USING (true);

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

-- SEEDS FETCHED FROM LIVE DATABASE

-- Data for table: public.stores
INSERT INTO public.stores (id, name, address, phone, email, created_at, gst_no) VALUES ('7d176453-c865-406e-a3d3-56c279c3ec68', 'test 1', 'Addagutta Society, Western Hills, Jal Vayu Vihar, Kukatpally, Hyderabad, Telangana 500085', '1234567890', NULL, '2026-06-01T16:49:42.263Z', '36AANCB3874FIZF') ON CONFLICT DO NOTHING;
INSERT INTO public.stores (id, name, address, phone, email, created_at, gst_no) VALUES ('17df36ab-be0a-4049-8934-16db5b31904f', 'test 2', 'Opp. PVP Square, MG Road, Vijayawada, Andhra Pradesh 520010', '0987654321', NULL, '2026-06-01T16:51:26.892Z', '37AANCB3874F1ZD') ON CONFLICT DO NOTHING;
INSERT INTO public.stores (id, name, address, phone, email, created_at, gst_no) VALUES ('d283d3dc-a6b7-4b62-8b7f-965db7e838cf', 'Aster Opticals', '123 Main St', '1234567890', NULL, '2026-06-01T17:17:29.867Z', '36AAAAA1111A1Z1') ON CONFLICT DO NOTHING;
INSERT INTO public.stores (id, name, address, phone, email, created_at, gst_no) VALUES ('55a4119f-3e20-4a22-81e0-5a9c62926e92', 'test 3', '1234567890', '1234567890', NULL, '2026-06-02T03:20:40.256Z', '1234567890') ON CONFLICT DO NOTHING;

-- Data for table: public.users
INSERT INTO public.users (id, email, password_hash, name, role, store_id, is_active, created_at) VALUES ('fe8f278c-69fc-4d5a-86fb-5a2f69dc5550', 'pingilisakethreddy@gmail.com', '$2a$06$lWUr0E9crQ6O9m92aY4uQuqVI8cKcQWioJfWRR2FhtGiey87aCItW', 'Saketh Reddy', 'admin', NULL, true, '2026-05-31T17:08:24.356Z') ON CONFLICT DO NOTHING;
INSERT INTO public.users (id, email, password_hash, name, role, store_id, is_active, created_at) VALUES ('559f480a-c61b-4465-aa31-bda5dfe0ca8f', 'test@bonthus.in', '$2a$06$qdIeTTOaxQ1h4MBCTgbKcOLliVg.5SpVjKfkSSIaLsjvb50ACspb2', 'Test User', 'admin', NULL, true, '2026-06-01T13:15:29.847Z') ON CONFLICT DO NOTHING;

-- Data for table: public.categories
INSERT INTO public.categories (id, name, description, created_at) VALUES ('c2ab4346-70d9-4646-b8b0-8695ffc7133f', 'frames', NULL, '2026-06-01T17:31:46.780Z') ON CONFLICT DO NOTHING;
INSERT INTO public.categories (id, name, description, created_at) VALUES ('d705f4e3-0ac1-4777-9c38-5249d9a1993c', 'lenses', NULL, '2026-06-01T17:31:46.780Z') ON CONFLICT DO NOTHING;
INSERT INTO public.categories (id, name, description, created_at) VALUES ('8141eccd-5aca-4ed6-b28b-d4a4be58359a', 'contact_lenses', NULL, '2026-06-01T17:31:46.780Z') ON CONFLICT DO NOTHING;
INSERT INTO public.categories (id, name, description, created_at) VALUES ('aff04a0c-dbd7-409b-aba9-7a0dede0b5c7', 'accessories', NULL, '2026-06-01T17:31:46.780Z') ON CONFLICT DO NOTHING;
INSERT INTO public.categories (id, name, description, created_at) VALUES ('d97ddfd9-4baf-4e9f-983f-415be86688b8', 'solutions', NULL, '2026-06-01T17:31:46.780Z') ON CONFLICT DO NOTHING;
INSERT INTO public.categories (id, name, description, created_at) VALUES ('f6aaf933-ce65-4cf8-8aa9-acbfe872ee2a', 'test', NULL, '2026-06-01T17:35:15.954Z') ON CONFLICT DO NOTHING;

-- Data for table: public.products
INSERT INTO public.products (id, sku, upc, name, brand, description, base_price, created_at, category_id, vendor_id) VALUES ('dba4c082-3e0f-4e4e-9937-605da0be15b3', 'PL-062484', NULL, 'test', NULL, NULL, '1000.00', '2026-06-01T17:52:09.539Z', 'f6aaf933-ce65-4cf8-8aa9-acbfe872ee2a', NULL) ON CONFLICT DO NOTHING;
INSERT INTO public.products (id, sku, upc, name, brand, description, base_price, created_at, category_id, vendor_id) VALUES ('93fc3ae1-a479-4bfc-84e1-e03b961f8a13', 'PL-800005', NULL, 'test', NULL, NULL, '1000.00', '2026-06-01T17:57:54.430Z', 'f6aaf933-ce65-4cf8-8aa9-acbfe872ee2a', NULL) ON CONFLICT DO NOTHING;

-- Data for table: public.vendors
INSERT INTO public.vendors (id, name, contact_name, phone, email, address, created_at) VALUES ('74406024-2036-486f-a654-244a8bc26267', 'test', 'test', '1234567890', 'test@bonthus.in', 'test', '2026-06-06T19:48:59.748Z') ON CONFLICT DO NOTHING;

