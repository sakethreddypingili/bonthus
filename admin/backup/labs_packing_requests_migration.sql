-- Migration: Labs Packing Requests table
-- Generated: 2026-07-05
-- Run this in Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.lab_packing_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  order_id UUID,
  store_id UUID,
  lab_id UUID,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'received', 'in_progress', 'ready', 'dispatched')),
  notes TEXT,
  lens_type TEXT,
  power_details JSONB,
  coating TEXT,
  frame_details TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  requested_by UUID,
  assigned_to UUID,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  dispatched_at TIMESTAMP WITH TIME ZONE,
  PRIMARY KEY (id)
);

ALTER TABLE public.lab_packing_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can manage packing requests" ON public.lab_packing_requests;
CREATE POLICY "Authenticated users can manage packing requests"
  ON public.lab_packing_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
