# Directory Module: components/layout
> Path: `/src/components/layout`

## 1. Small Summary
This directory contains layout templates specifically designed for document rendering, primarily focused on invoice generation. It includes versions optimized for on-screen viewing and PDF export.

## 2. Files Hierarchy
- `InvoiceLayout.jsx` -> Rich UI template for viewing invoices within the application.
- `PdfInvoiceLayout.jsx` -> Optimized template for generating high-quality PDF documents.

## 3. Functional Hierarchy
- Document Rendering
  ├── `InvoiceLayout` -> Interactive web-optimized invoice with complex styling.
  └── `PdfInvoiceLayout` -> Print-optimized layout with fixed dimensions and high-contrast text.
- Internal Utilities (not exported)
  ├── `numberToWords` -> Converts numeric currency values to English text.
  └── `pickBestEyePower` -> Logic to select the most complete eye prescription from history.

## 4. Use Cases Hierarchy
- **Use Case 1: Order Confirmation** -> Render the `InvoiceLayout` after a successful order creation.
- **Use Case 2: Customer Receipts** -> Generate a `PdfInvoiceLayout` for printing or emailing to clients.
- **Use Case 3: Prescription Documentation** -> Automatically embed customer eye power metrics into invoices.
- **Use Case 4: GST Compliance** -> Calculate and display tax breakdowns (CGST/SGST) accurately.

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `InvoiceLayout.jsx` | Standard on-screen representation of a customer invoice. |
| `PdfInvoiceLayout.jsx` | Specialized layout for PDF generation with print-friendly styling. |

## 6. Comprehensive Project Brief
The Lenscare Admin system is a React single-page application that bootstraps in `src/index.js` and routes through `src/App.js`. Page components in `src/pages` render business workflows, and shared UI lives under `src/components`. All backend integration is centralized here: Supabase clients in `/src/server/supabase` provide authentication and data operations, scripts in `/src/server/scripts` execute SQL migrations or maintenance, and schema assets live in `/src/server/database`. This folder therefore acts as the UI building block library that pages and scenes reuse to enforce visual consistency and functional cohesion.
