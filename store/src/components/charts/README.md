# Directory Module: components/charts
> Path: `/src/components/charts`

## 1. Small Summary
This directory contains specialized data visualization components built using the Nivo library. These charts are used throughout the application, particularly in the Analytics and Dashboard pages, to provide visual insights into business data.

## 2. Files Hierarchy
- `BarChart.jsx` -> Categorical data visualization.
- `GeographyChart.jsx` -> Global data distribution mapping.
- `LineChart.jsx` -> Temporal trends and series data.
- `PieChart.jsx` -> Proportional data breakdown.
- `ProgressCircle.jsx` -> Circular KPI achievement indicator.

## 3. Functional Hierarchy
- Components
  ├── `BarChart` -> Processes mock bar data for comparative analysis.
  ├── `GeographyChart` -> Renders choropleth maps using GeoJSON features.
  ├── `LineChart` -> Displays multi-series line graphs for trend tracking.
  ├── `PieChart` -> Visualizes dataset proportions in a radial format.
  └── `ProgressCircle` -> CSS-based radial progress indicator for metrics.

## 4. Use Cases Hierarchy
- **Use Case 1: Dashboard Overview** -> `ProgressCircle` and simplified charts show quick KPI snapshots.
- **Use Case 2: Revenue Analytics** -> `LineChart` and `BarChart` visualize sales performance over time.
- **Use Case 3: Customer Demographics** -> `GeographyChart` identifies regional market penetration.
- **Use Case 4: Category Distribution** -> `PieChart` breaks down inventory or sales by category.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `BarChart.jsx` | Renders responsive bar charts for comparing discrete categories. |
| `GeographyChart.jsx` | Renders choropleth maps for geographic data visualization. |
| `LineChart.jsx` | Renders multi-series line graphs for time-series or trend analysis. |
| `PieChart.jsx` | Renders pie/donut charts for showing part-to-whole relationships. |
| `ProgressCircle.jsx` | A lightweight component for displaying a single percentage metric. |

## 6. Comprehensive Project Brief
The Lenscare Admin system is a React single-page application that bootstraps in `src/index.js` and routes through `src/App.js`. Page components in `src/pages` render business workflows, and shared UI lives under `src/components`. All backend integration is centralized here: Supabase clients in `/src/server/supabase` provide authentication and data operations, scripts in `/src/server/scripts` execute SQL migrations or maintenance, and schema assets live in `/src/server/database`. This folder therefore acts as the UI building block library that pages and scenes reuse to enforce visual consistency and functional cohesion.
