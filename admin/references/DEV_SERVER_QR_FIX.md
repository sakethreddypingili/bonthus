# Development Server Setup for QR Scanner

## Issue: StrictMode breaks camera in development
- React.StrictMode runs effects twice, causing camera to start then immediately cleanup
- FIXED: Disabled StrictMode in development mode (kept in production for safety checks)

## If still failing after fix:

### 1. Clear Browser Cache
```bash
# Hard refresh in browser:
Ctrl+Shift+R (Windows/Linux)
Cmd+Shift+R (Mac)
```

### 2. Verify HTTPS is working
The dev server uses `HTTPS=true` but may show certificate warnings. This is normal for development.
- In Chrome, click "Advanced" → "Proceed to localhost"
- In Firefox, add exception for self-signed cert

### 3. Check Supabase Connection
If scanner starts but can't validate QR codes, Supabase connection might be failing:
```bash
# Check browser console for errors:
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red errors from Supabase RPC calls
```

### 4. Restart Dev Server
```bash
# Stop current dev server (Ctrl+C)
npm run dev
# or
PORT=3001 HTTPS=true react-scripts start
```

### 5. If Hot Reload causes issues
React hot reload can sometimes interfere with scanner state:
- Refresh the page after modifying attendance scanner code
- Or disable hot reload by using: `FAST_REFRESH=false npm run dev`

## Common Dev-Only Errors & Solutions

### "Camera element not found in DOM"
- Page didn't fully load before clicking Start Camera
- Solution: Wait for profile info to show, then click Start Camera

### "Android camera requires HTTPS" (on localhost)
- This is expected; localhost is automatically allowed
- If on IP address, must use HTTPS
- Solution: Access via `https://localhost:3001` not `https://192.168.x.x:3001`

### "Employee profile not mapped"
- Employee table lookup failing
- Check Supabase connection in Console tab
- Verify employee record exists in database

### Blank screen / nothing loads
- Check if port 3001 is already in use
- Solution: `kill -9 $(lsof -t -i :3001)` then restart dev server

## Files Modified for Dev Fix
- src/index.js: Disabled React.StrictMode in development mode only
