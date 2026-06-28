CREATE TABLE IF NOT EXISTS public.frame_catalog (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,          -- e.g. "FR-1", "FR-2", "FIT-1"
    name TEXT NOT NULL,                  -- e.g. "Bonthus Frame", "Jas Harlon Frame"
    brand TEXT NOT NULL,                 -- "Bonthus", "Jas Harlon", "Fitting"
    frame_type TEXT NOT NULL,            -- "frame" or "fitting"
    price NUMERIC NOT NULL DEFAULT 0.00,
    is_b1g1 BOOLEAN NOT NULL DEFAULT false,
    image_url TEXT,                      -- Default brand logo/image reference
    description TEXT,                    -- Default brand description
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.frame_catalog ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read access to all users on frame_catalog" ON public.frame_catalog
    FOR SELECT USING (true);

CREATE POLICY "Allow all access to authenticated users on frame_catalog" ON public.frame_catalog
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Add custom_frame_specs JSONB column to order_items table
ALTER TABLE public.order_items ADD COLUMN IF NOT EXISTS custom_frame_specs JSONB;
-- Add is_b1g1 column to lens_catalog table
ALTER TABLE public.lens_catalog ADD COLUMN IF NOT EXISTS is_b1g1 BOOLEAN NOT NULL DEFAULT true;
