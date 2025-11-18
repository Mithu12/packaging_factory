# Quick Start Guide - Next.js ERP Migration

## Prerequisites
- Node.js 18+ installed
- PostgreSQL database running
- Existing ERP database with users table

## Setup Steps

### 1. Install Dependencies
```bash
cd nextjs
npm install
```

### 2. Configure Environment
The `.env.local` file is already created with default values. Update if needed:
```bash
# Edit .env.local with your database credentials
DB_HOST=localhost
DB_PORT=5432
DB_NAME=erp
DB_USER=postgres
DB_PASSWORD=sa
JWT_SECRET=12345
```

### 3. Start Development Server
```bash
npm run dev
```

The application will be available at: http://localhost:3000

### 4. Test the Application

#### Login
1. Navigate to http://localhost:3000
2. You'll be redirected to /login
3. Use your existing ERP credentials
4. After successful login, you'll be redirected to /dashboard

#### Available Routes
- `/` - Home (redirects to dashboard or login)
- `/login` - Login page
- `/dashboard` - Dashboard (protected)
- `/api/auth/login` - Login API endpoint
- `/api/auth/logout` - Logout API endpoint
- `/api/auth/profile` - Get user profile API endpoint

## What's Working

✅ **Authentication Flow**
- Login with username/email and password
- JWT token generation
- HTTP-only cookie storage
- Protected routes via middleware
- User profile retrieval
- Logout functionality

✅ **Database Integration**
- PostgreSQL connection pool
- Shared database with Express backend
- User authentication queries

✅ **Client-Side Features**
- React Query for data fetching
- Auth context for global state
- Automatic redirect based on auth status
- Loading states

## Next Steps

### For Development
1. **Test Current Features**
   - Login with different user roles
   - Verify dashboard displays user info
   - Test logout and re-login

2. **Start Module Migration**
   - Begin with Settings module (simplest)
   - Follow the migration pattern in MIGRATION_PROGRESS.md
   - Test each module thoroughly

3. **Add More Features**
   - User management pages
   - Role-based access control (RBAC)
   - Module-specific pages

### For Production
1. Update JWT_SECRET to a secure random string
2. Set NODE_ENV=production
3. Configure proper CORS settings
4. Set up SSL certificates
5. Configure production database

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check database credentials in .env.local
- Ensure database 'erp' exists
- Verify users table exists

### Login Issues
- Check if user exists in database
- Verify password is hashed with bcrypt
- Check browser console for errors
- Verify JWT_SECRET matches

### Port Conflicts
If port 3000 is in use:
```bash
PORT=3001 npm run dev
```

## Running Both Systems in Parallel

During migration, you can run both Express and Next.js:

**Express Backend** (Terminal 1):
```bash
cd backend
npm run dev
# Runs on port 3001
```

**Next.js App** (Terminal 2):
```bash
cd nextjs
npm run dev
# Runs on port 3000
```

This allows gradual migration while keeping the old system operational.

## Architecture Overview

```
nextjs/
├── app/                    # App Router pages and API routes
│   ├── api/               # API routes (server-side)
│   │   └── auth/         # Auth endpoints
│   ├── dashboard/        # Dashboard page
│   ├── login/            # Login page
│   ├── layout.tsx        # Root layout with providers
│   └── page.tsx          # Home page
├── contexts/              # React contexts
│   └── AuthContext.tsx   # Auth state management
├── lib/                   # Utilities and helpers
│   ├── auth.ts           # Auth utilities
│   ├── db.ts             # Database connection
│   └── ...
├── types/                 # TypeScript types
│   ├── auth.ts           # Auth types
│   └── rbac.ts           # RBAC types
├── middleware.ts          # Next.js middleware (auth)
└── .env.local            # Environment variables
```

## Support

For issues or questions:
1. Check MIGRATION_PROGRESS.md for current status
2. Review the migration plan in migrate to nextjs.md
3. Check Next.js documentation: https://nextjs.org/docs
