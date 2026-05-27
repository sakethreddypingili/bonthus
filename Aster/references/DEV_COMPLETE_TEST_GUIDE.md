# Development Server QR Scanner - Complete Test Guide

## What Was Fixed

### 1. React.StrictMode Breaking Camera (MAIN ISSUE)
**Problem:** React.StrictMode runs all effects twice in development, which immediately stopped the camera right after it started.
**Fixed In:** `src/index.js` - Now disables StrictMode only in development mode

### 2. Enhanced Error Logging
**Problem:** When scanner failed, we had no visibility into where exactly it broke.
**Fixed In:** `src/pages/Attendance.jsx` - Added detailed console logs for:
- When camera starts/stops
- Security context check results
- Camera enumeration results
- Each step of initialization

### 3. Improved Dev Script Options
**Added In:** `package.json`
- `npm run dev:nostrict` - Alternative if issues persist

## How to Test in Development

### Step 1: Clear Cache and Restart Dev Server
```bash
# Kill existing dev server (Ctrl+C if running)

# Clear Node modules cache (sometimes helps)
npm cache clean --force

# Start fresh dev server
npm run dev

# Or with hot-reload disabled (for more stable camera):
npm run dev:nostrict
```

### Step 2: Open in Browser
- Go to: **https://localhost:3001**
- You MUST use HTTPS (not HTTP)
- Click "Advanced" and accept the self-signed certificate warning

### Step 3: Login and Navigate to QR Scanner
```
Login: [employee_id or phone or email]
Password: [your password]
```
- Should auto-redirect to Scan tab
- See employee name in profile box at bottom

### Step 4: Test Camera Start
1. Click **"Start Camera"** button
2. **Open Browser DevTools** (F12 or Cmd+Opt+I on Mac)
3. Go to **Console** tab
4. You should see logs like:
```
Starting camera for employee: [Name]
Security check: {isSecureContext: true, hostname: "localhost", ...}
Attempting to start camera with facingMode: environment
Camera started successfully with environment facingMode
Scanner is now active
```

### Step 5: Test QR Scanning
1. Camera preview should show in the box
2. Display a QR code (from admin QR tab or another device)
3. Point at it and wait for detection
4. Console should show: `QR code scanned successfully: [code]`
5. Should show success message

## Troubleshooting - What to Check

### "Camera not starting" or "Camera element not found"
**Check Console Log:** Look for which exact line failed
- If "Attempting to start camera..." appears but nothing after = permission issue or hardware problem
- If "Camera reader element not found" = DOM not ready

**Solution:**
1. Refresh page completely (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)
2. Wait 3 seconds after "Employee Profile" box appears
3. Then click Start Camera

### "Security check" shows `isSecureContext: false`
**Problem:** Dev server not running HTTPS properly
**Solution:**
```bash
# Stop dev server
# Check if something else is using port 3001
lsof -i :3001

# If used, kill it:
kill -9 [PID]

# Restart dev server
npm run dev
```

### "No camera found on this device"
**Problem:** Device doesn't have camera or permission denied at OS level
**Solution:**
- Make sure browser has camera permission in system settings
- Chrome: Settings → Privacy → Camera → Enable for localhost

### Multiple cameras enumerated, but wrong one selected
**Check Console Log:** Look for lines like:
```
Available cameras: [...]
Using camera: [label] [id]
```
The fallback logic picks the back camera. If wrong camera is used, it will still work but might show front camera.

### "Failed to start camera: Android camera requires HTTPS"
**Problem:** Trying to access from IP address instead of localhost
**Solution:**
- Use `https://localhost:3001` NOT `https://192.168.x.x:3001`
- If you need to access from another machine, set up a tunnel or proper domain

### Supabase errors (QR validation fails)
**Check Console Log:** Look for Supabase RPC errors
**Likely causes:**
- Supabase connection not working in dev environment
- Employee profile not properly linked to auth user
- QR code has expired

**Solution:**
1. Check [src/database/supabase.js](src/database/supabase.js) is configured correctly
2. Verify employee exists in employees table
3. Generate fresh QR code and try again

## Files Modified in This Fix

### Core Fixes
- **src/index.js** - Disabled StrictMode in dev
- **src/pages/Attendance.jsx** - Enhanced logging and robust camera startup
- **package.json** - Added dev:nostrict script option

### Reference Docs
- **DEV_SERVER_QR_FIX.md** - General dev troubleshooting
- **QR_SCANNER_FIX_GUIDE.md** - Original Android/employee-ID fixes

## Dev vs Production Differences

| Aspect | Development | Production |
|--------|-------------|-----------|
| React.StrictMode | Disabled (camera works) | Enabled (safety checks) |
| Logging | Verbose (for debugging) | Minimal (performance) |
| HTTPS | Self-signed cert warning | Proper certificate |
| Hot Reload | Enabled (can interfere) | Disabled |
| Error Messages | Detailed | User-friendly |

## Performance Note
In development with full logging, you might see camera performance slightly slower than production. This is normal and expected. Production build will be faster.

## Next Steps if Still Failing
1. **Capture the exact console error text** (copy-paste from Console tab)
2. **Take a screenshot of the error message**
3. **Tell me which device** (Mac, Windows, Android, iPhone)
4. **Which browser** (Chrome, Firefox, Safari, etc.)

With this information, I can pinpoint the exact issue immediately.
