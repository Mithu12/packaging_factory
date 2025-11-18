# Testing Checklist - Next.js Migration

## Pre-Testing Setup

### 1. Install Dependencies
```bash
cd nextjs
npm install
```

### 2. Verify Environment Variables
Check `.env.local` file exists with correct values:
- [ ] DB_HOST
- [ ] DB_PORT
- [ ] DB_NAME
- [ ] DB_USER
- [ ] DB_PASSWORD
- [ ] JWT_SECRET
- [ ] JWT_EXPIRES_IN

### 3. Verify Database
- [ ] PostgreSQL is running
- [ ] Database 'erp' exists
- [ ] Users table exists with test users
- [ ] Settings table exists (if testing settings)

### 4. Start Development Server
```bash
npm run dev
```
- [ ] Server starts without errors
- [ ] Runs on http://localhost:3000
- [ ] No TypeScript compilation errors

## Authentication Testing

### Login Flow
- [ ] Navigate to http://localhost:3000
- [ ] Redirects to /login automatically
- [ ] Login form displays correctly
- [ ] Enter valid credentials
- [ ] Click "Sign in" button
- [ ] Successful login redirects to /dashboard
- [ ] Dashboard shows user information
- [ ] User name displays in header
- [ ] User role displays correctly

### Login Validation
- [ ] Empty username shows error
- [ ] Empty password shows error
- [ ] Invalid credentials show error message
- [ ] Error message is user-friendly
- [ ] Form doesn't submit with invalid data

### Protected Routes
- [ ] Accessing /dashboard without login redirects to /login
- [ ] After login, can access /dashboard
- [ ] Logout button is visible
- [ ] Clicking logout redirects to /login

### Session Persistence
- [ ] After login, refresh page
- [ ] User remains logged in
- [ ] Dashboard still accessible
- [ ] User info still displays

### Logout Flow
- [ ] Click logout button
- [ ] Redirects to /login
- [ ] Cannot access /dashboard anymore
- [ ] Accessing /dashboard redirects to /login

## API Routes Testing

### Auth Endpoints

#### POST /api/auth/login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}' \
  -c cookies.txt -v
```
- [ ] Returns 200 on success
- [ ] Returns user object
- [ ] Returns token
- [ ] Sets authToken cookie
- [ ] Cookie is httpOnly
- [ ] Returns 401 on invalid credentials
- [ ] Returns 400 on missing fields

#### GET /api/auth/profile
```bash
curl http://localhost:3000/api/auth/profile \
  -b cookies.txt -v
```
- [ ] Returns 200 with valid token
- [ ] Returns user object
- [ ] Returns 401 without token
- [ ] Returns 401 with invalid token

#### POST /api/auth/logout
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt -v
```
- [ ] Returns 200
- [ ] Clears authToken cookie
- [ ] Subsequent requests fail authentication

### Settings Endpoints

#### GET /api/settings
```bash
curl http://localhost:3000/api/settings \
  -b cookies.txt -v
```
- [ ] Returns 200 with valid token
- [ ] Returns array of settings
- [ ] Returns 401 without token

#### POST /api/settings
```bash
curl -X POST http://localhost:3000/api/settings \
  -H "Content-Type: application/json" \
  -d '{"category":"general","key":"app_name","value":"ERP System"}' \
  -b cookies.txt -v
```
- [ ] Returns 200 on success (admin user)
- [ ] Creates new setting
- [ ] Returns 403 for non-admin users
- [ ] Returns 400 on missing fields
- [ ] Returns 401 without token

#### GET /api/settings/[category]
```bash
curl http://localhost:3000/api/settings/general \
  -b cookies.txt -v
```
- [ ] Returns 200 with valid token
- [ ] Returns settings for category
- [ ] Returns empty array if no settings

## Browser Testing

### Different Browsers
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Edge

### Responsive Design
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (375x667)

### Browser Features
- [ ] Cookies work correctly
- [ ] Local storage (if used)
- [ ] Console has no errors
- [ ] Network tab shows correct requests

## Security Testing

### Authentication
- [ ] Cannot access protected routes without login
- [ ] Token expires after configured time
- [ ] Invalid tokens are rejected
- [ ] Tokens are stored in httpOnly cookies
- [ ] Tokens are not visible in JavaScript

### Authorization
- [ ] Admin-only routes reject non-admin users
- [ ] Users can only access their own data
- [ ] Role-based access works correctly

### Input Validation
- [ ] SQL injection attempts are blocked
- [ ] XSS attempts are sanitized
- [ ] CSRF protection (if implemented)

## Performance Testing

### Page Load Times
- [ ] Login page loads < 1s
- [ ] Dashboard loads < 2s
- [ ] API responses < 500ms

### Database Queries
- [ ] No N+1 query problems
- [ ] Queries use indexes
- [ ] Connection pool works correctly

### Memory Leaks
- [ ] No memory leaks on page navigation
- [ ] Event listeners cleaned up
- [ ] React Query cache managed

## Error Handling

### Network Errors
- [ ] Graceful handling of network failures
- [ ] User-friendly error messages
- [ ] Retry mechanisms work

### Database Errors
- [ ] Connection errors handled
- [ ] Query errors logged
- [ ] User sees appropriate message

### Validation Errors
- [ ] Form validation works
- [ ] API validation works
- [ ] Error messages are clear

## Edge Cases

### Authentication
- [ ] Multiple login attempts
- [ ] Concurrent sessions
- [ ] Token refresh (if implemented)
- [ ] Remember me (if implemented)

### Data
- [ ] Empty states display correctly
- [ ] Large datasets paginate
- [ ] Special characters in input
- [ ] Unicode characters

### Navigation
- [ ] Back button works
- [ ] Forward button works
- [ ] Direct URL access
- [ ] Bookmark functionality

## Integration Testing

### With Express Backend
- [ ] Both servers run simultaneously
- [ ] No port conflicts
- [ ] Database shared correctly
- [ ] No data corruption

### Database
- [ ] Migrations work
- [ ] Data integrity maintained
- [ ] Transactions work correctly
- [ ] Rollbacks work

## Regression Testing

### Existing Features
- [ ] All existing features still work
- [ ] No breaking changes
- [ ] Data migration successful
- [ ] User workflows unchanged

## Documentation Testing

### Code Documentation
- [ ] README is accurate
- [ ] QUICKSTART works
- [ ] API documentation correct
- [ ] Comments are helpful

### User Documentation
- [ ] Login instructions clear
- [ ] Feature documentation accurate
- [ ] Troubleshooting guide helpful

## Deployment Testing

### Build Process
```bash
npm run build
```
- [ ] Build completes successfully
- [ ] No TypeScript errors
- [ ] No ESLint errors
- [ ] Bundle size acceptable

### Production Mode
```bash
npm run start
```
- [ ] Runs in production mode
- [ ] Performance is good
- [ ] No console errors
- [ ] All features work

## Sign-Off

### Developer Testing
- [ ] All tests passed
- [ ] Code reviewed
- [ ] Documentation updated
- [ ] Ready for QA

### QA Testing
- [ ] Functional tests passed
- [ ] Security tests passed
- [ ] Performance acceptable
- [ ] Ready for staging

### Staging Testing
- [ ] Deployed to staging
- [ ] All features work
- [ ] Performance acceptable
- [ ] Ready for production

## Notes

Record any issues found during testing:

1. Issue: _______________
   Status: _______________
   Resolution: _______________

2. Issue: _______________
   Status: _______________
   Resolution: _______________

## Test Results Summary

- Total Tests: ___
- Passed: ___
- Failed: ___
- Blocked: ___
- Not Tested: ___

**Overall Status**: [ ] PASS / [ ] FAIL

**Tested By**: _______________
**Date**: _______________
**Version**: _______________
