# Directory Module: utils
> Path: `/src/utils`

## 1. Small Summary
The `utils` directory serves as the security and validation backbone of the Aster project. it provides a centralized suite of tools for input sanitization, multi-tenant data protection (RLS), and defensive programming patterns against common web vulnerabilities.

## 2. Files Hierarchy
*   `securityUtils.js` (Primary validation and sanitization library)
*   `RLSAuditGuide.js` (Database security enforcement and audit utility)
*   `rateLimitingGuide.js` (API protection and rate-limit implementation framework)

## 3. Functional Hierarchy
*   **Security Entry Points:** `validateAndSanitizeInput` (in `securityUtils.js`) acts as the gatekeeper for user input.
*   **Access Control:** `hasPermission` (in `securityUtils.js`) validates role-based access before operations.
*   **Data Integrity:** `testRLSPolicies` (in `RLSAuditGuide.js`) verifies that the database remains secure for multi-tenant isolation.
*   **Error Orchestration:** `getSafeErrorMessage` (in `securityUtils.js`) and `handleRateLimitError` (in `rateLimitingGuide.js`) ensure sensitive system details are never leaked to the client.

## 4. Use Cases Hierarchy
*   **User Authentication:** `validateEmail` -> `validatePassword` -> `generateSecurePassword` -> `handleRateLimitError`
*   **Data Modification:** `validateAndSanitizeInput` -> `hasPermission` -> `testRLSPolicies` (Verification)
*   **Defensive UI Rendering:** `sanitizeHTML` -> `escapeSpecialChars`
*   **Database Audit:** `RLS_VERIFICATION_CHECKLIST` -> `testRLSPolicies` -> `RLS_ACTION_ITEMS`

## 5. File-by-File Detailed Mapping Table
| File Name | Primary Operational Use Case / Core Responsibility |
| :--- | :--- |
| `RLSAuditGuide.js` | Defines Row Level Security (RLS) standards, provides a SQL policy roadmap, and includes an automated test suite to ensure multi-tenant data isolation. |
| `securityUtils.js` | Provides a robust toolkit for XSS prevention, input validation (email, phone, password), role-based permission checks, and secure error message generation. |
| `rateLimitingGuide.js` | Outlines strategies for preventing Brute Force and DoS attacks, offering implementation patterns for Supabase Edge Functions, Express.js, and client-side error handling. |

## 6. Comprehensive Project Brief
The `src/utils` folder is the architectural "Safety Layer" for the Aster application. In a multi-tenant environment where data leakage between stores is the highest risk, this module bridges the gap between the frontend UI and the Supabase backend. It ensures that every piece of data entering the system is clean, every user action is authorized via hierarchy checks, and the database's RLS policies are rigorously audited against service-role bypasses. It transforms security from a configuration afterthought into an operational utility.
