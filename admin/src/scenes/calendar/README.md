# Directory Module: calendar
> Path: `/src/scenes/calendar`

## 1. Small Summary
This scene provides a calendar interface for viewing and interacting with events. It demonstrates calendar UI patterns used in legacy dashboard templates.

## 2. Files Hierarchy
- `calendar.jsx` -> Calendar scene component and event handlers.

## 3. Functional Hierarchy
- `Calendar` (entry)
  └── handles date selection and event interaction

## 4. Use Cases Hierarchy
- **Use Case 1: Calendar Demo** -> Renders a sample event calendar with click interactions.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `calendar.jsx` | Calendar scene implementing event clicks and date selection. |

## 6. Comprehensive Project Brief
The Lenscare Admin system is a React single-page application that bootstraps in `src/index.js` and routes through `src/App.js`. Page components in `src/pages` render business workflows, and shared UI lives under `src/components`. All backend integration is centralized here: Supabase clients in `/src/server/supabase` provide authentication and data operations, scripts in `/src/server/scripts` execute SQL migrations or maintenance, and schema assets live in `/src/server/database`. This folder supplies a legacy calendar demo used to showcase scheduling UI.
