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

   **Available test commands**:
   - `npm test` - Run all tests serially (recommended)
   - `npm run test:serial` - Explicit serial execution
   - `npm run test:headed` - Run tests with browser UI visible (serial)
   - `npm run test:ui` - Run tests with Playwright UI mode (serial)
   - `npm run test:debug` - Run tests in debug mode (serial)

   **Note**: Tests are configured to run serially (one by one) to avoid overwhelming the backend with concurrent requests. If you need to run tests in parallel for faster execution, use:
   ```bash
   npx playwright test --fully-parallel --workers=4
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

- `factory-customer.e2e.spec.ts` exercises the factory and customer management flows:
  - **Factory Management**:
    - Creating new factories with location and contact details
    - Editing factory information and settings
    - Managing factory user assignments and permissions
    - Deleting factories and cleanup operations
  - **Customer Management**:
    - Creating new customers with business information and credit limits
    - Viewing and editing customer details including payment terms and addresses
    - Searching and filtering customers by name, email, or company
    - Managing customer status (active/inactive) and statistics
    - Customer data refresh and validation

Add additional specs under `tests/` and re-use the helpers in `utils/` (for example `loginAsAdmin`).

## Environment overrides

Customize the `.env` file if your local ports or database credentials differ. All values can also be injected via environment variables when running the tests (e.g. `BACKEND_PORT`, `BACKEND_DB_NAME`).

