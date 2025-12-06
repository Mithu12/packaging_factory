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

## Running with Manual Servers (Recommended for Development)

For faster iteration during development, you can manually start the servers and skip the database reset:

1. **First time setup** - Create the test database and run migrations:
   ```bash
   # Create database
   PGPASSWORD=sa psql -U postgres -h localhost -c "CREATE DATABASE erp_e2e;"
   
   # Run migrations
   cd backend && DB_NAME=erp_e2e DB_USER=postgres DB_PASSWORD=sa npm run db:migrate
   
   # Seed test data
   cd e2e_testing && npm run seed
   ```

2. **Start servers** (in separate terminals):
   ```bash
   # Terminal 1 - Backend (port 5500)
   cd backend
   PORT=5500 DB_NAME=erp_e2e DB_USER=postgres DB_PASSWORD=sa \
     CORS_ORIGIN="http://127.0.0.1:3500" npm run dev
   
   # Terminal 2 - Frontend (port 3500)
   cd frontend
   VITE_API_URL="http://127.0.0.1:5500/api" npm run dev -- --host 127.0.0.1 --port 3500
   ```

3. **Run tests** (skipping database reset):
   ```bash
   cd e2e_testing
   SKIP_DB_RESET=true npm test
   ```

   With this setup, servers are reused between test runs, making iteration much faster.

## Automatic Server Mode

The Playwright configuration automatically:
- Creates a dedicated `erp_e2e` database, runs the backend migrations, and seeds reference data (category, brand, origin, supplier) used by the product tests.
- Boots both backend and frontend dev servers against that database when the tests start.
- Tears the database back down after the run (set `KEEP_E2E_DB=true` to skip dropping it).

**Note**: In automatic mode, the global setup drops and recreates the database. If you have manually started servers running against the same database, their connections will be terminated and they may crash. Use the manual server mode described above for development.

## Tests included

- `product.e2e.spec.ts` exercises comprehensive product management flows:
  - **CRUD Operations**:
    - Creating a new product with all required fields (name, category, supplier, pricing, stock levels)
    - Auto-generated SKU and barcode generation
    - Searching and filtering products by name and SKU
    - Viewing product details with all metadata (category, brand, origin, supplier)
    - Editing existing products (description, pricing, etc.)
    - Adjusting stock (increase/decrease with reasons)
    - Toggling product status (activate/deactivate)
  - **Form Validation**:
    - Required field validation
    - Numeric field validation for prices and stock
    - Auto-SKU generation from product name
    - Barcode generation from SKU
  - **List Page Features**:
    - Statistics cards display (total products, low stock, categories, total value)
    - Categories sidebar
    - Product table columns verification
    - Pagination functionality
  - **Navigation**:
    - Back navigation from product details to list
    - Back navigation from edit page to details
    - Navigation to supplier details from product page

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

