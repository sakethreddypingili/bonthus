# Directory Module: global
> Path: `/src/scenes/global`

## 1. Small Summary
This folder contains legacy sidebar and topbar components used by the old dashboard scenes. These components demonstrate an earlier layout system distinct from the main app navigation.

## 2. Files Hierarchy
- `Sidebar.jsx` -> Legacy sidebar navigation for scenes.
- `Topbar.jsx` -> Legacy topbar header for scenes.

## 3. Functional Hierarchy
- `Sidebar` (entry)
  └── renders nav items and selection state for scene demos
- `Topbar` (entry)
  └── renders search/actions for legacy dashboard

## 4. Use Cases Hierarchy
- **Use Case 1: Legacy Navigation Demo** -> Provides sidebar/topbar for scene-based templates.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `Sidebar.jsx` | Legacy navigation sidebar for scene demos. |
| `Topbar.jsx` | Legacy topbar used in scene dashboard layouts. |

## 6. Comprehensive Project Brief
The Lenscare Admin system is a React single-page application that bootstraps in `src/index.js` and routes through `src/App.js`. Page components in `src/pages` render business workflows, and shared UI lives under `src/components`. All backend integration is centralized here: Supabase clients in `/src/server/supabase` provide authentication and data operations, scripts in `/src/server/scripts` execute SQL migrations or maintenance, and schema assets live in `/src/server/database`. This folder provides the legacy navigation layer for the scene templates.
