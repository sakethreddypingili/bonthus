# Directory Module: database
> Path: `/src/server/database`

## 1. Small Summary
This directory manages the Supabase database infrastructure, including schema definitions, SQL migrations, Row Level Security (RLS) policies, and stored procedures (RPC functions) that power the Lenscare Admin backend.

## 2. Files Hierarchy
- `new_schema.sql`, `reset_schema.sql` -> Core schema definitions and full reset scripts.
- `attendance_rls.sql`, `fix_employees_rls.sql` -> Security rules for data access control.
- `add_employee_id_rpc.sql` -> Custom backend logic via Postgres functions.
- `upgrade_orders.sql`, `add_store_id_and_details.sql`, `fix_store_address.sql` -> Incremental schema migrations.
- `update_roles_stores.sql`, `fix_categories.sql` -> Data integrity and constraint management.
- `fix_employee_user_id.sql` -> Utility scripts for data reconciliation.

## 3. Functional Hierarchy
- **Auth & Logic Layer** (`add_employee_id_rpc.sql`) -> Custom RPC functions for login and user management.
- **Schema Layer** (`new_schema.sql`, `reset_schema.sql`) -> Table structures, relationships, and custom ID generation.
- **Security Layer** (`attendance_rls.sql`, `fix_employees_rls.sql`) -> RLS policies and role-based access helpers.
- **Migration Layer** (Remaining `.sql` files) -> Scripts for evolving the database structure over time.

## 4. Use Cases Hierarchy
- **Use Case 1: System Bootstrapping** -> Use `reset_schema.sql` to initialize the database environment.
- **Use Case 2: Secure Access Control** -> RLS scripts define what managers vs. staff can see and do.
- **Use Case 3: Feature Implementation** -> SQL scripts add fields for new features like attendance tracking or advanced order details.
- **Use Case 4: Data Maintenance** -> Scripts to link users to auth accounts or fix schema drift.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `add_employee_id_rpc.sql` | Provides `get_email_by_employee_id` function for custom login flows. |
| `add_must_reset_to_employees.sql` | Adds mandatory password reset tracking for new users. |
| `add_store_id_and_details.sql` | Extends orders and store tables with tax rates and contact info. |
| `attendance_rls.sql` | Implements scoped access for attendance tracking (managers vs. admins). |
| `fix_categories.sql` | Relaxes product category constraints for greater flexibility. |
| `fix_employee_user_id.sql` | Links existing employee records to Supabase auth users via email. |
| `fix_employees_rls.sql` | Enforces record-level visibility for users. |
| `fix_store_address.sql` | Adds address field to stores to match master schema specs. |
| `new_schema.sql` | Defines the standard table structures and basic RLS policies. |
| `reset_schema.sql` | Master script for a clean-slate database reconstruction. |
| `update_roles_stores.sql` | Sets strict check constraints on user roles and store locations. |
| `upgrade_orders.sql` | Adds advanced customer details and JSONB fields for orders. |

## 6. Comprehensive Project Brief
The database layer of the Lenscare Admin system is built on Supabase (Postgres). It leverages a custom text-based ID generation system (`gen_id`) for consistent referencing across tables like `customers` (LC-), `orders` (OD-), and `stores` (STR-). Security is paramount, with fine-grained Row Level Security (RLS) policies ensuring that store managers only access data relevant to their location, while super-admins maintain global oversight. This directory contains the "source of truth" for the database structure and security posture, coordinating closely with the Supabase client logic in `/src/server/supabase`.
