-- Enable RLS on employees table (if not already enabled)
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Employees can view own record" ON employees;
DROP POLICY IF EXISTS "Allow authenticated users to view employees" ON employees;

-- Create policy: Employees can read their own record by matching auth.uid() to user_id
CREATE POLICY "Employees can view own record" 
ON employees 
FOR SELECT 
TO authenticated 
USING (user_id = auth.uid());

-- Optional: Allow admins to view all employees (check auth_users table for role)
CREATE POLICY "Admins can view all employees" 
ON employees 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM auth_users 
    WHERE auth_users.id = auth.uid() 
    AND auth_users.role IN ('admin', 'super_admin')
  )
);

-- Policy for inserting employees (only admins)
DROP POLICY IF EXISTS "Admins can insert employees" ON employees;
CREATE POLICY "Admins can insert employees" 
ON employees 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth_users 
    WHERE auth_users.id = auth.uid() 
    AND auth_users.role IN ('admin', 'super_admin', 'store_manager')
  )
);

-- Policy for updating employees (only admins)
DROP POLICY IF EXISTS "Admins can update employees" ON employees;
CREATE POLICY "Admins can update employees" 
ON employees 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM auth_users 
    WHERE auth_users.id = auth.uid() 
    AND auth_users.role IN ('admin', 'super_admin', 'store_manager')
  )
);
