# Modular Functional Reference: src/server/database

## SQL Functions and RPCs

### `current_app_role()`
- **Type**: SQL Function (Stable, Security Definer)
- **File**: `src/server/database/attendance_rls.sql`
- **Logic**: Retrieves the role of the current authenticated user from `public.users` using the email from the JWT.
- **Used In**: RLS Policies for access control.

### `current_app_store_id()`
- **Type**: SQL Function (Stable, Security Definer)
- **File**: `src/server/database/attendance_rls.sql`
- **Logic**: Retrieves the `store_id` of the current authenticated user from `public.users` using the email from the JWT.
- **Used In**: RLS Policies for store-scoped data access.

### `gen_id(prefix text, length integer)`
- **Type**: PLPGSQL Function
- **File**: `src/server/database/new_schema.sql`, `src/server/database/reset_schema.sql`
- **Logic**: Generates a custom text ID by appending a random sequence of numeric characters to a provided prefix (e.g., 'STR-', 'OD-').
- **Used In**: Default values for Primary Keys across all core tables.

### `get_auth_role()`
- **Type**: SQL Function (Stable, Security Definer)
- **File**: `src/server/database/reset_schema.sql`
- **Logic**: Simplified helper to get the role from `public.users` by matching the user's UUID.
- **Used In**: Master schema RLS policies.

### `get_email_by_employee_id(p_employee_id text)`
- **Type**: RPC (PLPGSQL Function)
- **File**: `src/server/database/add_employee_id_rpc.sql`
- **Logic**: Queries the `employees` table to find the email associated with a specific `employee_id`.
- **Used In**: Login workflows allowing employees to sign in using their unique IDs.

### `get_user_stores()`
- **Type**: SQL Function (Stable, Security Definer)
- **File**: `src/server/database/reset_schema.sql`
- **Logic**: Returns an array of store IDs that the current authenticated user is authorized to access, based on the `user_stores` junction table.
- **Used In**: RLS Policies for multi-store access support.

---

## Mock Data and Constants

### `allOrders`
- **Type**: Array
- **File**: `src/server/database/mocks/mockData.js`
- **Description**: Extended list of orders including recent and historical mock records.

### `allProducts`
- **Type**: Array
- **File**: `src/server/database/mocks/mockData.js`
- **Description**: Comprehensive list of mock products with stock levels, categories, and status.

### `categoryData`
- **Type**: Array
- **File**: `src/server/database/mocks/mockData.js`
- **Description**: Distribution data for product categories (Eyeglasses, Sunglasses, etc.), used in Pie charts.

### `customers`
- **Type**: Array
- **File**: `src/server/database/mocks/mockData.js`
- **Description**: Sample customer profiles including contact info, spending habits, and status (VIP, New).

### `geoFeatures`
- **Type**: Object (GeoJSON)
- **File**: `src/server/database/mocks/mockGeoFeatures.js`
- **Description**: Global geographic feature collection for rendering mapping visualizations.

### `recentOrders`
- **Type**: Array
- **File**: `src/server/database/mocks/mockData.js`
- **Description**: Small subset of orders for "Recent Activity" dashboard widgets.

### `revenueData`
- **Type**: Array
- **File**: `src/server/database/mocks/mockData.js`
- **Description**: Monthly revenue and order count data for the past 12 months.

### `ROLES_FOR_ADMIN`
- **Type**: Array
- **File**: `src/server/database/mocks/constants.js`
- **Description**: Selectable roles available for an Administrator to assign.

### `ROLES_FOR_SUPER_ADMIN`
- **Type**: Array
- **File**: `src/server/database/mocks/constants.js`
- **Description**: Selectable roles available for a Super Admin to assign.

### `STORE_LOCATIONS`
- **Type**: Array (String)
- **File**: `src/server/database/mocks/constants.js`
- **Description**: List of all valid store branches in Hyderabad and Andhra Pradesh.

### `topProducts`
- **Type**: Array
- **File**: `src/server/database/mocks/mockData.js`
- **Description**: Top-selling products ranked by sales volume and revenue trends.

### `USER_ROLES`
- **Type**: Array (Object)
- **File**: `src/server/database/mocks/constants.js`
- **Description**: Master list of system roles (`super_admin`, `admin`, `store_manager`, `employee`).

### `weeklyOrdersData`
- **Type**: Array
- **File**: `src/server/database/mocks/mockData.js`
- **Description**: Daily order volume for the current week.
