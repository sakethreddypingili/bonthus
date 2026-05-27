-- Master Schema Specification
-- Run this script to completely recreate the schema. Make sure to back up data if needed!

-- 1. Enable pgcrypto for gen_random_uuid() just in case, though we use custom IDs.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Drop existing tables to start fresh (CASCADE drops dependent objects)
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.products_list CASCADE;
DROP TABLE IF EXISTS public.products_category CASCADE;
DROP TABLE IF EXISTS public.customers CASCADE;
DROP TABLE IF EXISTS public.voucher CASCADE;
DROP TABLE IF EXISTS public.user_stores CASCADE;
DROP TABLE IF EXISTS public.store CASCADE;
DROP TABLE IF EXISTS public.auth_users CASCADE;

-- 3. ID Generation Function
-- We'll create a generic function to generate text IDs like 'PREFIX-123456'
CREATE OR REPLACE FUNCTION public.gen_id(prefix text, length integer)
RETURNS text AS $$
DECLARE
    result text;
    chars text := '0123456789';
BEGIN
    result := prefix;
    FOR i IN 1..length LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- 4. Core Tables

-- auth_users (Staff/Managers)
CREATE TABLE public.auth_users (
    id text PRIMARY KEY DEFAULT public.gen_id('TLC-', 6),
    email text UNIQUE NOT NULL,
    role text NOT NULL CHECK (role IN ('super_admin', 'admin', 'manager', 'staff')),
    store_id text, -- Primary store assignment
    status text DEFAULT 'active',
    created_at timestamptz DEFAULT now()
);

-- store
CREATE TABLE public.store (
    id text PRIMARY KEY DEFAULT public.gen_id('STR-', 4),
    name text NOT NULL,
    address text,
    created_at timestamptz DEFAULT now()
);

-- Foreign Key for auth_users' primary store
ALTER TABLE public.auth_users ADD CONSTRAINT fk_auth_users_store FOREIGN KEY (store_id) REFERENCES public.store(id) ON DELETE SET NULL;

-- user_stores (Multi-Store Access)
CREATE TABLE public.user_stores (
    user_id text REFERENCES public.auth_users(id) ON DELETE CASCADE,
    store_id text REFERENCES public.store(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, store_id)
);

-- voucher
CREATE TABLE public.voucher (
    id text PRIMARY KEY DEFAULT public.gen_id('VC-', 8),
    code text UNIQUE NOT NULL,
    discount_amount numeric,
    discount_percent numeric,
    store_id text REFERENCES public.store(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- customers
CREATE TABLE public.customers (
    id text PRIMARY KEY DEFAULT public.gen_id('LC-', 8),
    name text NOT NULL,
    phone text,
    email text,
    store_id text REFERENCES public.store(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- products_category
CREATE TABLE public.products_category (
    id text PRIMARY KEY DEFAULT public.gen_id('PC-', 4),
    name text NOT NULL,
    store_id text REFERENCES public.store(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- products_list
CREATE TABLE public.products_list (
    id text PRIMARY KEY DEFAULT public.gen_id('PL-', 6),
    name text NOT NULL,
    category_id text REFERENCES public.products_category(id) ON DELETE SET NULL,
    price numeric NOT NULL,
    stock integer NOT NULL DEFAULT 0,
    store_id text REFERENCES public.store(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- orders
CREATE TABLE public.orders (
    id text PRIMARY KEY DEFAULT public.gen_id('OD-', 6),
    store_id text REFERENCES public.store(id) ON DELETE CASCADE,
    customer_id text REFERENCES public.customers(id) ON DELETE SET NULL,
    status text DEFAULT 'pending',
    total_discount numeric DEFAULT 0,
    due_amount numeric DEFAULT 0,
    gross_amount numeric DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- order_items
CREATE TABLE public.order_items (
    id text PRIMARY KEY DEFAULT public.gen_id('OL-', 8),
    order_id text REFERENCES public.orders(id) ON DELETE CASCADE,
    product_id text REFERENCES public.products_list(id) ON DELETE SET NULL,
    quantity integer NOT NULL DEFAULT 1,
    unit_price numeric NOT NULL,
    subtotal numeric NOT NULL,
    store_id text REFERENCES public.store(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now()
);

-- 5. Helper Functions for RLS

-- Gets the user's role by casting their Auth UUID to text
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text AS $$
  SELECT role FROM public.auth_users WHERE id = auth.uid()::text;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Gets all store IDs the user is allowed to access
CREATE OR REPLACE FUNCTION public.get_user_stores()
RETURNS text[] AS $$
  SELECT COALESCE(array_agg(store_id), ARRAY[]::text[]) 
  FROM public.user_stores 
  WHERE user_id = auth.uid()::text;
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- 6. Enable Row Level Security
ALTER TABLE public.auth_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_category ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;


-- 7. Define Store-Scoped Policies

-- Store table policy
CREATE POLICY "store_access_policy" ON public.store
FOR ALL TO authenticated
USING (
  public.get_auth_role() IN ('admin', 'super_admin') 
  OR id = ANY(public.get_user_stores())
);

-- voucher policy
CREATE POLICY "store_access_policy" ON public.voucher
FOR ALL TO authenticated
USING (
  public.get_auth_role() IN ('admin', 'super_admin') 
  OR store_id = ANY(public.get_user_stores())
);

-- customers policy
CREATE POLICY "store_access_policy" ON public.customers
FOR ALL TO authenticated
USING (
  public.get_auth_role() IN ('admin', 'super_admin') 
  OR store_id = ANY(public.get_user_stores())
);

-- products_category policy
CREATE POLICY "store_access_policy" ON public.products_category
FOR ALL TO authenticated
USING (
  public.get_auth_role() IN ('admin', 'super_admin') 
  OR store_id = ANY(public.get_user_stores())
);

-- products_list policy
CREATE POLICY "store_access_policy" ON public.products_list
FOR ALL TO authenticated
USING (
  public.get_auth_role() IN ('admin', 'super_admin') 
  OR store_id = ANY(public.get_user_stores())
);

-- orders policy
CREATE POLICY "store_access_policy" ON public.orders
FOR ALL TO authenticated
USING (
  public.get_auth_role() IN ('admin', 'super_admin') 
  OR store_id = ANY(public.get_user_stores())
);

-- order_items policy
CREATE POLICY "store_access_policy" ON public.order_items
FOR ALL TO authenticated
USING (
  public.get_auth_role() IN ('admin', 'super_admin') 
  OR store_id = ANY(public.get_user_stores())
);

-- auth_users policy (users can see themselves, or admins can see all, or managers can see users in their stores)
CREATE POLICY "auth_users_access_policy" ON public.auth_users
FOR ALL TO authenticated
USING (
  id = auth.uid()::text 
  OR public.get_auth_role() IN ('admin', 'super_admin') 
  OR store_id = ANY(public.get_user_stores())
);

-- user_stores policy
CREATE POLICY "user_stores_access_policy" ON public.user_stores
FOR ALL TO authenticated
USING (
  user_id = auth.uid()::text 
  OR public.get_auth_role() IN ('admin', 'super_admin') 
  OR store_id = ANY(public.get_user_stores())
);

-- 8. Final Setup
-- Grant usage to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO authenticated;
