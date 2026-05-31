-- ==========================================
-- BONTHUS ABSOLUTE UNIFIED SCHEMA (v3)
-- Target: Supabase / PostgreSQL
-- Coverage: Admin, Warehouse, Store
-- Features: Multi-store, HR, Sales, CRM, Supply Chain
-- ==========================================

-- 1. ID GENERATOR FUNCTION
CREATE OR REPLACE FUNCTION gen_id(prefix text, digits int)
RETURNS text AS $$
DECLARE
  result text := prefix;
BEGIN
  FOR i IN 1..digits LOOP
    result := result || floor(random()*10)::INT;
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 2. CORE TABLES

-- Store Registry
CREATE TABLE IF NOT EXISTS store (
  id TEXT PRIMARY KEY DEFAULT gen_id('STR-', 4),
  name TEXT NOT NULL,
  address TEXT,
  gst_no TEXT,
  phone_no TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Store Tax Configurations (Joined with store)
CREATE TABLE IF NOT EXISTS store_tax_rates (
  id TEXT PRIMARY KEY DEFAULT gen_id('TX-', 4),
  store_id TEXT REFERENCES store(id) ON DELETE CASCADE,
  sgst NUMERIC DEFAULT 0,
  cgst NUMERIC DEFAULT 0,
  igst NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- User Profiles (Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS auth_users (
  id UUID PRIMARY KEY, -- Matches auth.users.id
  email TEXT UNIQUE NOT NULL,
  store_id TEXT REFERENCES store(id),
  store_name TEXT, 
  role TEXT DEFAULT 'employee', -- super_admin, admin, store_manager, employee
  status TEXT DEFAULT 'active',
  must_reset_password BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Human Resources
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY DEFAULT gen_id('EMP-', 6),
  employee_id TEXT UNIQUE, 
  user_id UUID REFERENCES auth_users(id), 
  store_id TEXT REFERENCES store(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  department TEXT,
  status TEXT DEFAULT 'active',
  joined_on DATE DEFAULT CURRENT_DATE,
  must_reset_password BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Attendance Management
CREATE TABLE IF NOT EXISTS attendance (
  id BIGSERIAL PRIMARY KEY,
  employee_id TEXT REFERENCES employees(id) ON DELETE CASCADE,
  attendance_date DATE DEFAULT CURRENT_DATE,
  check_in TIMESTAMP WITH TIME ZONE,
  check_out TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'present', 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attendance_qr_codes (
  id BIGSERIAL PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  store_id TEXT REFERENCES store(id),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- CRM
CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY DEFAULT gen_id('LC-', 8),
  name TEXT NOT NULL,
  name_alias TEXT,
  phone TEXT,
  email TEXT,
  street TEXT,
  town TEXT,
  district TEXT,
  state TEXT,
  store_id TEXT REFERENCES store(id),
  no_of_orders INT DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  last_purchase_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inventory Management
CREATE TABLE IF NOT EXISTS products_category (
  id TEXT PRIMARY KEY DEFAULT gen_id('PC-', 4),
  name TEXT NOT NULL,
  store_id TEXT REFERENCES store(id),
  sgst NUMERIC DEFAULT 0,
  cgst NUMERIC DEFAULT 0,
  igst NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products_list (
  id TEXT PRIMARY KEY DEFAULT gen_id('PL-', 6),
  store_id TEXT REFERENCES store(id),
  category_id TEXT REFERENCES products_category(id),
  name TEXT NOT NULL,
  item_detail TEXT,
  hsn_code TEXT,
  price NUMERIC DEFAULT 0,
  stock INT DEFAULT 0,
  sales INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Sales & Orders
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY DEFAULT gen_id('OD-', 6),
  customer_id TEXT REFERENCES customers(id),
  store_id TEXT REFERENCES store(id),
  voucher_no TEXT,
  status TEXT DEFAULT 'pending', 
  order_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
  subtotal NUMERIC DEFAULT 0,
  total_discount NUMERIC DEFAULT 0,
  discount_rate NUMERIC DEFAULT 0,
  discount_amt NUMERIC DEFAULT 0,
  taxable_amount NUMERIC DEFAULT 0,
  cgst_amt NUMERIC DEFAULT 0,
  sgst_amt NUMERIC DEFAULT 0,
  gross_amount NUMERIC DEFAULT 0,
  advance_paid NUMERIC DEFAULT 0,
  balance_due NUMERIC DEFAULT 0,
  due_amount NUMERIC DEFAULT 0,
  disabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY DEFAULT gen_id('OL-', 8),
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products_list(id),
  qty INT DEFAULT 1,
  price NUMERIC DEFAULT 0,
  discount_amt NUMERIC DEFAULT 0,
  taxable_amount NUMERIC DEFAULT 0,
  cgst_amt NUMERIC DEFAULT 0,
  sgst_amt NUMERIC DEFAULT 0,
  total_price NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Clinical Data
CREATE TABLE IF NOT EXISTS eye_power (
  id BIGSERIAL PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id) ON DELETE CASCADE,
  order_id TEXT REFERENCES orders(id) ON DELETE CASCADE,
  -- Distance Vision (DV)
  dv_right_sph TEXT, dv_right_cyl TEXT, dv_right_axis TEXT,
  dv_left_sph TEXT, dv_left_cyl TEXT, dv_left_axis TEXT,
  -- Near Vision (NV) / Addition
  nv_right_sph TEXT, nv_right_cyl TEXT, nv_right_axis TEXT,
  nv_left_sph TEXT, nv_left_cyl TEXT, nv_left_axis TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Financials
CREATE TABLE IF NOT EXISTS voucher (
  id TEXT PRIMARY KEY DEFAULT gen_id('VC-', 8),
  voucher_no TEXT UNIQUE NOT NULL,
  order_id TEXT REFERENCES orders(id),
  status TEXT DEFAULT 'unused',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Supply Chain
CREATE TABLE IF NOT EXISTS vendors (
  id TEXT PRIMARY KEY DEFAULT gen_id('PV-', 6),
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY DEFAULT gen_id('SH-', 6),
  supplier TEXT, 
  expected DATE,
  units INT DEFAULT 0,
  status TEXT DEFAULT 'Scheduled', 
  contents JSONB, 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Operational Scheduling
CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  date DATE,
  time TEXT,
  assigned_to TEXT REFERENCES employees(id),
  type TEXT DEFAULT 'task', 
  status TEXT DEFAULT 'pending', 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_auth_users_store ON auth_users(store_id);
CREATE INDEX IF NOT EXISTS idx_employees_store ON employees(store_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee ON attendance(employee_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_products_store ON products_list(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products_list(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_eye_power_customer ON eye_power(customer_id);

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE store ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_tax_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE products_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE eye_power ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 5. POLICIES (AUTHENTICATED ACCESS)
DO $$ 
DECLARE 
  t text;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' 
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "authenticated_full_access" ON %I', t);
    EXECUTE format('CREATE POLICY "authenticated_full_access" ON %I FOR ALL USING (auth.role() = ''authenticated'')', t);
  END LOOP;
END $$;

-- 6. SEED DATA (INITIAL ADMIN)
INSERT INTO auth_users (id, email, role, status, must_reset_password, created_at)
VALUES (
  '8f87633b-a334-48ce-82cc-3b28831e3561', 
  'pingilisakethreddy@gmail.com', 
  'admin', 
  'active', 
  false, 
  now()
) ON CONFLICT (id) DO UPDATE SET role = 'admin', must_reset_password = false;
