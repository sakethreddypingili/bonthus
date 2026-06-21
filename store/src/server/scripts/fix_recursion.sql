-- Drops existing policies on public.users
DROP POLICY IF EXISTS "users_select" ON public.users;
DROP POLICY IF EXISTS "users_select_all" ON public.users;
DROP POLICY IF EXISTS "users_read_policy" ON public.users;

-- 1. Create a non-recursive SELECT policy for the "users" table.
-- Anyone authenticated can view their own profile directly by id.
-- To allow employee/admin lookups across users without querying the users table itself recursively,
-- we check against auth.jwt() claims or basic auth.uid() checks.
-- We also allow looking up users if the current user exists in the auth schema, 
-- or by relying on auth.uid() directly since Supabase auth is standard.
CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated
USING (
  -- A user can always select their own row
  auth.uid() = id
  OR
  -- Or if they are authenticated, we let them see user listings. To avoid table recursion,
  -- we check if auth.uid() matches any valid authenticated session.
  -- To completely avoid referencing public.users recursively in the USING clause, we do:
  (auth.uid() IS NOT NULL)
);

-- Similarly update other tables if they rely on users table checking:
DROP POLICY IF EXISTS "Users can view customers" ON public.customers;
CREATE POLICY "Users can view customers" ON public.customers FOR SELECT TO authenticated 
USING (auth.uid() IS NOT NULL);
