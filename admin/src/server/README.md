# Directory Module: src/server
> Path: `/src/server`

## 1. Small Summary
Root directory for server-side logic, including database schema assets, maintenance scripts, and Supabase integration clients. It coordinates the interface between the React frontend and the Supabase backend.

## 2. Files Hierarchy
- `database/` -> SQL schema definitions, migrations, and mock data.
- `scripts/` -> Node.js maintenance scripts for applying schema updates and fixing data.
- `supabase/` -> Supabase client initializations and service-layer functions.

## 3. Functional Hierarchy
- `database/` (Schema & Data)
- `scripts/` (Execution/Maintenance)
  └── Uses SQL assets from `database/` to sync backend state.
- `supabase/` (Integration/API)
  └── Provides data interfaces used by `/src/pages` for business logic.

## 4. Use Cases Hierarchy
- **Use Case 1: Schema Management** -> Applying SQL updates to the Supabase instance via scripts.
- **Use Case 2: Data Integrity** -> Maintenance scripts for fixing constraints or updating RBAC roles.
- **Use Case 3: Backend Integration** -> Initializing Supabase clients for authentication and database operations.
- **Use Case 4: External Notifications** -> Integrating with third-party services like the WhatsApp Business API.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `database/` | SQL migrations, RLS policies, and comprehensive mock datasets for development. |
| `scripts/` | Automated DevOps tools for database maintenance, schema upgrades, and cache reloading. |
| `supabase/` | Centralized Supabase clients and helper services for auth, CRUD, and external API calls. |

## 6. Comprehensive Project Brief
The `src/server` directory acts as the backend bridge for the Aster application. It centralizes all logic related to data persistence, authentication orchestration, and system maintenance. By separating schema definitions in `database/`, execution logic in `scripts/`, and API clients in `supabase/`, it ensures a modular approach to managing the Supabase-powered backend, facilitating both automated migrations and high-level service abstractions for the frontend.
