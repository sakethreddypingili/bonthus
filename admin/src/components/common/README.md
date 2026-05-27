# Directory Module: components/common
> Path: `/src/components/common`

## 1. Small Summary
This directory contains core navigation and structural UI components that provide the primary interface shell for the application. It includes sidebars for different workspace contexts, the global topbar, and shared page headers.

## 2. Files Hierarchy
- `BoardSidebar.jsx` -> Specialized sidebar for the "Board" (Reminders/Notifications) workspace.
- `Header.jsx` -> Standardized page title and subtitle component.
- `Sidebar.jsx` -> Main application navigation sidebar with role-based access.
- `Topbar.jsx` -> Global header containing search, notifications, and profile management.

## 3. Functional Hierarchy
- Navigation Shell
  ├── `Topbar` -> Global state for profile, search, and notification toggles.
  ├── `Sidebar` -> Primary routing hub with support for collapsed/expanded states.
  └── `BoardSidebar` -> Contextual navigation for operations-focused tasks.
- Content Elements
  └── `Header` -> Consistent visual styling for page entry points.

## 4. Use Cases Hierarchy
- **Use Case 1: App Navigation** -> `Sidebar` provides the main entry points to all modules.
- **Use Case 2: Identity & Profile** -> `Topbar` displays user identity and allows sign-out.
- **Use Case 3: Contextual Operations** -> `BoardSidebar` organizes reminders and alerts.
- **Use Case 4: Page Branding** -> `Header` labels every screen with a title and description.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `BoardSidebar.jsx` | Secondary navigation for Reminders and Notifications modules. |
| `Header.jsx` | Reusable title/subtitle block for consistent page headings. |
| `Sidebar.jsx` | Main navigation menu with role-based filtering and collapse logic. |
| `Topbar.jsx` | Global top navigation bar with search, alerts, and user settings. |

## 6. Comprehensive Project Brief
The Lenscare Admin system is a React single-page application that bootstraps in `src/index.js` and routes through `src/App.js`. Page components in `src/pages` render business workflows, and shared UI lives under `src/components`. All backend integration is centralized here: Supabase clients in `/src/server/supabase` provide authentication and data operations, scripts in `/src/server/scripts` execute SQL migrations or maintenance, and schema assets live in `/src/server/database`. This folder therefore acts as the UI building block library that pages and scenes reuse to enforce visual consistency and functional cohesion.
