-- MIGRATION: repairs table

CREATE TABLE IF NOT EXISTS public.repairs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL,
  store_id uuid NOT NULL,
  product_name text NOT NULL,
  product_brand text,
  repair_type text NOT NULL,
  notes text,
  cost numeric NOT NULL DEFAULT 0.00 CHECK (cost >= 0.00),
  status text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'ready'::text, 'delivered'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT repairs_pkey PRIMARY KEY (id),
  CONSTRAINT repairs_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT,
  CONSTRAINT repairs_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE RESTRICT
);

GRANT ALL ON TABLE public.repairs TO authenticated, service_role;
