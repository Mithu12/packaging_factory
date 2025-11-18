# Next.js ERP Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Next.js Application                      │
│                      (Port 3000)                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────────────┐      ┌─────────────────────┐      │
│  │   Client Pages      │      │    API Routes       │      │
│  │   (CSR - 'use      │      │   (Server-side)     │      │
│  │    client')         │      │                     │      │
│  ├─────────────────────┤      ├─────────────────────┤      │
│  │ • /                 │      │ • /api/auth/*       │      │
│  │ • /login            │◄────►│ • /api/settings/*   │      │
│  │ • /dashboard        │      │ • /api/inventory/*  │      │
│  │ • /inventory/*      │      │ • /api/accounts/*   │      │
│  │ • /accounts/*       │      │ • /api/factory/*    │      │
│  │ • /factory/*        │      │ • /api/hrm/*        │      │
│  │ • /hrm/*            │      │ • /api/sales/*      │      │
│  │ • /sales/*          │      │ • /api/salesrep/*   │      │
│  └─────────────────────┘      └─────────────────────┘      │
│           │                             │                    │
│           │                             │                    │
│  ┌────────▼─────────────────────────────▼─────────────┐    │
│  │              Middleware Layer                       │    │
│  │  • Authentication (JWT verification)                │    │
│  │  • Route protection                                 │    │
│  │  • Cookie handling                                  │    │
│  └─────────────────────────────────────────────────────┘    │
│           │                             │                    │
│           │                             │                    │
│  ┌────────▼─────────────┐    ┌─────────▼──────────────┐    │
│  │   React Query        │    │   Services/Mediators   │    │
│  │   • Data fetching    │    │   • Business logic     │    │
│  │   • Caching          │    │   • Data validation    │    │
│  │   • Mutations        │    │   • Error handling     │    │
│  └──────────────────────┘    └────────────────────────┘    │
│                                         │                    │
└─────────────────────────────────────────┼────────────────────┘
                                          │
                                          ▼
                              ┌───────────────────────┐
                              │   PostgreSQL Pool     │
                              │   • Connection pool   │
                              │   • Query helpers     │
                              │   • Transactions      │
                              └───────────────────────┘
                                          │
                                          ▼
                              ┌───────────────────────┐
                              │   PostgreSQL DB       │
                              │   • Users             │
                              │   • Settings          │
                              │   • Inventory         │
                              │   • Accounts          │
                              │   • Factory           │
                              │   • HRM               │
                              │   • Sales             │
                              └───────────────────────┘
```

## Request Flow

### 1. Authentication Flow

```
User Browser
    │
    │ 1. Navigate to /dashboard
    ▼
┌─────────────────────┐
│  Next.js Middleware │
│  (middleware.ts)    │
└─────────────────────┘
    │
    │ 2. Check authToken cookie
    │
    ├─── No token ───► Redirect to /login
    │
    └─── Has token ──► Continue to page
                        │
                        ▼
                   ┌─────────────────┐
                   │  Dashboard Page │
                   │  (page.tsx)     │
                   └─────────────────┘
                        │
                        │ 3. Fetch user data
                        ▼
                   ┌─────────────────┐
                   │  AuthContext    │
                   │  (useAuth hook) │
                   └─────────────────┘
                        │
                        │ 4. GET /api/auth/profile
                        ▼
                   ┌─────────────────┐
                   │  API Route      │
                   │  (route.ts)     │
                   └─────────────────┘
                        │
                        │ 5. Verify token
                        │ 6. Query database
                        ▼
                   ┌─────────────────┐
                   │  PostgreSQL     │
                   └─────────────────┘
                        │
                        │ 7. Return user data
                        ▼
                   ┌─────────────────┐
                   │  Dashboard Page │
                   │  (renders data) │
                   └─────────────────┘
```

### 2. Login Flow

```
User Browser
    │
    │ 1. Submit login form
    ▼
┌─────────────────────┐
│  Login Page         │
│  (/login/page.tsx)  │
└─────────────────────┘
    │
    │ 2. POST /api/auth/login
    │    { username, password }
    ▼
┌─────────────────────┐
│  API Route          │
│  (login/route.ts)   │
└─────────────────────┘
    │
    │ 3. Query user from DB
    ▼
┌─────────────────────┐
│  PostgreSQL         │
│  SELECT * FROM users│
└─────────────────────┘
    │
    │ 4. Verify password (bcrypt)
    │
    ├─── Invalid ───► Return 401 error
    │
    └─── Valid ──────► 5. Generate JWT token
                       │
                       ▼
                  ┌─────────────────┐
                  │  Set cookie     │
                  │  authToken      │
                  │  (httpOnly)     │
                  └─────────────────┘
                       │
                       │ 6. Return user data
                       ▼
                  ┌─────────────────┐
                  │  Login Page     │
                  │  (redirect to   │
                  │   /dashboard)   │
                  └─────────────────┘
```

### 3. API Request Flow

```
Client Component
    │
    │ 1. Fetch data
    │    fetch('/api/settings')
    ▼
┌─────────────────────┐
│  Next.js Middleware │
└─────────────────────┘
    │
    │ 2. Check authentication
    │
    ├─── No auth ───► Return 401
    │
    └─── Authenticated ──► 3. Forward to API route
                           │
                           ▼
                      ┌─────────────────┐
                      │  API Route      │
                      │  (route.ts)     │
                      └─────────────────┘
                           │
                           │ 4. Verify token
                           │ 5. Check permissions
                           │
                           ├─── No permission ───► Return 403
                           │
                           └─── Has permission ──► 6. Query database
                                                    │
                                                    ▼
                                               ┌─────────────────┐
                                               │  PostgreSQL     │
                                               └─────────────────┘
                                                    │
                                                    │ 7. Return data
                                                    ▼
                                               ┌─────────────────┐
                                               │  Client         │
                                               │  (render data)  │
                                               └─────────────────┘
```

## Component Architecture

### Client-Side Components

```
app/
├── layout.tsx (Root Layout)
│   ├── Providers (React Query)
│   │   └── AuthProvider (Auth Context)
│   │       └── children (Pages)
│   │
│   └── Metadata
│
├── page.tsx (Home)
│   └── Redirect logic
│
├── login/page.tsx (Login)
│   ├── Login form
│   ├── useAuth hook
│   └── Error handling
│
└── dashboard/page.tsx (Dashboard)
    ├── useAuth hook
    ├── User info display
    └── Logout button
```

### Server-Side API Routes

```
app/api/
├── auth/
│   ├── login/route.ts
│   │   └── POST: Authenticate user
│   ├── logout/route.ts
│   │   └── POST: Clear auth cookie
│   └── profile/route.ts
│       └── GET: Get user profile
│
└── settings/
    ├── route.ts
    │   ├── GET: Get all settings
    │   └── POST: Create/update setting
    └── [category]/route.ts
        ├── GET: Get settings by category
        └── PUT: Update category settings
```

## Data Flow

### State Management

```
┌─────────────────────────────────────────────────────────┐
│                    Client State                          │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐         ┌──────────────────┐     │
│  │  AuthContext     │         │  React Query     │     │
│  │  • user          │         │  • queries       │     │
│  │  • isLoading     │         │  • mutations     │     │
│  │  • isAuth        │         │  • cache         │     │
│  │  • login()       │         │  • invalidation  │     │
│  │  • logout()      │         │                  │     │
│  └──────────────────┘         └──────────────────┘     │
│         │                              │                 │
│         │                              │                 │
│         └──────────────┬───────────────┘                │
│                        │                                 │
│                        ▼                                 │
│              ┌──────────────────┐                       │
│              │  Components      │                       │
│              │  • Pages         │                       │
│              │  • UI elements   │                       │
│              └──────────────────┘                       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Database Layer

```
┌─────────────────────────────────────────────────────────┐
│                    Database Layer                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐         ┌──────────────────┐     │
│  │  Connection Pool │         │  Query Helpers   │     │
│  │  • pool.query()  │────────►│  • query()       │     │
│  │  • pool.connect()│         │  • getClient()   │     │
│  └──────────────────┘         └──────────────────┘     │
│         │                              │                 │
│         │                              │                 │
│         └──────────────┬───────────────┘                │
│                        │                                 │
│                        ▼                                 │
│              ┌──────────────────┐                       │
│              │  PostgreSQL DB   │                       │
│              │  • Tables        │                       │
│              │  • Indexes       │                       │
│              │  • Constraints   │                       │
│              └──────────────────┘                       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Security Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Security Layers                       │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Layer 1: Middleware                                     │
│  ┌────────────────────────────────────────────────┐    │
│  │  • Route protection                             │    │
│  │  • Token verification                           │    │
│  │  • Redirect unauthenticated users              │    │
│  └────────────────────────────────────────────────┘    │
│                        │                                 │
│                        ▼                                 │
│  Layer 2: API Routes                                    │
│  ┌────────────────────────────────────────────────┐    │
│  │  • Token validation                             │    │
│  │  • Permission checks                            │    │
│  │  • Input validation                             │    │
│  └────────────────────────────────────────────────┘    │
│                        │                                 │
│                        ▼                                 │
│  Layer 3: Business Logic                                │
│  ┌────────────────────────────────────────────────┐    │
│  │  • Data validation                              │    │
│  │  • Business rules                               │    │
│  │  • Error handling                               │    │
│  └────────────────────────────────────────────────┘    │
│                        │                                 │
│                        ▼                                 │
│  Layer 4: Database                                      │
│  ┌────────────────────────────────────────────────┐    │
│  │  • Parameterized queries                        │    │
│  │  • Constraints                                  │    │
│  │  • Transactions                                 │    │
│  └────────────────────────────────────────────────┘    │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Deployment Architecture

### Development

```
┌─────────────────────────────────────────────────────────┐
│                    Development Setup                     │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────┐         ┌──────────────────┐     │
│  │  Next.js Dev     │         │  Express Dev     │     │
│  │  Port 3000       │         │  Port 3001       │     │
│  │  (New system)    │         │  (Old system)    │     │
│  └──────────────────┘         └──────────────────┘     │
│         │                              │                 │
│         │                              │                 │
│         └──────────────┬───────────────┘                │
│                        │                                 │
│                        ▼                                 │
│              ┌──────────────────┐                       │
│              │  PostgreSQL      │                       │
│              │  (Shared DB)     │                       │
│              └──────────────────┘                       │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

### Production (Future)

```
┌─────────────────────────────────────────────────────────┐
│                    Production Setup                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Load Balancer / Reverse Proxy                   │  │
│  │  (Nginx / Traefik)                               │  │
│  └──────────────────────────────────────────────────┘  │
│                        │                                 │
│                        ▼                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Next.js Production                              │  │
│  │  • Multiple instances                            │  │
│  │  • PM2 / Docker                                  │  │
│  │  • Port 3000                                     │  │
│  └──────────────────────────────────────────────────┘  │
│                        │                                 │
│                        ▼                                 │
│  ┌──────────────────────────────────────────────────┐  │
│  │  PostgreSQL                                      │  │
│  │  • Connection pooling                            │  │
│  │  • Replication (optional)                        │  │
│  │  • Backups                                       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Technology Stack

```
┌─────────────────────────────────────────────────────────┐
│                    Technology Stack                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Frontend                                                │
│  • Next.js 16 (App Router)                              │
│  • React 19                                              │
│  • TypeScript 5                                          │
│  • Tailwind CSS 4                                        │
│  • React Query 5                                         │
│                                                           │
│  Backend                                                 │
│  • Next.js API Routes                                    │
│  • Node.js                                               │
│  • PostgreSQL (pg)                                       │
│                                                           │
│  Authentication                                          │
│  • JWT (jsonwebtoken)                                    │
│  • bcrypt.js                                             │
│  • HTTP-only cookies                                     │
│                                                           │
│  Development                                             │
│  • ESLint                                                │
│  • TypeScript                                            │
│  • Hot Module Replacement                                │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## File Organization

```
nextjs/
├── app/                    # Next.js App Router
│   ├── api/               # Server-side API routes
│   ├── [pages]/           # Client-side pages
│   ├── layout.tsx         # Root layout
│   └── providers.tsx      # React providers
│
├── contexts/              # React contexts
│   └── AuthContext.tsx    # Authentication state
│
├── lib/                   # Utilities and helpers
│   ├── auth.ts           # Auth utilities
│   ├── db.ts             # Database connection
│   └── *.ts              # Other utilities
│
├── types/                 # TypeScript types
│   ├── auth.ts           # Auth types
│   └── *.ts              # Other types
│
├── middleware.ts          # Next.js middleware
├── next.config.ts         # Next.js configuration
├── tsconfig.json          # TypeScript configuration
└── .env.local            # Environment variables
```

## Summary

This architecture provides:
- ✅ Unified frontend and backend
- ✅ Type-safe end-to-end
- ✅ Secure authentication
- ✅ Scalable structure
- ✅ Easy to maintain
- ✅ Ready for production
