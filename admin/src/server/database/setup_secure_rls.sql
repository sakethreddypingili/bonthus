-- 1. Enable RLS on the tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own details" ON public.users;
DROP POLICY IF EXISTS "Users and admins can update profile details" ON public.users;
DROP POLICY IF EXISTS "Users can read own store details" ON public.stores;

-- 3. RLS Policies for public.users table
-- Allow users to read their own user profile, and admins to read all profiles
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR (SELECT role FROM public.users WHERE users.id = auth.uid()) IN ('admin', 'super_admin')
  );

-- Allow users to update their own profile details, or allow admins to update users
CREATE POLICY "Users and admins can update profile details"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR (SELECT role FROM public.users WHERE users.id = auth.uid()) IN ('admin', 'super_admin')
  );

-- 4. RLS Policies for public.stores table
-- Allow users to read details of the store they belong to, and admins to read all stores
CREATE POLICY "Users can read own store details"
  ON public.stores
  FOR SELECT
  TO authenticated
  USING (
    id = (SELECT store_id FROM public.users WHERE users.id = auth.uid())
    OR (SELECT role FROM public.users WHERE users.id = auth.uid()) IN ('admin', 'super_admin')
  );

-- 5. Trigger function to automatically link auth.users to public.users by email
CREATE OR REPLACE FUNCTION public.handle_auth_user_link()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET id = NEW.id
  WHERE email = NEW.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users (runs after insert/updates on the auth schema)
DROP TRIGGER IF EXISTS tr_auth_user_link ON auth.users;
CREATE TRIGGER tr_auth_user_link
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_link();
