-- Add must_reset_password column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT true;

-- Set existing employees to NOT need password reset (they already logged in)
UPDATE employees 
SET must_reset_password = false 
WHERE user_id IS NOT NULL;
