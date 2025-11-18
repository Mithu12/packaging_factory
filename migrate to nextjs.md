Next.js Migration Plan
Overview
Migrate the ERP system from Vite+React frontend + Express backend to a unified Next.js application using App Router with client-side rendering. Backend Express routes will be migrated incrementally to Next.js API routes, allowing both systems to run in parallel during migration.

Current Architecture
Frontend: React + Vite + React Router (port 8080)
Backend: Express.js API server (port 5000/3001)
Database: PostgreSQL with connection pooling
Modules: inventory, accounts, factory, hrm, sales, salesrep
Target Architecture
Unified Next.js App: App Router with CSR pages + API routes
Database: Shared PostgreSQL connection (reuse existing pool)
Incremental Migration: Module-by-module approach
Migration Strategy
Phase 1: Next.js Setup & Foundation
Initialize Next.js project in new application/ directory
Use App Router (app/ directory)
Configure TypeScript, Tailwind CSS, ESLint
Set up path aliases (@/ for src/)
Copy shared utilities, types, and components
Database & Shared Code Setup
Create lib/db.ts for PostgreSQL connection (reuse backend connection logic)
Migrate shared types from backend/src/types/ to types/
Migrate utilities from backend/src/utils/ to lib/utils/
Set up middleware for auth, RBAC, audit (convert Express middleware to Next.js)
Environment Configuration
Create .env.local with database and API configs
Set up environment variable validation
Configure CORS for hybrid setup (Next.js + Express during migration)
Phase 2: Frontend Migration (CSR)
Core Infrastructure
Migrate AuthContext and RBACContext to Next.js providers
Set up React Query provider in root layout
Convert React Router routes to Next.js App Router pages (client components)
Migrate DashboardLayout and shared components
Page Migration (incrementally)
Start with core pages: Login, Dashboard, Profile
Migrate module pages one at a time (inventory → accounts → factory → hrm → sales → salesrep)
Convert API service calls to use Next.js API routes (when available) or proxy to Express
Component Migration
Migrate UI components from frontend/src/components/ui/
Migrate module-specific components
Update imports to use Next.js conventions
Phase 3: Backend API Routes Migration (Incremental)
For each module, migrate in this order:
Auth Module (foundation)
Create app/api/auth/[...]/route.ts for login/logout
Migrate auth middleware to Next.js middleware
Test authentication flow
Settings Module (simple, low risk)
Create app/api/settings/route.ts
Migrate settings routes and controllers
Inventory Module
Create app/api/inventory/[...]/route.ts for suppliers, products, categories, etc.
Migrate routes, controllers, mediators, and services
Update frontend to use new API routes
Accounts Module
Create app/api/accounts/[...]/route.ts
Migrate accounts integration logic
Factory Module
Create app/api/factory/[...]/route.ts
Migrate complex factory workflows
HRM Module
Create app/api/hrm/[...]/route.ts
Sales & SalesRep Modules
Create app/api/sales/[...]/route.ts and app/api/salesrep/[...]/route.ts
Phase 4: Module Migration Pattern
For each module:
Create Next.js API route handlers in app/api/[module]/[...]/route.ts
Migrate Express route → Next.js route handler
Migrate controller logic (adapt Express req/res to Next.js Request/Response)
Reuse mediators and services (minimal changes)
Migrate validation schemas
Update frontend API services to call Next.js routes
Test thoroughly
Mark Express routes as deprecated (keep for fallback)
Phase 5: Cleanup & Optimization
Remove Express backend once all modules migrated
Consolidate database connections
Optimize Next.js build configuration
Update deployment scripts
Update documentation
Key Files to Create/Modify
New Next.js Structure
nextjs/
├── app/
│   ├── layout.tsx                 # Root layout with providers
│   ├── page.tsx                   # Home/redirect page
│   ├── login/page.tsx             # Login page (client component)
│   ├── dashboard/page.tsx         # Dashboard (client component)
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...slug]/route.ts
│   │   ├── inventory/
│   │   │   └── [...slug]/route.ts
│   │   └── [module]/[...slug]/route.ts
│   └── [module]/
│       └── [page]/page.tsx        # Module pages
├── lib/
│   ├── db.ts                      # Database connection
│   ├── auth.ts                    # Auth utilities
│   └── utils.ts                   # Shared utilities
├── types/                         # Shared TypeScript types
├── middleware.ts                  # Next.js middleware (auth, RBAC)
└── next.config.js
Migration Adaptations
Express Route → Next.js Route Handler:
// Express (old)
app.get('/api/suppliers', async (req, res) => {
  const result = await getSuppliers();
  res.json(result);
});

// Next.js (new)
// app/api/suppliers/route.ts
export async function GET(request: Request) {
  const result = await getSuppliers();
  return Response.json(result);
}
Middleware Conversion:
Express middleware → Next.js middleware (middleware.ts)
Auth checks → Next.js middleware + route handlers
RBAC → Server-side checks in API routes
Database Connection:
Reuse backend/src/database/connection.ts logic
Create singleton connection pool for Next.js
Ensure proper connection cleanup
Testing Strategy
Parallel Running: Keep Express backend running during migration
Feature Flags: Use env vars to toggle between Express/Next.js APIs
Incremental Testing: Test each migrated module before moving to next
E2E Tests: Update Playwright tests to work with Next.js
Risk Mitigation
Keep Express backend as fallback during migration
Use feature flags to toggle API endpoints
Migrate one module at a time
Maintain database compatibility
Preserve all existing functionality
Dependencies to Add
next: ^14.x (App Router)
@next/font: For font optimization
Reuse existing dependencies where possible (react-query, axios, etc.)
Notes
All pages will be client components ('use client') for CSR approach
API routes handle server-side logic
Database migrations remain in backend/migrations/ (shared)
Environment variables need to support both systems during transition