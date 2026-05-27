# Directory Module: contacts
> Path: `/src/scenes/contacts`

## 1. Small Summary
This scene renders a contacts data grid using mock datasets. It demonstrates table layouts and filtering for user directories.

## 2. Files Hierarchy
- `index.jsx` -> Contacts scene component.

## 3. Functional Hierarchy
- `Contacts` (entry)
  └── renders a data grid with mock contact records

## 4. Use Cases Hierarchy
- **Use Case 1: Contacts Demo** -> Displays a table of contact records for UI templates.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `index.jsx` | Scene wrapper for contacts data grid demo. |

## 6. Comprehensive Project Brief
The Lenscare Admin system is a React single-page application that bootstraps in `src/index.js` and routes through `src/App.js`. Page components in `src/pages` render business workflows, and shared UI lives under `src/components`. All backend integration is centralized here: Supabase clients in `/src/server/supabase` provide authentication and data operations, scripts in `/src/server/scripts` execute SQL migrations or maintenance, and schema assets live in `/src/server/database`. This folder provides a legacy table scene used to demonstrate contact listing layouts.
