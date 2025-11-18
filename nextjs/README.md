# ERP System - Next.js Migration

This is the Next.js version of the ERP system, migrated from Vite+React frontend + Express backend to a unified Next.js application using App Router with client-side rendering.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- PostgreSQL database running
- Existing ERP database with users table

### Installation

1. **Install dependencies**
```bash
npm install
```

2. **Configure environment**
```bash
# .env.local is already created with default values
# Update with your database credentials if needed
```

3. **Start development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## 📁 Project Structure

```
nextjs/
├── app/                          # App Router
│   ├── api/                     # API routes (server-side)
│   │   ├── auth/               # Authentication endpoints
│   │   │   ├── login/route.ts
│   │   │   ├── logout/route.ts
│   │   │   └── profile/route.ts
│   │   └── settings/           # Settings endpoints
│   │       ├── route.ts
│   │       └── [category]/route.ts
│   ├── dashboard/              # Dashboard page
│   │   └── page.tsx
│   ├── login/                  # Login page
│   │   └── page.tsx
│   ├── layout.tsx              # Root layout with providers
│   ├── page.tsx                # Home page (redirect logic)
│   └── providers.tsx           # React Query provider
├── contexts/                    # React contexts
│   └── AuthContext.tsx         # Auth state management
├── lib/                         # Utilities and helpers
│   ├── auth.ts                 # Auth utilities (JWT, bcrypt)
│   ├── db.ts                   # PostgreSQL connection pool
│   ├── logger.ts               # Logging utility
│   └── response-helper.ts      # Response formatting
├── types/                       # TypeScript type definitions
│   ├── auth.ts                 # Auth types
│   └── rbac.ts                 # RBAC types
├── middleware.ts                # Next.js middleware (auth)
├── .env.local                   # Environment variables
├── next.config.ts               # Next.js configuration
└── tsconfig.json                # TypeScript configuration
```

## ✅ What's Working

### Authentication System
- ✅ JWT-based authentication
- ✅ HTTP-only cookie storage
- ✅ Login/logout functionality
- ✅ User profile retrieval
- ✅ Protected routes via middleware
- ✅ Password hashing with bcrypt

### API Routes
- ✅ POST /api/auth/login - User login
- ✅ POST /api/auth/logout - User logout
- ✅ GET /api/auth/profile - Get user profile
- ✅ GET /api/settings - Get all settings
- ✅ POST /api/settings - Create/update setting
- ✅ GET /api/settings/[category] - Get settings by category
- ✅ PUT /api/settings/[category] - Update category settings

### Pages
- ✅ / - Home page with redirect logic
- ✅ /login - Login page
- ✅ /dashboard - Protected dashboard

## 🧪 Testing

### Manual Testing

1. **Test login flow**
   - Navigate to http://localhost:3000
   - Enter credentials
   - Verify redirect to dashboard
   - Check user info displays

2. **Test API endpoints**
```bash
# Linux/Mac
./test-api.sh

# Windows PowerShell
.\test-api.ps1
```

### Using curl

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"your_password"}' \
  -c cookies.txt

# Get Profile
curl http://localhost:3000/api/auth/profile -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/auth/logout -b cookies.txt
```

## 📚 Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Quick start guide
- **[MIGRATION_PROGRESS.md](./MIGRATION_PROGRESS.md)** - Migration status and tracking
- **[EXPRESS_VS_NEXTJS.md](./EXPRESS_VS_NEXTJS.md)** - Code comparison guide
- **[TESTING_CHECKLIST.md](./TESTING_CHECKLIST.md)** - Comprehensive testing checklist
- **[../NEXTJS_MIGRATION_SUMMARY.md](../NEXTJS_MIGRATION_SUMMARY.md)** - Overall migration summary

## 🔧 Available Scripts

```bash
# Development
npm run dev          # Start development server

# Production
npm run build        # Build for production
npm run start        # Start production server

# Linting
npm run lint         # Run ESLint
```

## 🌐 Environment Variables

Create or update `.env.local`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=erp
DB_USER=postgres
DB_PASSWORD=your_password

# JWT Configuration
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d

# Server Configuration
PORT=3000
NODE_ENV=development

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
```

## 🔄 Running Both Systems in Parallel

During migration, you can run both Express and Next.js:

**Terminal 1 - Express Backend:**
```bash
cd backend
npm run dev
# Runs on port 3001
```

**Terminal 2 - Next.js App:**
```bash
cd nextjs
npm run dev
# Runs on port 3000
```

## 🚧 Migration Status

### ✅ Completed
- Phase 1: Foundation & Authentication
- Auth API routes
- Settings API routes (example)
- Login and Dashboard pages

### 🚧 In Progress
- Module migration (inventory, accounts, factory, etc.)

### ⏳ Planned
- RBAC implementation
- All module pages
- Advanced features

See [MIGRATION_PROGRESS.md](./MIGRATION_PROGRESS.md) for details.

## 🎯 Next Steps

1. **Test current features**
   - Login with different user roles
   - Verify API routes work
   - Check error handling

2. **Start module migration**
   - Begin with Inventory module
   - Follow migration pattern
   - Test thoroughly

3. **Add more features**
   - User management
   - Role-based access control
   - Module-specific pages

## 🐛 Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check credentials in `.env.local`
- Ensure database exists
- Verify users table exists

### Login Issues
- Check if user exists in database
- Verify password is hashed with bcrypt
- Check browser console for errors
- Verify JWT_SECRET matches

### Port Conflicts
```bash
# Use different port
PORT=3001 npm run dev
```

## 📖 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [React Query](https://tanstack.com/query/latest)
- [TypeScript](https://www.typescriptlang.org/docs/)

## 🤝 Contributing

1. Follow the migration pattern in documentation
2. Test thoroughly before committing
3. Update documentation as needed
4. Follow TypeScript best practices

## 📝 License

Same as the main ERP system project.
