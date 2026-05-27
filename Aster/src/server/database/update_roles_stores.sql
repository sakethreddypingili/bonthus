-- First, clean up existing data so it doesn't violate the upcoming constraints
UPDATE public.auth_users
SET role = 'store_manager'
WHERE role NOT IN ('super_admin', 'admin', 'store_manager');

UPDATE public.auth_users
SET store_name = 'All'
WHERE store_name NOT IN (
  'All',
  'Madeenaguda, Hyderabad',
  'JNTUH Kukatpally, Hyderabad',
  'Ameerpet, Hyderabad',
  'Puppalguda Manikonda, Hyderabad',
  'Nizampet Kukatpally, Hyderabad',
  'Bachupally, Hyderabad',
  'Nandigama, Andhra Pradesh',
  'Vijayawada, Andhra Pradesh',
  'Vizag, Andhra Pradesh'
);

-- Drop old constraints if they exist
ALTER TABLE public.auth_users DROP CONSTRAINT IF EXISTS auth_users_role_check;
ALTER TABLE public.auth_users DROP CONSTRAINT IF EXISTS auth_users_store_name_check;

-- Add strict check constraints
ALTER TABLE public.auth_users
ADD CONSTRAINT auth_users_role_check 
CHECK (role IN ('super_admin', 'admin', 'store_manager'));

ALTER TABLE public.auth_users
ADD CONSTRAINT auth_users_store_name_check 
CHECK (store_name IN (
  'All',
  'Madeenaguda, Hyderabad',
  'JNTUH Kukatpally, Hyderabad',
  'Ameerpet, Hyderabad',
  'Puppalguda Manikonda, Hyderabad',
  'Nizampet Kukatpally, Hyderabad',
  'Bachupally, Hyderabad',
  'Nandigama, Andhra Pradesh',
  'Vijayawada, Andhra Pradesh',
  'Vizag, Andhra Pradesh'
));
