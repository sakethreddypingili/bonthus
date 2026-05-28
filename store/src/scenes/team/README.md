# Directory Module: team
> Path: `/src/scenes/team`

## 1. Small Summary
This scene renders a team list table using mock datasets. It provides a legacy demo for staff listing layouts.

## 2. Files Hierarchy
- `index.jsx` -> Team scene component.

## 3. Functional Hierarchy
- `Team` (entry)
  └── renders a data grid with mock team data

## 4. Use Cases Hierarchy
- **Use Case 1: Team List Demo** -> Displays team members in a tabular layout.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `index.jsx` | Scene wrapper for team list demo. |

## 6. Comprehensive Project Brief
The Lenscare Admin system is a React single-page application that bootstraps in `src/index.js` and routes through `src/App.js`. Page components in `src/pages` render business workflows, and shared UI lives under `src/components`. All backend integration is centralized here: Supabase clients in `/src/server/supabase` provide authentication and data operations, scripts in `/src/server/scripts` execute SQL migrations or maintenance, and schema assets live in `/src/server/database`. This folder provides a legacy team list template for UI reference.
