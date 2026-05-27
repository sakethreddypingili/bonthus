# Directory Module: src/server/supabase
> Path: `/src/server/supabase`

## 1. Small Summary
Integration layer for Supabase services, providing clients for standard user operations, administrative tasks, and specialized utilities like ID generation and WhatsApp notifications.

## 2. Files Hierarchy
- `supabase.js` -> Main client for authenticated user operations and public data access.
- `supabaseAdmin.js` -> Service-role client for high-privilege operations bypassing RLS.
- `supabaseService.js` -> Modular service layer for user management and real-time synchronization.
- `idGenerator.js` -> Utility for generating branded, prefixed unique identifiers (e.g., STR-, OD-).
- `whatsappApi.js` -> Integration with WhatsApp Business API for automated customer messaging.

## 3. Functional Hierarchy
- Clients
  ├── `supabase.js` (Authenticated User Context)
  └── `supabaseAdmin.js` (Admin/Service Role Context)
- Services
  ├── `supabaseService.js` (User & Data CRUD abstractions)
  ├── `idGenerator.js` (Standardized ID logic)
  └── `whatsappApi.js` (External messaging integration)

## 4. Use Cases Hierarchy
- **Use Case 1: Client Authentication** -> `supabase.js` handles user sign-in, sign-out, and session management.
- **Use Case 2: Admin Operations** -> `supabaseAdmin.js` manages users and data for administrative workflows.
- **Use Case 3: Data CRUD** -> `supabaseService.js` provides easy-to-use functions for common database tasks.
- **Use Case 4: ID Standardization** -> `idGenerator.js` ensures all entities (orders, stores, etc.) have consistent ID formats.
- **Use Case 5: Customer Communication** -> `whatsappApi.js` triggers template-based messages for invoices and alerts.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `supabase.js` | Initializes the standard Supabase client for frontend authenticated sessions. |
| `supabaseAdmin.js` | Initializes the admin client for service-level operations (Security Warning included). |
| `supabaseService.js` | Exports reusable functions for user profile management and real-time subscriptions. |
| `idGenerator.js` | Logic and configuration for generating IDs with specific business prefixes. |
| `whatsappApi.js` | Sends template-based WhatsApp messages via the Facebook Graph API. |

## 6. Comprehensive Project Brief
The `supabase/` directory encapsulates the connectivity logic between the Aster React application and its backend. It provides a clean API surface for the frontend to perform authentication, real-time data synchronization, and administrative workflows. While `supabase.js` handles standard user interactions, `supabaseAdmin.js` and `supabaseService.js` offer powerful tools for system management. Additionally, utility modules like `idGenerator.js` and `whatsappApi.js` extend the core functionality to support business-specific requirements like standardized ID formats and automated customer notifications.
