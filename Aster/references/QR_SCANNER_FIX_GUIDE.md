# QR Scanner Fix - Implementation Guide

## Problem Summary
QR scanning was not working when employees logged in with their employee ID because:
1. Login page didn't support employee_id as a login identifier
2. Attendance page's employee lookup only checked by email
3. RPC function to convert employee_id to email was missing

## Changes Made

### 1. Updated Login.jsx
- Added support for 6-digit employee_id login format
- Updated input placeholder to show "Email, 10-digit Phone, or 6-digit Employee ID"
- Added logic to call `get_email_by_employee_id` RPC function when employee_id is detected

### 2. Updated Attendance.jsx
- Enhanced employee lookup to try multiple strategies:
  - First tries lookup by email
  - Falls back to employee_id lookup if email not found
  - Added better error logging for debugging
- Improved error handling in processQRCode function

### 3. Created RPC Function
- File: `src/database/add_employee_id_rpc.sql`
- Defines SQL function `get_email_by_employee_id()` to resolve employee_id to email
- Required for employee_id login to work

## How to Apply These Changes

### Step 1: Run the SQL Migration
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the entire content of `src/database/add_employee_id_rpc.sql`
4. Paste it into a new SQL query
5. Click "Run"

Alternatively, if you have a management script:
```bash
cd "/Users/sakethreddypingili/Desktop/admin dashboard"
npm run migrate:rpc  # or similar command to run SQL migrations
```

### Step 2: Test the Implementation

1. **Test Employee ID Login**
   - Go to login page
   - Enter employee's 6-digit employee_id (e.g., "123456")
   - Enter password
   - Should login successfully

2. **Test QR Scanner**
   - After successful employee login, you should be redirected to Attendance/Scan tab
   - Click "Start Camera" button
   - QR scanner should now start properly
   - Try scanning a QR code to verify check-in/check-out works

## Troubleshooting

### "Camera element not found in DOM"
- This might happen if the page doesn't fully load
- Try refreshing the page
- Make sure you're on the "Scan" tab

### "Invalid/Expired QR"
- The QR code might be expired (12-hour validity)
- Generate a new QR code from the "QR Code" tab (admin only)

### Still seeing "Employee not found"
- Check browser console for debug messages
- Verify employee record exists in the database
- Make sure email/phone/employee_id matches correctly

### RPC function not found error
- Make sure you ran the SQL migration in Supabase dashboard
- Verify the function appears in SQL Editor > Functions

## How It Works Now

### Login Flow with Employee ID:
1. Employee enters 6-digit employee_id as login identifier
2. Login.jsx detects it's exactly 6 digits
3. Calls `get_email_by_employee_id(employee_id)` RPC
4. RPC returns the employee's email
5. Uses that email to authenticate with Supabase Auth

### QR Scanning Flow:
1. Employee logs in successfully
2. `userProfile` is fetched with correct email
3. Attendance page loads with enhanced employee lookup
4. Employee record is found (by email or employee_id)
5. QR scanner can start properly
6. Employee can scan QR codes for check-in/check-out

## Files Modified
- `src/pages/Login.jsx` - Added employee_id support
- `src/pages/Attendance.jsx` - Enhanced employee lookup with fallbacks and better error handling
- `src/database/add_employee_id_rpc.sql` - New RPC function definition

## Notes
- Employee ID must be exactly 6 digits
- Phone login still requires exactly 10 digits
- Email login remains unchanged
- All three login methods work with the same password
