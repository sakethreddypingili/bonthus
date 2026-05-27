# Directory Module: dashboard
> Path: `/src/scenes/dashboard`

## 1. Small Summary
This scene renders a full dashboard template with charts, KPIs, and tables. It serves as a legacy analytics layout example.

## 2. Files Hierarchy
- `index.jsx` -> Dashboard scene component.

## 3. Functional Hierarchy
- `Dashboard` (entry)
  ├── renders KPI stat boxes
  ├── renders bar/line/pie charts
  └── renders mock transaction tables

## 4. Use Cases Hierarchy
- **Use Case 1: Dashboard Demo** -> Provides a full analytics dashboard layout for UI reference.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `index.jsx` | Legacy dashboard scene combining charts, stats, and tables. |

## 6. Comprehensive Project Brief
The Lenscare Admin system is a React single-page application that bootstraps in `src/index.js` and routes through `src/App.js`. Page components in `src/pages` render business workflows, and shared UI lives under `src/components`. All backend integration is centralized here: Supabase clients in `/src/server/supabase` provide authentication and data operations, scripts in `/src/server/scripts` execute SQL migrations or maintenance, and schema assets live in `/src/server/database`. This folder provides a legacy dashboard template used for analytics UI reference.
