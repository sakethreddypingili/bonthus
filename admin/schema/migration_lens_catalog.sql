CREATE TABLE IF NOT EXISTS public.lens_catalog (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    code TEXT NOT NULL,                    -- e.g. "SV-1", "PROG-3"
    name TEXT NOT NULL,                    -- e.g. "Bonthus Blu Screen"
    lens_type TEXT NOT NULL,               -- "single_vision", "progressive", "bifocal", "photochromatic"
    material TEXT DEFAULT 'standard',      -- "standard", "polycarbonate"
    lens_index TEXT,                       -- "1.5", "1.56", "1.59", "1.67", "1.74"
    power_range TEXT,                      -- e.g. "-6 / -2"
    price NUMERIC NOT NULL DEFAULT 0.00,
    warranty TEXT,                         -- e.g. "6 Months Warranty..."
    engraving TEXT,                        -- For progressives: "JS", "BS", "NO"
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    PRIMARY KEY (id)
);

-- Enable RLS
ALTER TABLE public.lens_catalog ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow read access to all users" ON public.lens_catalog
    FOR SELECT USING (true);

CREATE POLICY "Allow all access to authenticated users" ON public.lens_catalog
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
