-- =========================================================================
-- OPTICAL RETAIL SUITE - SUPABASE POSTGRESQL SCHEMA INITIALIZATION
-- =========================================================================

-- Enable UUID extension (typically enabled by default in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

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

-- Apply updated_at trigger to user_settings
CREATE TRIGGER set_timestamp_user_settings
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

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

-- Apply updated_at trigger to orders
CREATE TRIGGER set_timestamp_orders
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

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
