# Directory Module: components/other
> Path: `/src/components/other`

## 1. Small Summary
This directory contains miscellaneous UI components that don't fit into charts, common navigation, or layouts. These are typically small, focused widgets used to enhance the dashboard experience.

## 2. Files Hierarchy
- `StatBox.jsx` -> A composite widget for displaying a single key performance indicator (KPI).

## 3. Functional Hierarchy
- Metric Widgets
  └── `StatBox` -> Combines an icon, primary value, subtitle, progress indicator, and growth metric.

## 4. Use Cases Hierarchy
- **Use Case 1: Dashboard KPIs** -> Display high-level metrics like Total Sales or New Customers.
- **Use Case 2: Performance Tracking** -> Visualize progress toward a goal using the embedded progress circle.
- **Use Case 3: Trend Analysis** -> Show percentage increases/decreases (e.g., "+14%") alongside base data.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `StatBox.jsx` | A standard card-style widget for highlighting specific business metrics. |

## 6. Comprehensive Project Brief
The Lenscare Admin system is a React single-page application that bootstraps in `src/index.js` and routes through `src/App.js`. Page components in `src/pages` render business workflows, and shared UI lives under `src/components`. All backend integration is centralized here: Supabase clients in `/src/server/supabase` provide authentication and data operations, scripts in `/src/server/scripts` execute SQL migrations or maintenance, and schema assets live in `/src/server/database`. This folder therefore acts as the UI building block library that pages and scenes reuse to enforce visual consistency and functional cohesion.
