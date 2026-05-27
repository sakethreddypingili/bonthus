# Directory Module: scenes
> Path: `/src/scenes`

## 1. Small Summary
This directory contains legacy dashboard scene components that power demo or template screens. These are typically used for analytics examples and internal UI exploration.

## 2. Files Hierarchy
- `bar/` -> Bar chart scene.
- `calendar/` -> Calendar scene.
- `contacts/` -> Contacts table scene.
- `dashboard/` -> Full dashboard scene.
- `faq/` -> FAQ scene.
- `form/` -> Form scene.
- `geography/` -> Geographic chart scene.
- `global/` -> Legacy sidebar/topbar components.
- `invoices/` -> Invoice list scene.
- `line/` -> Line chart scene.
- `pie/` -> Pie chart scene.
- `team/` -> Team table scene.

## 3. Functional Hierarchy
- Scene component (entry)
  └── renders chart/table/form UI for demo dashboards
      └── uses shared chart and layout components

## 4. Use Cases Hierarchy
- **Use Case 1: UI Templates** -> Demonstrates chart and layout patterns.
- **Use Case 2: Demo Dashboards** -> Supplies prebuilt layouts for analytics.
- **Use Case 3: Legacy Screens** -> Retains earlier dashboard implementations.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `bar/` | Bar chart demo scene. |
| `calendar/` | Calendar and event interaction demo. |
| `contacts/` | Contact list data grid demo. |
| `dashboard/` | Full dashboard layout demo. |
| `faq/` | Frequently asked questions UI. |
| `form/` | Input form demo. |
| `geography/` | Choropleth map demo. |
| `global/` | Legacy sidebar/topbar UI components. |
| `invoices/` | Invoice data grid demo. |
| `line/` | Line chart demo. |
| `pie/` | Pie chart demo. |
| `team/` | Team list data grid demo. |

## 6. Comprehensive Project Brief
The Lenscare Admin system is a React single-page application that bootstraps in `src/index.js` and routes through `src/App.js`. Page components in `src/pages` render business workflows, and shared UI lives under `src/components`. All backend integration is centralized here: Supabase clients in `/src/server/supabase` provide authentication and data operations, scripts in `/src/server/scripts` execute SQL migrations or maintenance, and schema assets live in `/src/server/database`. This folder preserves legacy dashboard scenes that can be reused for demos or future feature work.
