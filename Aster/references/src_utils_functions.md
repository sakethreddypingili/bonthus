# Modular Functional Reference: utils

### `escapeSpecialChars()`
- **Defined In:** `/src/utils/securityUtils.js`
- **System Domain:** Data Sanitization
- **Architectural Objective:** Prevents injection attacks by converting sensitive characters to HTML entities.
- **Input Parameters:**
  - `str`: `string` - The raw string to escape.
- **Processed Output/Return:**
  - `return`: `string` - The escaped string.

### `generateSecurePassword()`
- **Defined In:** `/src/utils/securityUtils.js`
- **System Domain:** Authentication
- **Architectural Objective:** Creates high-entropy 16-character passwords for new users/employees.
- **Input Parameters:** None
- **Processed Output/Return:**
  - `return`: `string` - A random string containing uppercase, lowercase, numbers, and symbols.

### `getSafeErrorMessage()`
- **Defined In:** `/src/utils/securityUtils.js`
- **System Domain:** Error Handling
- **Architectural Objective:** Prevents sensitive system or database information leakage to the end-user.
- **Input Parameters:**
  - `error`: `Error|object` - The raw error object.
- **Processed Output/Return:**
  - `return`: `string` - A sanitized, user-friendly error message.

### `handleRateLimitError()`
- **Defined In:** `/src/utils/rateLimitingGuide.js` (returned via `setupRateLimitHandling`)
- **System Domain:** API Protection
- **Architectural Objective:** Parses 429 errors and provides wait-time instructions to the UI.
- **Input Parameters:**
  - `error`: `object` - The error response from the server.
- **Processed Output/Return:**
  - `return`: `object` - `{ shouldRetry: boolean, waitTime: number, message: string }`.

### `hasPermission()`
- **Defined In:** `/src/utils/securityUtils.js`
- **System Domain:** Authorization
- **Architectural Objective:** Enforces a hierarchical role-based access control (RBAC) system.
- **Input Parameters:**
  - `userProfile`: `object` - The user object containing a `role` property.
  - `requiredRole`: `string` - The minimum role required ('super_admin', 'admin', 'employee', 'user').
- **Processed Output/Return:**
  - `return`: `boolean` - True if user meets or exceeds the required permission level.

### `sanitizeHTML()`
- **Defined In:** `/src/utils/securityUtils.js`
- **System Domain:** Data Sanitization
- **Architectural Objective:** Protects against Cross-Site Scripting (XSS) by stripping HTML tags from strings.
- **Input Parameters:**
  - `str`: `string` - The string to sanitize.
- **Processed Output/Return:**
  - `return`: `string` - A text-only string.

### `setupRateLimitHandling()`
- **Defined In:** `/src/utils/rateLimitingGuide.js`
- **System Domain:** API Protection
- **Architectural Objective:** Initializes the rate limit error handling logic for the frontend.
- **Input Parameters:** None
- **Processed Output/Return:**
  - `return`: `object` - Object containing the `handleRateLimitError` function.

### `testRLSPolicies()`
- **Defined In:** `/src/utils/RLSAuditGuide.js`
- **System Domain:** Database Security
- **Architectural Objective:** Programmatically verifies that Row Level Security is correctly isolating tenant data.
- **Input Parameters:**
  - `supabase`: `object` - Supabase client instance.
  - `userId`: `string` - UID of the test user.
  - `userRole`: `string` - Role of the test user.
  - `userStoreId`: `string` - Store ID associated with the test user.
- **Processed Output/Return:**
  - `return`: `Promise<boolean>` - True if all security tests pass.

### `validateAndSanitizeInput()`
- **Defined In:** `/src/utils/securityUtils.js`
- **System Domain:** Input Validation
- **Architectural Objective:** Orchestrates multi-step cleaning and validation for various data types.
- **Input Parameters:**
  - `input`: `string` - Raw user input.
  - `type`: `string` - Type of input ('email', 'phone', 'name', 'password', 'text').
- **Processed Output/Return:**
  - `return`: `object` - `{ isValid: boolean, value: string, error: string|null }`.

### `validateEmail()`
- **Defined In:** `/src/utils/securityUtils.js`
- **System Domain:** Input Validation
- **Architectural Objective:** Validates string against RFC-compliant email regex.
- **Input Parameters:**
  - `email`: `string` - The email to check.
- **Processed Output/Return:**
  - `return`: `boolean` - Validity status.

### `validatePassword()`
- **Defined In:** `/src/utils/securityUtils.js`
- **System Domain:** Input Validation
- **Architectural Objective:** Enforces complex password requirements (12+ chars, mixed case, numbers, symbols).
- **Input Parameters:**
  - `password`: `string` - The password to check.
- **Processed Output/Return:**
  - `return`: `object` - `{ isValid: boolean, errors: string[] }`.

### `validatePhoneNumber()`
- **Defined In:** `/src/utils/securityUtils.js`
- **System Domain:** Input Validation
- **Architectural Objective:** Validates Indian mobile numbers (10 digits, starting with 6-9).
- **Input Parameters:**
  - `phone`: `string` - The phone number to check.
- **Processed Output/Return:**
  - `return`: `boolean` - Validity status.
