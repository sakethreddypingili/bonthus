-- Drop the check constraints so we can insert new categories
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;
ALTER TABLE public.online_products DROP CONSTRAINT IF EXISTS online_products_category_check;
ALTER TABLE public.online_products DROP CONSTRAINT IF EXISTS online_products_category_check1;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check1;
