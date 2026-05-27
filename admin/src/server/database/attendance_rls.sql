-- Attendance feature security rules
-- Goal:
-- 1) Store managers can create employees for their own store.
-- 2) Store managers can mark attendance once (insert only) for their own store employees.
-- 3) Only admin/super_admin can update or delete attendance rows.

-- Helper functions mapped by authenticated user email from JWT
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role
      from public.auth_users
      where email = auth.jwt() ->> 'email'
      limit 1
    ),
    ''
  );
$$;

create or replace function public.current_app_store_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select (
    select store_id
    from public.auth_users
    where email = auth.jwt() ->> 'email'
    limit 1
  );
$$;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.current_app_store_id() to authenticated;

-- Enable RLS
alter table public.employees enable row level security;
alter table public.attendance enable row level security;

-- Re-runnable: remove old policies if they exist
drop policy if exists employees_select_scope on public.employees;
drop policy if exists employees_insert_scope on public.employees;
drop policy if exists employees_update_admin_only on public.employees;
drop policy if exists employees_delete_admin_only on public.employees;

drop policy if exists attendance_select_scope on public.attendance;
drop policy if exists attendance_insert_scope on public.attendance;
drop policy if exists attendance_update_admin_only on public.attendance;
drop policy if exists attendance_delete_admin_only on public.attendance;

-- EMPLOYEES POLICIES
create policy employees_select_scope on public.employees
for select
to authenticated
using (
  public.current_app_role() in ('admin', 'super_admin')
  or store_id = public.current_app_store_id()
);

create policy employees_insert_scope on public.employees
for insert
to authenticated
with check (
  public.current_app_role() in ('admin', 'super_admin')
  or (
    public.current_app_role() in ('store_manager', 'manager')
    and store_id = public.current_app_store_id()
  )
);

create policy employees_update_admin_only on public.employees
for update
to authenticated
using (
  public.current_app_role() in ('admin', 'super_admin')
)
with check (
  public.current_app_role() in ('admin', 'super_admin')
);

create policy employees_delete_admin_only on public.employees
for delete
to authenticated
using (
  public.current_app_role() in ('admin', 'super_admin')
);

-- ATTENDANCE POLICIES
create policy attendance_select_scope on public.attendance
for select
to authenticated
using (
  public.current_app_role() in ('admin', 'super_admin')
  or exists (
    select 1
    from public.employees e
    where e.id = attendance.employee_id
      and e.store_id = public.current_app_store_id()
  )
);

create policy attendance_insert_scope on public.attendance
for insert
to authenticated
with check (
  public.current_app_role() in ('admin', 'super_admin')
  or (
    public.current_app_role() in ('store_manager', 'manager')
    and exists (
      select 1
      from public.employees e
      where e.id = attendance.employee_id
        and e.store_id = public.current_app_store_id()
    )
  )
);

create policy attendance_update_admin_only on public.attendance
for update
to authenticated
using (
  public.current_app_role() in ('admin', 'super_admin')
)
with check (
  public.current_app_role() in ('admin', 'super_admin')
);

create policy attendance_delete_admin_only on public.attendance
for delete
to authenticated
using (
  public.current_app_role() in ('admin', 'super_admin')
);
