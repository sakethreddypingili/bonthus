# Directory Module: geography
> Path: `/src/scenes/geography`

## 1. Small Summary
This scene renders a geographic choropleth map using mock data. It is a legacy analytics demo for geographic visualization.

## 2. Files Hierarchy
- `index.jsx` -> Geography scene component.

## 3. Functional Hierarchy
- `Geography` (entry)
  └── renders `GeographyChart` with scene layout

## 4. Use Cases Hierarchy
- **Use Case 1: Geo Analytics Demo** -> Shows map-based distribution visuals.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `index.jsx` | Scene wrapper for choropleth map demo. |

## 6. Comprehensive Project Brief
The Lenscare Admin system is a React single-page application that bootstraps in `src/index.js` and routes through `src/App.js`. Page components in `src/pages` render business workflows, and shared UI lives under `src/components`. All backend integration is centralized here: Supabase clients in `/src/server/supabase` provide authentication and data operations, scripts in `/src/server/scripts` execute SQL migrations or maintenance, and schema assets live in `/src/server/database`. This folder provides a legacy geographic visualization scene used for analytics UI reference.
