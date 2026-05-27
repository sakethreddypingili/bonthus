-- RPC Function to get email by employee_id
-- This function is used during login when an employee uses their employee_id
create or replace function get_email_by_employee_id(p_employee_id text)
returns text as $$
declare
  v_email text;
begin
  select email into v_email
  from employees
  where employee_id = p_employee_id
  limit 1;
  
  return v_email;
end;
$$ language plpgsql;

-- Grant permission to anon users (for unauthenticated login attempts)
grant execute on function get_email_by_employee_id(text) to anon, authenticated;
