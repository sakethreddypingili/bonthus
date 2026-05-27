# Directory Module: components
> Path: `/src/components`

## 1. Small Summary
This folder contains reusable UI components grouped by purpose (charts, common navigation, layout templates, and misc widgets). These components are consumed across page-level screens to build consistent UI patterns and maintain a modular architecture.

## 2. Files Hierarchy
- `charts/` -> Data visualization components (bar, line, pie, geography, progress).
- `common/` -> Shared navigation and layout elements (header, topbar, sidebars).
- `layout/` -> Invoice layout templates for screen and PDF rendering.
- `other/` -> Utility UI elements such as stat cards and KPI widgets.

## 3. Functional Hierarchy
- Page Composition
  └── import components from `components/`
      ├── `common/` for navigation and headers
      ├── `charts/` for analytics visualizations
      ├── `layout/` for invoice rendering
      └── `other/` for metrics and stat widgets

## 4. Use Cases Hierarchy
- **Use Case 1: Admin Navigation** -> Pages embed topbars, headers, and sidebars for application shell.
- **Use Case 2: Analytics Visualization** -> Dashboards and analytics pages render charts for data-driven insights.
- **Use Case 3: Invoice Rendering** -> Order management and invoice views build printable and digital layouts.
- **Use Case 4: KPI Display** -> Dashboard widgets summarize business metrics using stat boxes.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `charts/` | Visualization components for dashboards and analytics screens. |
| `common/` | Shared navigation, header, and core layout utilities. |
| `layout/` | Invoice templates optimized for screen and PDF output. |
| `other/` | Miscellaneous UI widgets such as stat boxes and metric cards. |

## 6. Comprehensive Project Brief
The Lenscare Admin system is a React single-page application that bootstraps in `src/index.js` and routes through `src/App.js`. Page components in `src/pages` render business workflows, and shared UI lives under `src/components`. All backend integration is centralized here: Supabase clients in `/src/server/supabase` provide authentication and data operations, scripts in `/src/server/scripts` execute SQL migrations or maintenance, and schema assets live in `/src/server/database`. This folder therefore acts as the UI building block library that pages and scenes reuse to enforce visual consistency and functional cohesion.
