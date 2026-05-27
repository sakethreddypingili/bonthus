# Directory Module: src
> Path: `/src`

## 1. Small Summary
This is the root source directory for the Lenscare Admin application. It contains the application's entry point, global routing, theme configuration, and the primary building blocks of the system organized into modular subdirectories (components, pages, server, utils).

## 2. Files Hierarchy
- `App.js` -> Main application component with global routing and authentication state.
- `index.js` -> Application entry point where React is bootstrapped into the DOM.
- `theme.js` -> Material UI theme configuration and brand color definitions.
- `index.css` -> Global Tailwind CSS imports and utility styles.
- `components/` -> Reusable UI building blocks (charts, common layout, misc).
- `pages/` -> Screen-level components defining business workflows.
- `scenes/` -> Older or specialized view components (historical or Mapped UI).
- `server/` -> Backend integration layer (Supabase, database schemas, scripts).
- `utils/` -> Shared utility functions and security guidelines.

## 3. Functional Hierarchy
- Application Bootstrapping
  └── `index.js`
      └── `App.js` (State & Routing)
          ├── `components/` (UI Blocks)
          ├── `pages/` (Workflows)
          ├── `server/` (Data layer)
          └── `utils/` (Logic helpers)

## 4. Use Cases Hierarchy
- **Use Case 1: Application Setup** -> Bootstrapping the React system and applying global styles (`index.js`, `index.css`).
- **Use Case 2: User Access** -> Handling login sessions and role-based routing (`App.js`).
- **Use Case 3: Brand Identity** -> Defining the visual style and Material UI tokens (`theme.js`).
- **Use Case 4: Modular Logic** -> Distributing responsibility across specialized subfolders (`components/`, `pages/`, etc.).

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `App.js` | Orchestrates the entire application layout, global state, and route protection. |
| `index.js` | Initializes the React application, sets the document title, and applies the root element. |
| `theme.js` | Centralizes the brand palette and UI component styling rules via Material UI. |
| `index.css` | Manages global CSS variables and imports Tailwind's utility framework. |
| `components/` | Shared UI library used by all page-level screens. |
| `pages/` | Primary functional areas of the system (Orders, Products, Analytics, etc.). |
| `server/` | Infrastructure for data persistence, authentication, and database management. |
| `utils/` | Utility scripts and documentation for system-wide logic and standards. |

## 6. Comprehensive Project Brief
The Lenscare Admin system is a comprehensive React-based single-page application designed for retail optical management. The `/src` directory implements a modern, modular architecture where UI is separated from backend logic and routing. The application uses Supabase for its backend-as-a-service, providing real-time data synchronization and secure authentication. The system handles complex workflows including sales invoicing, prescription tracking, inventory management, and multi-store analytics. This root directory serves as the hub that connects these various modules into a cohesive, performant management system.
