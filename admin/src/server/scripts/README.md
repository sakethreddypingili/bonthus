# Directory Module: src/server/scripts
> Path: `/src/server/scripts`

## 1. Small Summary
Collection of Node.js utility scripts designed to perform database maintenance, schema migrations, and role updates directly via the Supabase PG-Meta API and Service Role permissions.

## 2. Files Hierarchy
- `apply_db_schema.js` -> Updates orders schema and reloads PostgREST cache.
- `run_fix_categories.js` -> Utility to remove strict category constraints from product tables.
- `run_role_update.js` -> Applies role and store configuration updates.
- `upgrade_db.js` -> General purpose database upgrade script for executing migration SQL.

## 3. Functional Hierarchy
- Maintenance Scripts
  ├── `apply_db_schema.js` (Schema + Cache Invalidation)
  ├── `upgrade_db.js` (General SQL Execution)
  ├── `run_role_update.js` (RBAC Logic Update)
  └── `run_fix_categories.js` (Constraint Fixing/Hotfix)

## 4. Use Cases Hierarchy
- **Use Case 1: Database Migration** -> Using `upgrade_db.js` or `apply_db_schema.js` to push new SQL logic to the database.
- **Use Case 2: Cache Invalidation** -> `apply_db_schema.js` notifies PostgREST to reload schema cache after changes.
- **Use Case 3: Role Management** -> `run_role_update.js` ensures the system's role-based access control (RBAC) is up to date.
- **Use Case 4: Data Constraint Adjustment** -> `run_fix_categories.js` allows for flexible product categorization by dropping old constraints.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `apply_db_schema.js` | Executes `upgrade_orders.sql` and reloads the schema cache via NOTIFY. |
| `run_fix_categories.js` | Drops legacy category check constraints on `products` and `online_products` tables. |
| `run_role_update.js` | Executes `update_roles_stores.sql` to sync the latest RBAC and store logic. |
| `upgrade_db.js` | Wrapper to execute specific upgrade SQL files against the database using PG-Meta. |

## 6. Comprehensive Project Brief
The `scripts/` folder provides a set of DevOps tools for the Aster project. These scripts leverage the Supabase Service Role key to perform high-privilege operations that are not possible via the standard REST API. They automate the process of keeping the local development environment or production database in sync with the latest schema definitions found in `src/server/database`, ensuring consistent data structures and access policies across all environments.
