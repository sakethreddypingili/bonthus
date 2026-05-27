-- Fix existing employees: Set user_id based on matching email with auth.users
-- Run this in Supabase SQL Editor

-- Check which employees have NULL user_id
SELECT id, name, email, user_id 
FROM employees 
WHERE user_id IS NULL;

-- Update employees to set user_id from auth.users based on matching email
UPDATE employees e
SET user_id = u.id
FROM auth.users u
WHERE e.email = u.email
  AND e.user_id IS NULL;

-- Verify the fix
SELECT id, name, email, user_id 
FROM employees 
WHERE user_id IS NOT NULL;
