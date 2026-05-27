# Modular Functional Reference: src/pages
> Path: `/src/pages`

This reference lists all explicitly named components and functions within the `src/pages/` directory, sorted alphabetically.

| Symbol Name | File Path | Type | Description |
| :--- | :--- | :--- | :--- |
| `addItem` | `CreateOrder.jsx` | Function | Adds a new empty item row to the order list. |
| `Analytics` | `Analytics.jsx` | Component (Default) | Main component for the global and store-specific analytics dashboard. |
| `Attendance` | `Attendance.jsx` | Component (Default) | Main component for staff registry and QR-based attendance tracking. |
| `closeDrawer` | `StoreManagement.jsx` | Function | Resets and closes the administrative side drawers. |
| `closeProductSearch` | `EditOrder.jsx` | Function | Closes the product search dropdown and clears layout state. |
| `confirmSignToggle` | `CreateOrder.jsx` | Function | Confirms the sign change for a power value in the prescription modal. |
| `CreateOrder` | `CreateOrder.jsx` | Component (Default) | Interface for creating new sales orders and eye prescriptions. |
| `CustomerProfile` | `CustomerProfile.jsx` | Component (Default) | Detailed view of a single customer's orders and medical history. |
| `Customers` | `Customers.jsx` | Component (Default) | List view for the customer database with search and filtering. |
| `CustomTooltip` | `Analytics.jsx` | Component | Customized tooltip for Recharts visualizations. |
| `CustomTooltip` | `Dashboard.jsx` | Component | Customized tooltip for Recharts visualizations. |
| `Dashboard` | `Dashboard.jsx` | Component (Default) | Real-time overview of business metrics and store activity. |
| `EditOrder` | `EditOrder.jsx` | Component (Default) | Interface for editing existing orders and associated prescriptions. |
| `fetchCategories` | `Products.jsx` | Function | Fetches product categories from the database. |
| `fetchChartData` | `Dashboard.jsx` | Function | Retrieves historical data for dashboard revenue and order charts. |
| `fetchChartsAndKPIs` | `Analytics.jsx` | Function | Fetches and processes data for analytics charts and KPI cards. |
| `fetchOrder` | `InvoiceView.jsx` | Function | Retrieves detailed order data for invoice rendering. |
| `fetchOrders` | `Orders.jsx` | Function | Fetches the list of orders with customer and item details. |
| `fetchOverviewStats` | `Dashboard.jsx` | Function | Calculates today's and historical performance metrics. |
| `fetchProducts` | `Products.jsx` | Function | Retrieves the master product list from the database. |
| `fetchProductStocks` | `StoreManagement.jsx` | Function | Fetches current stock levels for products across all stores. |
| `fetchRecentOrders` | `Dashboard.jsx` | Function | Retrieves a list of the most recent orders for display. |
| `fetchStores` | `Orders.jsx` | Function | Fetches the list of available store locations. |
| `fetchStores` | `StoreManagement.jsx` | Function | Retrieves store details and associated tax rates. |
| `fetchStoreSales` | `Analytics.jsx` | Function | Calculates revenue totals per store location. |
| `fetchStoreSales` | `Dashboard.jsx` | Function | Calculates revenue distribution across store locations. |
| `fetchTaxCategories` | `StoreManagement.jsx` | Function | Fetches product categories and their tax configurations. |
| `fetchTodayOrderHistory` | `Dashboard.jsx` | Function | Retrieves orders created within the current day. |
| `fetchTodayOrdersData` | `Dashboard.jsx` | Function | Fetches hourly order volume for today's chart. |
| `fetchTopCustomers` | `Dashboard.jsx` | Function | Identifies and ranks customers by total spend. |
| `fetchTopProducts` | `Analytics.jsx` | Function | Identifies top performing products and sales by category. |
| `fetchTopProducts` | `Dashboard.jsx` | Function | Identifies best-selling products and frame shapes. |
| `fetchUsers` | `StoreManagement.jsx` | Function | Retrieves the list of system users and their assigned roles. |
| `fetchVouchers` | `StoreManagement.jsx` | Function | Retrieves the list of active voucher codes. |
| `fetchYesterdayStatusData` | `Dashboard.jsx` | Function | Retrieves order status distribution for the previous day. |
| `formatCurrency` | `Dashboard.jsx` | Function | Formats numeric values into Indian Rupee currency strings. |
| `generatePowerSuggestions` | `CreateOrder.jsx` | Function | Generates optometric power value suggestions based on input. |
| `generateSecurePassword` | `Attendance.jsx` | Function | Creates a complex random password for new employee accounts. |
| `getCategoryLabel` | `Products.jsx` | Function | Normalizes category names for consistent display. |
| `getDefaultStoreId` | `Products.jsx` | Function | Determines the fallback store ID for product operations. |
| `handleAddPayment` | `CreateOrder.jsx` | Function | Adds a new payment entry to the order collection list. |
| `handleAddProduct` | `CreateOrder.jsx` | Function | Saves a new product entry to the database from the order screen. |
| `handleAddProduct` | `EditOrder.jsx` | Function | Adds a new product to the database during order editing. |
| `handleAddProduct` | `Products.jsx` | Function | Inserts a new product record into the inventory system. |
| `handleApplyVoucher` | `CreateOrder.jsx` | Function | Validates and applies a voucher discount to the order. |
| `handleCancelAddProduct` | `CreateOrder.jsx` | Function | Aborts the process of adding a new product to an order. |
| `handleCancelEdit` | `StoreManagement.jsx` | Function | Resets state and closes edit modals in store management. |
| `handleCopyLink` | `InvoiceView.jsx` | Function | Copies the current invoice URL to the system clipboard. |
| `handleCreateCategory` | `Products.jsx` | Function | Creates a new product category in the database. |
| `handleCreateEmployee` | `Attendance.jsx` | Function | Registers a new staff member and creates their auth account. |
| `handleCreateUser` | `StoreManagement.jsx` | Function | Provisions a new user account with role and store assignment. |
| `handleDestStoreChange` | `StoreManagement.jsx` | Function | Updates available categories when selecting a destination store for transfer. |
| `handleDisableOrder` | `EditOrder.jsx` | Function | Toggles the 'disabled' status of an order for archival purposes. |
| `handleDownload` | `InvoiceView.jsx` | Function | Generates and triggers the download of the invoice PDF. |
| `handleDrawerActionSelect` | `StoreManagement.jsx` | Function | Switches between different administrative management panels. |
| `handleEditCategory` | `Products.jsx` | Function | Initializes the category renaming and product reassignment state. |
| `handleEditProduct` | `Products.jsx` | Function | Loads a product's details into the edit modal state. |
| `handleEditTaxClick` | `StoreManagement.jsx` | Function | Opens the tax configuration modal for a specific category. |
| `handleFinalSave` | `CreateOrder.jsx` | Function | Executes the complete database transaction for a new order. |
| `handleGenerateQR` | `Attendance.jsx` | Function | Generates or retrieves the daily attendance QR code for a store. |
| `handleLogin` | `Login.jsx` | Function | Processes authentication via email, phone, or employee ID. |
| `handleLookupCustomer` | `Orders.jsx` | Function | Searches for a customer by mobile number before creating an order. |
| `handleOpenEditStore` | `StoreManagement.jsx` | Function | Loads store details into the editing state. |
| `handleOpenPrescription` | `CreateOrder.jsx` | Function | Initializes the prescription entry modal for an item. |
| `handlePowerBlur` | `CreateOrder.jsx` | Function | Formats and validates power values when focus is lost. |
| `handlePowerFocus` | `CreateOrder.jsx` | Function | Prepares layout and suggestions when a power field is focused. |
| `handlePowerInputChange` | `CreateOrder.jsx` | Function | Processes manual input and generates suggestions for lens powers. |
| `handleProductSearch` | `CreateOrder.jsx` | Function | Performs a real-time database search for items in the catalog. |
| `handleProductSearch` | `EditOrder.jsx` | Function | Searches for products to replace or add to an existing order. |
| `handleProductSearch` | `StoreManagement.jsx` | Function | Searches for products available for stock transfer. |
| `handleSave` | `Settings.jsx` | Function | Triggers a simulated save action for user preferences. |
| `handleSaveEdit` | `Orders.jsx` | Function | Updates basic order details (status, due amount) from the list view. |
| `handleSaveInvoice` | `CreateOrder.jsx` | Function | Validates order state and opens the payment collection modal. |
| `handleSavePrescription` | `CreateOrder.jsx` | Function | Saves temporary prescription data to the current order item. |
| `handleSaveProductEdit` | `Products.jsx` | Function | Persists updated product information to the database. |
| `handleSaveRename` | `Products.jsx` | Function | Saves a category name change and updates product links. |
| `handleSaveStore` | `StoreManagement.jsx` | Function | Creates or updates a store location record. |
| `handleSaveTax` | `StoreManagement.jsx` | Function | Updates GST percentages for a product category. |
| `handleSearch` | `Customers.jsx` | Function | Filters the customer list based on text input. |
| `handleSubmit` | `PasswordReset.jsx` | Function | Processes the password update and clears the reset flag. |
| `handleTransferStock` | `StoreManagement.jsx` | Function | Executes the movement of inventory quantity between store locations. |
| `handleUpdateOrder` | `EditOrder.jsx` | Function | Persists all changes to an existing order and its items. |
| `handleUpdateUser` | `StoreManagement.jsx` | Function | Updates user roles, status, and store assignments. |
| `handleWhatsApp` | `InvoiceView.jsx` | Function | Opens a pre-filled WhatsApp link with the invoice URL. |
| `handleWhatsAppApiSend` | `InvoiceView.jsx` | Function | Sends a templated invoice notification via WhatsApp Business API. |
| `InvoiceView` | `InvoiceView.jsx` | Component (Default) | Viewer for order details with PDF export and sharing tools. |
| `Login` | `Login.jsx` | Component (Default) | Admin and employee authentication portal. |
| `NoDataOverlay` | `Dashboard.jsx` | Component | Visual placeholder shown when chart data is empty. |
| `normalizePowerEyeKey` | `CreateOrder.jsx` | Function | Maps eye identifiers (re, le, adl_re, adl_le) to standard keys. |
| `normalizeStatus` | `Attendance.jsx` | Function | Ensures attendance status strings match expected values. |
| `Notifications` | `Notifications.jsx` | Component (Default) | Dashboard for viewing system-wide notifications and alerts. |
| `openAddCategory` | `Products.jsx` | Function | Resets and opens the category creation modal. |
| `openAddProduct` | `Products.jsx` | Function | Resets and opens the product creation modal. |
| `openProductSearch` | `EditOrder.jsx` | Function | Activates the product lookup interface for an order row. |
| `Orders` | `Orders.jsx` | Component (Default) | Comprehensive order management and tracking list. |
| `PasswordReset` | `PasswordReset.jsx` | Component (Default) | Enforced interface for changing passwords on first login. |
| `pickBestEyePower` | `EditOrder.jsx` | Function | Selects the most complete prescription record from a list. |
| `processQRCode` | `Attendance.jsx` | Function | Validates a scanned QR code and records attendance. |
| `Products` | `Products.jsx` | Component (Default) | Inventory and category management dashboard. |
| `Reminders` | `Reminders.jsx` | Component (Default) | Task and schedule tracking interface. |
| `removeItem` | `CreateOrder.jsx` | Function | Removes a specific item row from the order. |
| `removeItem` | `EditOrder.jsx` | Function | Deletes an item from an existing order's list. |
| `removePayment` | `CreateOrder.jsx` | Function | Removes a payment mode entry from the collection list. |
| `resolvePrescriptionEye` | `CreateOrder.jsx` | Function | Determines the correct eye object key for prescription updates. |
| `selectPowerValue` | `CreateOrder.jsx` | Function | Formats and assigns a selected suggestion to a power field. |
| `selectProduct` | `CreateOrder.jsx` | Function | Populates an order row with data from a selected product. |
| `selectProduct` | `EditOrder.jsx` | Function | Updates an order row with details from a selected catalog item. |
| `setFavicon` | `index.js` | Function | Dynamically updates the browser favicon. |
| `Settings` | `Settings.jsx` | Component (Default) | User preferences and store details configuration page. |
| `showNotification` | `StoreManagement.jsx` | Function | Displays a transient feedback toast with status info. |
| `startCamera` | `Attendance.jsx` | Function | Initializes the hardware camera and QR scanner. |
| `StatCard` | `Dashboard.jsx` | Component | Reusable card for displaying business metrics with trend info. |
| `statusBadge` | `Dashboard.jsx` | Function | Renders a styled badge component based on order status. |
| `stopCamera` | `Attendance.jsx` | Function | Releases camera hardware resources and stops scanning. |
| `StoreManagement` | `StoreManagement.jsx` | Component (Default) | High-level administrative workspace for users and locations. |
| `togglePowerSign` | `CreateOrder.jsx` | Function | Toggles between positive and negative signs for power input. |
| `togglePowerSign` | `EditOrder.jsx` | Function | Sets or clears the plus/minus sign for a lens power value. |
| `toggleSelectAll` | `Products.jsx` | Function | Toggles selection of all products in the filtered list. |
| `toggleSelectProduct` | `Products.jsx` | Function | Toggles individual product selection for bulk actions. |
| `updateDropdownLayout` | `EditOrder.jsx` | Function | Calculates positioning for search dropdowns to ensure visibility. |
| `updateItem` | `CreateOrder.jsx` | Function | Updates a specific field for a given order item. |
| `updatePayment` | `CreateOrder.jsx` | Function | Updates the details of a specific payment entry. |
| `waitForExportAssets` | `InvoiceView.jsx` | Function | Ensures all fonts and images are loaded before PDF capture. |
