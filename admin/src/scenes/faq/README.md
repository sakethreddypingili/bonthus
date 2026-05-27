# Directory Module: faq
> Path: `/src/scenes/faq`

## 1. Small Summary
This scene provides a FAQ layout showcasing expandable question-and-answer content. It serves as a legacy UI template for informational pages.

## 2. Files Hierarchy
- `index.jsx` -> FAQ scene component.

## 3. Functional Hierarchy
- `FAQ` (entry)
  └── renders accordion-style FAQ content

## 4. Use Cases Hierarchy
- **Use Case 1: FAQ Demo** -> Demonstrates FAQ UI layout for informational content.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `index.jsx` | FAQ scene displaying questions and answers. |

## 6. Comprehensive Project Brief
The Lenscare Admin system is a React single-page application that bootstraps in `src/index.js` and routes through `src/App.js`. Page components in `src/pages` render business workflows, and shared UI lives under `src/components`. All backend integration is centralized here: Supabase clients in `/src/server/supabase` provide authentication and data operations, scripts in `/src/server/scripts` execute SQL migrations or maintenance, and schema assets live in `/src/server/database`. This folder provides a legacy FAQ template used for UI reference.
