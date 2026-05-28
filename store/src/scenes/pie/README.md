# Directory Module: pie
> Path: `/src/scenes/pie`

## 1. Small Summary
This scene renders a pie chart demo view using shared chart components. It is used as a legacy analytics visualization example.

## 2. Files Hierarchy
- `index.jsx` -> Pie chart scene component.

## 3. Functional Hierarchy
- `Pie` (entry)
  └── renders `PieChart` with scene layout

## 4. Use Cases Hierarchy
- **Use Case 1: Pie Chart Demo** -> Displays pie chart visualization in a standalone scene.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `index.jsx` | Scene wrapper that renders pie chart demo content. |

## 6. Comprehensive Project Brief
The Lenscare Admin system is a React single-page application that bootstraps in `src/index.js` and routes through `src/App.js`. Page components in `src/pages` render business workflows, and shared UI lives under `src/components`. All backend integration is centralized here: Supabase clients in `/src/server/supabase` provide authentication and data operations, scripts in `/src/server/scripts` execute SQL migrations or maintenance, and schema assets live in `/src/server/database`. This folder provides a legacy chart scene that demonstrates how pie chart components can be composed into a full page.
