# Modular Functional Reference: src/server logic (scripts & supabase)

## Maintenance Scripts

### `runSql()`
- **Type**: Async Function
- **File**: `src/server/scripts/apply_db_schema.js`
- **Logic**: Reads `upgrade_orders.sql`, appends a schema reload notification, and executes it via Supabase PG-Meta API.
- **Used In**: CLI-based database schema updates.

### `upgrade()`
- **Type**: Async Function
- **File**: `src/server/scripts/run_fix_categories.js`
- **Logic**: Attempts to drop category check constraints on products tables. Currently acts as a logger for manual SQL execution instructions.
- **Used In**: Manual database maintenance.

### `upgrade()` (Roles)
- **Type**: Async Function
- **File**: `src/server/scripts/run_role_update.js`
- **Logic**: Executes `update_roles_stores.sql` via Supabase PG-Meta API to update RBAC logic.
- **Used In**: CLI-based RBAC updates.

### `upgrade()` (General)
- **Type**: Async Function
- **File**: `src/server/scripts/upgrade_db.js`
- **Logic**: Executes `upgrade_orders.sql` via Supabase PG-Meta API for general database migrations.
- **Used In**: CLI-based database upgrades.

---

## Supabase Utilities

### `deleteUser(userId)`
- **Type**: Exported Arrow Constant (Async)
- **File**: `src/server/supabase/supabaseService.js`
- **Logic**: Deletes a record from the `user_data` table for the specified `userId`.
- **Used In**: Admin user management workflows.

### `generateId(prefix, digits)`
- **Type**: Exported Arrow Constant
- **File**: `src/server/supabase/idGenerator.js`
- **Logic**: Generates a random numeric ID of specified length, prepended with the given prefix.
- **Used In**: Frontend and backend entity creation (Orders, Stores, etc.).

### `getCurrentUser()`
- **Type**: Exported Arrow Constant (Async)
- **File**: `src/server/supabase/supabaseService.js`
- **Logic**: Retrieves the currently authenticated user from Supabase Auth.
- **Used In**: Session verification and profile loading.

### `getUserById(userId)`
- **Type**: Exported Arrow Constant (Async)
- **File**: `src/server/supabase/supabaseService.js`
- **Logic**: Fetches a single user record from `user_data` matching the provided ID.
- **Used In**: User profile editing and viewing.

### `getUserData()`
- **Type**: Exported Arrow Constant (Async)
- **File**: `src/server/supabase/supabaseService.js`
- **Logic**: Fetches all records from the `user_data` table.
- **Used In**: User listing screens.

### `ID_RULES`
- **Type**: Exported Constant (Object)
- **File**: `src/server/supabase/idGenerator.js`
- **Description**: Configuration object defining prefixes and lengths for various entity types (AUTH_USERS, STORE, VOUCHER, etc.).
- **Used In**: Standardizing ID generation across the app.

### `sendWhatsAppInvoice(params)`
- **Type**: Exported Async Function
- **File**: `src/server/supabase/whatsappApi.js`
- **Logic**: Sends a template-based WhatsApp message using the Facebook Graph API (v19.0).
- **Used In**: Automated invoice delivery and customer notifications.

### `signIn(email, password)`
- **Type**: Exported Arrow Constant (Async)
- **File**: `src/server/supabase/supabaseService.js`
- **Logic**: Authenticates a user using email and password via Supabase Auth.
- **Used In**: Login page.

### `signOut()`
- **Type**: Exported Arrow Constant (Async)
- **File**: `src/server/supabase/supabaseService.js`
- **Logic**: Terminates the current Supabase Auth session.
- **Used In**: User logout functionality.

### `subscribeToUserChanges(callback)`
- **Type**: Exported Arrow Constant
- **File**: `src/server/supabase/supabaseService.js`
- **Logic**: Sets up a real-time Postgres subscription for all changes on the `user_data` table.
- **Used In**: Live-updating UI for user management.

### `supabase`
- **Type**: Exported Constant (Supabase Client)
- **File**: `src/server/supabase/supabase.js`
- **Description**: Standard Supabase client initialized with Anon Key for frontend-safe operations.
- **Used In**: All client-side data fetching and auth.

### `supabaseAdmin`
- **Type**: Exported Constant (Supabase Client)
- **File**: `src/server/supabase/supabaseAdmin.js`
- **Description**: High-privilege Supabase client initialized with Service Role Key (Security Warning: Avoid frontend exposure).
- **Used In**: Backend scripts and administrative tasks bypassing RLS.

### `unsubscribe(subscription)`
- **Type**: Exported Arrow Constant
- **File**: `src/server/supabase/supabaseService.js`
- **Logic**: Removes a specific real-time channel subscription.
- **Used In**: Component cleanup for real-time listeners.

### `updateUser(userId, updates)`
- **Type**: Exported Arrow Constant (Async)
- **File**: `src/server/supabase/supabaseService.js`
- **Logic**: Updates a record in the `user_data` table and returns the updated record.
- **Used In**: User profile editing.
