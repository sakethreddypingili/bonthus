# Directory Module: database/mocks
> Path: `/src/server/database/mocks`

## 1. Small Summary
This directory provides a comprehensive set of mock data and system constants used for frontend prototyping, dashboard visualizations, and geographic mapping within the Lenscare Admin application.

## 2. Files Hierarchy
- `constants.js` -> System-wide static definitions for roles and locations.
- `mockData.js` -> Sample datasets for revenue, orders, products, and customers.
- `mockGeoFeatures.js` -> GeoJSON data for rendering geographic charts and maps.

## 3. Functional Hierarchy
- **Configuration Layer** (`constants.js`) -> Exports standard arrays for store locations and user role permissions.
- **Data Layer** (`mockData.js`) -> Supplies structured objects for analytics (Line charts, Pie charts) and data grids.
- **Visual Layer** (`mockGeoFeatures.js`) -> Provides spatial data for the Geography Chart component.

## 4. Use Cases Hierarchy
- **Use Case 1: UI Prototyping** -> Render dashboard screens without requiring a live Supabase connection.
- **Use Case 2: Chart Development** -> Use `revenueData` and `categoryData` to verify analytics visualizations.
- **Use Case 3: Form Configuration** -> Populate dropdowns for roles and store locations using `USER_ROLES` and `STORE_LOCATIONS`.
- **Use Case 4: Global Mapping** -> Visualize data density across countries using `geoFeatures`.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `constants.js` | Defines valid store locations, user roles, and role-based hierarchies for UI selection. |
| `mockData.js` | Contains mock datasets for revenue trends, category distributions, recent orders, and customer lists. |
| `mockGeoFeatures.js` | Holds a large GeoJSON FeatureCollection for rendering the global geography chart. |

## 6. Comprehensive Project Brief
The `mocks` folder is essential for the Lenscare Admin's "offline-first" development and testing workflow. By providing high-fidelity sample data that mirrors the expected database schema, it allows developers to build and refine complex UI components (like the Nivo-based charts in `/src/components/charts`) in isolation. This ensures that the application remains visually functional and stylistically consistent even during backend maintenance or schema migrations.
