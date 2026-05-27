# Directory Module: pages
> Path: `/src/pages`

## 1. Small Summary
This directory contains the primary page components of the Aster application. These components define the core business logic and user interface for various administrative and operational tasks, including analytics, attendance tracking, order management, customer profiles, inventory control, and store settings.

## 2. Files Hierarchy
- `Analytics.jsx` -> Data analysis and visualization for store performance.
- `Attendance.jsx` -> Staff attendance management with QR code tracking.
- `CreateOrder.jsx` -> UI for creating new sales invoices and prescriptions.
- `CustomerProfile.jsx` -> Detailed view of customer history and eye power records.
- `Customers.jsx` -> List and search interface for the customer database.
- `Dashboard.jsx` -> Overview of key business metrics and recent activity.
- `EditOrder.jsx` -> Interface for modifying existing orders and prescriptions.
- `InvoiceView.jsx` -> Specialized view for rendering, sharing, and exporting invoices.
- `Login.jsx` -> Authentication portal for admin and employee access.
- `Notifications.jsx` -> Page for viewing system alerts and updates.
- `Orders.jsx` -> Order management and tracking interface.
- `PasswordReset.jsx` -> Mandatory security setup for new users.
- `Products.jsx` -> Inventory management and product catalog control.
- `Reminders.jsx` -> Task and schedule management interface.
- `Settings.jsx` -> User and store configuration preferences.
- `StoreManagement.jsx` -> Administrative tools for users, stores, and stock transfers.

## 3. Functional Hierarchy
- Page Routing
  └── `App.js` routes to `pages/`
      ├── Operational Pages: `CreateOrder`, `EditOrder`, `Orders`, `Attendance`
      ├── Information Pages: `Analytics`, `Dashboard`, `CustomerProfile`, `Customers`
      ├── Management Pages: `Products`, `StoreManagement`, `Settings`
      └── System Pages: `Login`, `PasswordReset`, `Notifications`, `Reminders`, `InvoiceView`

## 4. Use Cases Hierarchy
- **Use Case 1: Sales Operations** -> Creating and managing orders, generating invoices (`CreateOrder`, `EditOrder`, `Orders`, `InvoiceView`).
- **Use Case 2: Inventory Control** -> Managing product lists, categories, and stock transfers (`Products`, `StoreManagement`).
- **Use Case 3: Customer Management** -> Maintaining customer data and eye power history (`Customers`, `CustomerProfile`).
- **Use Case 4: Performance Monitoring** -> Reviewing business health via dashboard and analytics (`Dashboard`, `Analytics`).
- **Use Case 5: Staff Operations** -> Tracking attendance and managing tasks (`Attendance`, `Reminders`).
- **Use Case 6: Administration** -> Managing system users, store locations, and settings (`StoreManagement`, `Settings`).

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `Analytics.jsx` | Performance analysis across stores with revenue and product trends. |
| `Attendance.jsx` | Staff registry and daily attendance tracking using QR codes and scanner. |
| `CreateOrder.jsx` | Workflow for recording patient info, product selection, and prescription details. |
| `CustomerProfile.jsx` | Comprehensive view of a single customer's orders and medical history. |
| `Customers.jsx` | Central database for searching and filtering customer information. |
| `Dashboard.jsx` | Real-time metrics overview with today's sales and order status. |
| `EditOrder.jsx` | Management interface for updating order status, amounts, and lens powers. |
| `InvoiceView.jsx` | Digital and printable invoice rendering with WhatsApp sharing integration. |
| `Login.jsx` | Entry point for authorized access using email, phone, or employee ID. |
| `Notifications.jsx` | Centralized alert system for store-wide activity updates. |
| `Orders.jsx` | Master list for tracking and filtering sales records across time and status. |
| `PasswordReset.jsx` | Security enforcement for first-time login and user account protection. |
| `Products.jsx` | SKU management, category organization, and stock monitoring. |
| `Reminders.jsx` | Schedule management for administrative and follow-up tasks. |
| `Settings.jsx` | Personal and store-level configuration for notifications and appearance. |
| `StoreManagement.jsx` | High-level admin tools for user roles, store locations, and stock transfers. |

## 6. Comprehensive Project Brief
The pages in `/src/pages` represent the functional core of the Aster application. Each page component integrates UI from `/src/components`, business logic from the component level, and data persistence via `/src/server`. The architecture prioritizes role-based access control, where super admins, admins, and employees see customized views appropriate to their permissions. Key patterns include heavy use of React hooks (`useState`, `useEffect`, `useCallback`) for state management and direct integration with Supabase for real-time data operations. This directory serves as the implementation layer for all user-facing business workflows in the Lenscare Admin system.
