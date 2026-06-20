BEGIN;

-- 1. Create the family table
CREATE TABLE IF NOT EXISTS public.family (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_code VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Add family_id to customers table
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES public.family(id);

-- 3. Create the dependents table
CREATE TABLE IF NOT EXISTS public.dependents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE NOT NULL,
    family_id UUID REFERENCES public.family(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_parent_dependent UNIQUE (parent_customer_id, name, relationship)
);

-- 4. Create temporary table mapping primary customers to newly generated family codes and family rows
CREATE TEMP TABLE temp_primary_families AS
SELECT 
    id AS customer_id, 
    gen_random_uuid() AS new_family_id,
    'FAM-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)) AS new_family_code
FROM public.customers
WHERE parent_id IS NULL;

-- 5. Insert new family groups
INSERT INTO public.family (id, family_code)
SELECT new_family_id, new_family_code FROM temp_primary_families;

-- 6. Link primary customers to their new family IDs
UPDATE public.customers c
SET family_id = t.new_family_id
FROM temp_primary_families t
WHERE c.id = t.customer_id;

-- 7. Port existing child/dependent records from customers into the dependents table
INSERT INTO public.dependents (parent_customer_id, family_id, name, relationship, phone, email, created_at)
SELECT 
    c.parent_id,
    p.family_id,
    c.name,
    c.relationship,
    c.phone,
    c.email,
    c.created_at
FROM public.customers c
JOIN public.customers p ON c.parent_id = p.id
WHERE c.parent_id IS NOT NULL
ON CONFLICT (parent_customer_id, name, relationship) DO NOTHING;

-- 8. Delete child customer profiles from core customers table
DELETE FROM public.customers WHERE parent_id IS NOT NULL;

-- 9. Drop the legacy columns from customers
ALTER TABLE public.customers DROP COLUMN IF EXISTS parent_id;
ALTER TABLE public.customers DROP COLUMN IF EXISTS relationship;

COMMIT;
