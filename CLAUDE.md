# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repo layout

Three independent npm packages live side-by-side, each with its own `package.json`/`node_modules`:

- `backend/` — Express + TypeScript API (PostgreSQL)
- `frontend/` — Next.js 14 (App Router) + Tailwind + shadcn/Radix UI
- `e2e_testing/` — Playwright suite that drives the stack end-to-end

`packages/inventory` is referenced in `backend/index.ts` but currently commented out; the active inventory module lives under `backend/src/modules/inventory`.

## Common commands

**Backend** (from `backend/`):
```bash
npm run dev                # tsx watch src/index.ts
npm run build              # tsc + tsc-alias, copies PDF assets into dist/
npm run start              # node dist/index.js (requires build)
npm run db:migrate         # apply Flyway-style migrations via src/database/simple-migrator.ts
npm run db:migrate:info    # show pending/applied migration state
npm run db:validate        # validate migrations without applying
npm run db:migrate:flyway  # alternative path via flyway-manager.ts
npm run generate:license   # create a signed license file
npm run build:prod         # build + obfuscate (scripts/obfuscate.ts)
```

**Frontend** (from `frontend/`):
```bash
npm run dev                # next dev
npm run build && npm start # production build + serve on $PORT / 0.0.0.0
npm run lint               # next lint
npm run test               # vitest run  (picks up src/**/*.test.ts, node env)
npx vitest run path/to/file.test.ts   # single test file
```

**End-to-end** (from repo root):
```bash
./test.sh                  # full workflow: seed erp_test, backend:3002, frontend:3003, playwright
cd e2e_testing && npx playwright test                    # if services are already up
cd e2e_testing && npx playwright test path/to/spec.ts    # single spec
cd e2e_testing && npm run test:ui | test:headed | test:debug | codegen
```

`test.sh` provisions the test DB via `e2e_testing/scripts/test-db-setup.ts`, boots backend with `NODE_ENV=test PORT=3002 DB_NAME=erp_test`, boots frontend with `NEXT_PUBLIC_API_URL=http://localhost:3002/api PORT=3003`, then runs Playwright against `BASE_URL=http://localhost:3003`. Rate limiting is disabled when `NODE_ENV=test`.

## Backend architecture

### Layered request flow

`routes` → `controllers` → `mediators` (or `services`) → `database`. Mediators encapsulate multi-step business transactions (e.g. `modules/accounts/mediators/vouchers/AddVoucher.mediator.ts`); services are thinner cross-cutting helpers (`src/services/*IntegrationService.ts`). Validation lives under `validation/` (Joi/yup). The `@/` path alias maps to `backend/src/` (see `tsconfig.json`), rewritten at build time by `tsc-alias`.

### Module system (loose coupling)

Business domains live under `backend/src/modules/<domain>/` — currently `accounts`, `expenses`, `factory`, `hrm`, `inventory`, `salesrep`. Each module typically exposes:

- `index.ts` — a mounted `express.Router` that aggregates the domain's sub-routes
- `moduleInit.ts` — registers the module and its public mediators with the runtime registries
- `routes/`, `controllers/`, `mediators/`, `validation/` (plus `services/`, `utils/`, `types/` where needed)

Two singletons glue modules together without hard imports:

- `utils/moduleRegistry.ts` — modules register themselves under `MODULE_NAMES.*`; other modules check availability via `isModuleAvailable()` / `getModuleServices()` before calling in.
- `utils/InterModuleConnector.ts` — exposes named functions (e.g. `accModule.addSalesVoucher`) that other modules invoke when they need to post a voucher, create a receivable, etc. Wiring happens in `modules/accounts/moduleInit.ts` where many `*AccountsIntegrationService` methods are bound.

**Implication:** when adding a cross-module effect (e.g. "when sales creates an order, post a voucher"), register the new capability in the target module's `moduleInit.ts` rather than importing the service directly. `backend/src/index.ts` calls the `initialize*Module` functions in order — keep accounts first since other modules integrate with it.

### Master data

On startup (`src/index.ts`) the server runs `MasterDataSeeder.seed()` then `MasterDataLoader.load()` to warm an in-memory cache. Seeding failures do not crash the server — they log and continue. Code that reads master data should go through `MasterDataLoader` rather than re-querying.

### Auth, RBAC, audit

- JWT is read from the `authToken` cookie first, then `Authorization: Bearer` (`middleware/auth.ts`). `req.user` is populated with `user_id`, `role`, optional `permissions`, `factory_id`, `distribution_center_id`.
- Permission enforcement: `middleware/permission.ts` and `middleware/enhanced-permission.ts`.
- Audit logging: `middleware/audit.ts` + `services/audit-service.ts`. License gating runs through `middleware/licenseValidation.ts`.

### Database migrations

- Location: `backend/migrations/V{n}__<snake_case_description>.sql` (Flyway naming, 110+ files already applied). `flyway.conf` sets the file name separator to `__`.
- Applied with `npm run db:migrate` — `simple-migrator.ts` maintains a Flyway-compatible `flyway_schema_history` table so you can swap to real Flyway (`db:migrate:flyway`) if needed.
- **Never edit an applied migration** — add a new `V{next}` file.
- All tables use `BIGSERIAL PRIMARY KEY` and include `created_at`/`updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP` (see `.cursorrules`).

## Frontend architecture

- Next.js 14 App Router under `frontend/src/app/`. Two route groups: `(auth)` (login) and `(main)` (protected shell with sidebar); `(main)/layout.tsx` wraps authenticated pages.
- Global providers in `src/app/providers.tsx`: `ThemeProvider` → `QueryClientProvider` → `AuthProvider` → `RBACProvider` → `TooltipProvider` + toasters. React Query defaults to `staleTime: 60s` and `refetchOnWindowFocus: false`.
- `@/` alias resolves to `frontend/src/` (same in `tsconfig.json` and `vitest.config.ts`).
- Domain code is split between `src/modules/<domain>/` (self-contained feature UIs: `accounts`, `ecommerce`, `factory`, `hrm`, `inventory`, `sales`) and shared `src/components/`, `src/views/`, `src/services/`, `src/hooks/`, `src/contexts/`. The `(main)/<domain>/` route folders are thin wrappers that import from `src/modules/` or `src/views/`.
- API calls go through `src/services/*-api.ts` using a shared `apiClient` (axios). Base URL comes from `NEXT_PUBLIC_API_URL`. Form validation uses `react-hook-form` + `zod`.

## Environment

Backend `env.example` ships with `PORT=9000` and `CORS_ORIGIN=http://localhost:8080`, but dev convention (README, `test.sh`) actually uses `3001`/`5173` or `3002`/`3003` for tests. Check which port the current task targets before assuming. `CORS_ORIGIN` is comma-split into an allowlist in `src/index.ts`.

Key vars: `DB_HOST/PORT/NAME/USER/PASSWORD/SSL`, `PORT`, `NODE_ENV`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CORS_ORIGIN`, `LICENSE_FILE_PATH`, `LICENSE_ENCRYPTION_KEY` (≥32 chars). Frontend: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_BACKEND_BASE_URL`.

## Conventions (from .cursorrules)

- Strongly type exported APIs; avoid `any`. Prefer early returns and guard clauses.
- Respect the `routes → controllers → mediators/services → database` layering; don't move code across layers without reason.
- Reuse shared types in `backend/src/types/` and utilities in `backend/src/utils/`.
- Only comment the "why". Don't reformat unrelated code or batch broad refactors into a feature/fix.
- Don't edit `backend/dist/`; change `src/` and rebuild.
- Plural table names, `BIGSERIAL` PKs, `REFERENCES <table>(id)` for FKs.
- Playwright selectors should be stable — prefer roles/testids over brittle CSS.
