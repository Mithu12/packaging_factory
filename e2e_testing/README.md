# ERP End-to-End Tests

This workspace contains Playwright-based end-to-end coverage for the ERP product flows. It lives alongside the frontend and backend code in the repository root:

```
root
 ├─ backend
 ├─ frontend
 └─ e2e_testing  ← this package
```

## Quick start

1. Install dependencies and Playwright browsers:
   ```bash
   cd e2e_testing
   npm install
   npx playwright install
   ```
2. Ensure a local PostgreSQL instance is running and accessible with the credentials defined in `.env` (defaults match the backend dev setup).
3. Run the suite:
   ```bash
   npm test
   ```

The Playwright configuration automatically:
- Creates a dedicated `erp_e2e` database, runs the backend migrations, and seeds reference data (category, brand, origin, supplier) used by the product tests.
- Boots both backend and frontend dev servers against that database when the tests start.
- Tears the database back down after the run (set `KEEP_E2E_DB=true` to skip dropping it).

## Tests included

- `product.e2e.spec.ts` exercises the key product journeys:
  - Admin login and navigation to the product catalog.
  - Creating a new product via the UI, wiring it to the seeded category/brand/origin/supplier records, and verifying it appears in the list.
  - Opening the product detail view, validating related metadata, and jumping into the supplier details page.

Add additional specs under `tests/` and re-use the helpers in `utils/` (for example `loginAsAdmin`).

## Environment overrides

Customize the `.env` file if your local ports or database credentials differ. All values can also be injected via environment variables when running the tests (e.g. `BACKEND_PORT`, `BACKEND_DB_NAME`).

