-- Migration: Add Customer Dependencies and Visit Purpose (Flow)

-- 1. Add dependency columns to public.customers
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS relationship TEXT;

-- 2. Create customer_visits table
CREATE TABLE IF NOT EXISTS public.customer_visits (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
    purpose TEXT NOT NULL, -- 'buy', 'eye_checkup', 'followup', 'other'
    notes TEXT,
    employee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    store_id UUID REFERENCES public.stores(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Enable RLS for customer_visits
ALTER TABLE public.customer_visits ENABLE ROW LEVEL SECURITY;

-- 3. Create policies for customer_visits
DROP POLICY IF EXISTS "Users can view visits" ON public.customer_visits;
CREATE POLICY "Users can view visits" ON public.customer_visits
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert visits" ON public.customer_visits;
CREATE POLICY "Users can insert visits" ON public.customer_visits
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage visits" ON public.customer_visits;
CREATE POLICY "Users can manage visits" ON public.customer_visits
  FOR ALL
  TO authenticated
  USING (true);
