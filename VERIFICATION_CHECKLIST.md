# ✅ Next.js Migration - Verification Checklist

## Pre-Flight Checks

### 1. Files Created ✅

Run this command to verify all files exist:
```bash
ls -la nextjs/
```

**Expected files:**
- [x] `app/` directory
- [x] `contexts/` directory
- [x] `lib/` directory
- [x] `types/` directory
- [x] `middleware.ts`
- [x] `.env.local`
- [x] `package.json`
- [x] `next.config.ts`
- [x] `tsconfig.json`
- [x] Documentation files (README.md, QUICKSTART.md, etc.)

### 2. Dependencies Installed ✅

```bash
cd nextjs
npm install
```

**Verify no errors during installation**

### 3. Environment Configuration ✅

Check `.env.local` file exists and has correct values:
```bash
cat nextjs/.env.local
```

**Required variables:**
- [x] DB_HOST
- [x] DB_PORT
- [x] DB_NAME
- [x] DB_USER
- [x] DB_PASSWORD
- [x] JWT_SECRET
- [x] JWT_EXPIRES_IN

## Functional Tests

### 1. Start Development Server

```bash
cd nextjs
npm run dev
```

**Verify:**
- [ ] Server starts without errors
- [ ] Runs on http://localhost:3000
- [ ] No TypeScript compilation errors
- [ ] No ESLint errors

### 2. Test Home Page

**Steps:**
1. Open browser to http://localhost:3000
2. Should redirect to /login

**Verify:**
- [ ] Redirect happens automatically
- [ ] No console errors
- [ ] Page loads quickly

### 3. Test Login Page

**Steps:**
1. Navigate to http://localhost:3000/login
2. Enter valid credentials
3. Click "Sign in"

**Verify:**
- [ ] Login form displays correctly
- [ ] Username field works
- [ ] Password field works (hidden)
- [ ] Submit button works
- [ ] Loading state shows during login
- [ ] Successful login redirects to /dashboard
- [ ] Invalid credentials show error message

### 4. Test Dashboard

**After successful login:**

**Verify:**
- [ ] Dashboard displays user information
- [ ] User name shows in header
- [ ] User role displays correctly
- [ ] Logout button is visible
- [ ] No console errors

### 5. Test Logout

**Steps:**
1. Click logout button on dashboard
2. Should redirect to /login

**Verify:**
- [ ] Logout happens immediately
- [ ] Redirects to /login
- [ ] Cannot access /dashboard anymore
- [ ] Accessing /dashboard redirects to /login

### 6. Test Session Persistence

**Steps:**
1. Login successfully
2. Refresh the page
3. Navigate to different pages

**Verify:**
- [ ] User remains logged in after refresh
- [ ] Dashboard still accessible
- [ ] User info still displays
- [ ] No re-login required

### 7. Test Protected Routes

**Steps:**
1. Logout if logged in
2. Try to access http://localhost:3000/dashboard directly

**Verify:**
- [ ] Redirects to /login
- [ ] Cannot access dashboard without login
- [ ] After login, can access dashboard

## API Tests

### 1. Test Login API

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your_username","password":"your_password"}' \
  -c cookies.txt -v
```

**Verify:**
- [ ] Returns 200 on success
- [ ] Returns user object
- [ ] Returns token
- [ ] Sets authToken cookie
- [ ] Cookie is httpOnly
- [ ] Returns 401 on invalid credentials

### 2. Test Profile API

```bash
curl http://localhost:3000/api/auth/profile \
  -b cookies.txt -v
```

**Verify:**
- [ ] Returns 200 with valid token
- [ ] Returns user object
- [ ] Returns 401 without token

### 3. Test Logout API

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt -v
```

**Verify:**
- [ ] Returns 200
- [ ] Clears authToken cookie

### 4. Test Settings API

```bash
curl http://localhost:3000/api/settings \
  -b cookies.txt -v
```

**Verify:**
- [ ] Returns 200 with valid token
- [ ] Returns settings array
- [ ] Returns 401 without token

### 5. Run Automated Test Script

**Linux/Mac:**
```bash
cd nextjs
./test-api.sh
```

**Windows PowerShell:**
```powershell
cd nextjs
.\test-api.ps1
```

**Verify:**
- [ ] All tests pass
- [ ] No errors in output

## Database Tests

### 1. Verify Database Connection

**Check logs when starting server:**
```bash
npm run dev
```

**Verify:**
- [ ] See "📊 Connected to PostgreSQL database" message
- [ ] No connection errors

### 2. Verify User Query

**After login, check server logs:**

**Verify:**
- [ ] SQL queries execute successfully
- [ ] No query errors
- [ ] User data retrieved correctly

## Security Tests

### 1. Test Cookie Security

**In browser DevTools:**
1. Login successfully
2. Open Application/Storage tab
3. Check Cookies

**Verify:**
- [ ] authToken cookie exists
- [ ] Cookie is HttpOnly
- [ ] Cookie has correct domain
- [ ] Cookie has correct path (/)

### 2. Test Token Expiration

**Steps:**
1. Login successfully
2. Wait for token to expire (or manually delete cookie)
3. Try to access dashboard

**Verify:**
- [ ] Expired token redirects to login
- [ ] Cannot access protected routes

### 3. Test Unauthorized Access

**Steps:**
1. Logout
2. Try to access API endpoints directly

```bash
curl http://localhost:3000/api/auth/profile -v
```

**Verify:**
- [ ] Returns 401 Unauthorized
- [ ] No data leaked

## Browser Compatibility

### Test in Different Browsers

**Chrome/Chromium:**
- [ ] Login works
- [ ] Dashboard displays correctly
- [ ] Logout works
- [ ] No console errors

**Firefox:**
- [ ] Login works
- [ ] Dashboard displays correctly
- [ ] Logout works
- [ ] No console errors

**Safari (if on Mac):**
- [ ] Login works
- [ ] Dashboard displays correctly
- [ ] Logout works
- [ ] No console errors

## Performance Tests

### 1. Page Load Times

**Measure with browser DevTools:**

**Verify:**
- [ ] Login page loads < 1 second
- [ ] Dashboard loads < 2 seconds
- [ ] API responses < 500ms

### 2. Network Requests

**Check Network tab in DevTools:**

**Verify:**
- [ ] No unnecessary requests
- [ ] Requests complete successfully
- [ ] Proper caching headers

## Error Handling Tests

### 1. Test Invalid Login

**Steps:**
1. Enter wrong username/password
2. Submit form

**Verify:**
- [ ] Shows error message
- [ ] Error message is user-friendly
- [ ] Form doesn't crash
- [ ] Can try again

### 2. Test Network Errors

**Steps:**
1. Stop the server
2. Try to login

**Verify:**
- [ ] Shows appropriate error
- [ ] Doesn't crash the app
- [ ] Can retry when server is back

### 3. Test Database Errors

**Steps:**
1. Stop PostgreSQL
2. Try to login

**Verify:**
- [ ] Shows appropriate error
- [ ] Doesn't expose database details
- [ ] Logs error on server

## Documentation Tests

### 1. Verify Documentation

**Check all documentation files exist:**
```bash
ls nextjs/*.md
```

**Verify:**
- [ ] README.md exists and is accurate
- [ ] QUICKSTART.md exists and works
- [ ] MIGRATION_PROGRESS.md exists
- [ ] EXPRESS_VS_NEXTJS.md exists
- [ ] TESTING_CHECKLIST.md exists
- [ ] ARCHITECTURE.md exists

### 2. Follow Quick Start Guide

**Steps:**
1. Follow QUICKSTART.md step by step
2. Verify each step works

**Verify:**
- [ ] All commands work
- [ ] Instructions are clear
- [ ] No missing steps

## Build Tests

### 1. Test Production Build

```bash
cd nextjs
npm run build
```

**Verify:**
- [ ] Build completes successfully
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Bundle size is reasonable

### 2. Test Production Mode

```bash
npm run start
```

**Verify:**
- [ ] Runs in production mode
- [ ] All features work
- [ ] Performance is good
- [ ] No console errors

## Integration Tests

### 1. Test with Express Backend

**Terminal 1:**
```bash
cd backend
npm run dev
```

**Terminal 2:**
```bash
cd nextjs
npm run dev
```

**Verify:**
- [ ] Both servers run simultaneously
- [ ] No port conflicts
- [ ] Database shared correctly
- [ ] No data corruption

## Final Verification

### Checklist Summary

**Core Functionality:**
- [ ] Login works
- [ ] Logout works
- [ ] Dashboard displays user info
- [ ] Protected routes work
- [ ] API routes work
- [ ] Database connection works

**Security:**
- [ ] Tokens are secure
- [ ] Cookies are httpOnly
- [ ] Unauthorized access blocked
- [ ] Passwords are hashed

**Performance:**
- [ ] Pages load quickly
- [ ] API responses are fast
- [ ] No memory leaks

**Documentation:**
- [ ] All docs exist
- [ ] Docs are accurate
- [ ] Quick start works

**Build:**
- [ ] Development build works
- [ ] Production build works
- [ ] No errors

## Sign-Off

**Tested By:** _______________
**Date:** _______________
**Version:** Phase 1 Complete

**Overall Status:** [ ] PASS / [ ] FAIL

**Notes:**
_____________________________________________
_____________________________________________
_____________________________________________

## Next Steps After Verification

If all checks pass:
1. ✅ Phase 1 is complete
2. 📝 Document any issues found
3. 🚀 Begin Phase 2: Module Migration
4. 📊 Start with Inventory module

If any checks fail:
1. 📝 Document the failure
2. 🔧 Fix the issue
3. 🔄 Re-run verification
4. ✅ Confirm fix works

## Support

For issues:
1. Check documentation in nextjs/ directory
2. Review TROUBLESHOOTING section in QUICKSTART.md
3. Check server logs for errors
4. Verify database connection
5. Check environment variables

## Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [React Query](https://tanstack.com/query/latest)
- [PostgreSQL](https://www.postgresql.org/docs/)
- Project documentation in nextjs/ directory
