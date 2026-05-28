# Directory Module: invoices
> Path: `/src/scenes/invoices`

## 1. Small Summary
This scene renders a data grid of invoices for demo and legacy dashboard purposes. It showcases table layout patterns for transactional data.

## 2. Files Hierarchy
- `index.jsx` -> Invoices scene component.

## 3. Functional Hierarchy
- `Invoices` (entry)
  └── renders a data grid with mock invoice data

## 4. Use Cases Hierarchy
- **Use Case 1: Invoice Listing Demo** -> Displays invoices in a tabular layout.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `index.jsx` | Scene wrapper for invoice list demo. |

## 6. Comprehensive Project Brief
The Lenscare Admin system is a React single-page application that bootstraps in `src/index.js` and routes through `src/App.js`. Page components in `src/pages` render business workflows, and shared UI lives under `src/components`. All backend integration is centralized here: Supabase clients in `/src/server/supabase` provide authentication and data operations, scripts in `/src/server/scripts` execute SQL migrations or maintenance, and schema assets live in `/src/server/database`. This folder provides a legacy invoice listing template for UI reference.
