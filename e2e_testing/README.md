# ERP System E2E Tests

This directory contains end-to-end tests for the ERP System using Playwright.

## Project Structure

```
e2e_testing/
├── config/                    # Test configuration files
│   ├── global-setup.ts       # Global test setup
│   ├── global-teardown.ts    # Global test cleanup
│   └── auth-state.json       # Saved authentication state
├── fixtures/                 # Test data fixtures
│   └── test-data.json       # Sample test data
├── reports/                  # Test reports and artifacts
│   ├── html-report/         # HTML test reports
│   ├── test-results.json    # JSON test results
│   └── junit.xml           # JUnit format results
├── tests/                   # Test files
│   ├── brands/             # Brand module tests
│   │   └── brands.spec.ts  # Brand E2E tests
│   ├── categories/         # Category module tests
│   │   └── categories.spec.ts # Category E2E tests
│   └── origins/            # Origin module tests
│       └── origins.spec.ts # Origin E2E tests
├── utils/                  # Test utilities
│   ├── api-helpers.ts     # API testing helpers
│   ├── test-data-setup.ts # Test data creation
│   └── test-data-cleanup.ts # Test data cleanup
├── package.json           # Dependencies and scripts
├── playwright.config.ts   # Playwright configuration
├── tsconfig.json         # TypeScript configuration
└── env.example          # Environment variables template
```

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- PostgreSQL database for testing
- Backend and frontend applications running

### Installation

1. Navigate to the e2e_testing directory:
   ```bash
   cd e2e_testing
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Install Playwright browsers:
   ```bash
   npm run install:browsers
   ```

4. Copy environment configuration:
   ```bash
   cp env.example .env
   ```

5. Update `.env` with your configuration:
   ```env
   API_BASE_URL=http://localhost:5000/api
   BASE_URL=http://localhost:3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=erp_system_test
   DB_USER=postgres
   DB_PASSWORD=password
   TEST_USER_EMAIL=test@example.com
   TEST_USER_PASSWORD=testpassword
   ```

### Running Tests

#### All Tests
```bash
npm test
```

#### Specific Module Tests
```bash
npm run test:brands
npm run test:categories
npm run test:origins
```

#### Interactive Mode
```bash
npm run test:ui
```

#### Debug Mode
```bash
npm run test:debug
```

#### Headed Mode (with browser UI)
```bash
npm run test:headed
```

#### Generate Test Reports
```bash
npm run test:report
```

### Test Data Management

#### Setup Test Data
```bash
npm run setup
```

#### Cleanup Test Data
```bash
npm run cleanup
```

## Test Structure

### API Tests
- Test all REST endpoints
- Validate request/response formats
- Test authentication and authorization
- Test error handling
- Test data validation

### UI Tests
- Test user interactions
- Test form submissions
- Test navigation
- Test search and filtering
- Test pagination
- Test responsive design

### Accessibility Tests
- Test keyboard navigation
- Test screen reader compatibility
- Test ARIA labels and roles
- Test color contrast

### Performance Tests
- Test page load times
- Test API response times
- Test with large datasets

## Writing Tests

### Test File Structure
```typescript
import { test, expect } from '@playwright/test';
import { ApiHelper, PageHelper } from '../../utils/api-helpers';

test.describe('Module Name E2E Tests', () => {
  // Setup and teardown
  test.beforeAll(async ({ request }) => {
    // Global setup
  });

  test.beforeEach(async ({ page, request }) => {
    // Per-test setup
  });

  test.afterAll(async () => {
    // Global cleanup
  });

  test.describe('API Tests', () => {
    // API-specific tests
  });

  test.describe('UI Tests', () => {
    // UI-specific tests
  });
});
```

### Test Data Selectors
Use `data-testid` attributes for reliable element selection:
```html
<button data-testid="add-brand-button">Add Brand</button>
<input data-testid="brand-name" />
<table data-testid="brands-table">...</table>
```

### API Testing
```typescript
const response = await apiHelper.createBrand(authToken, {
  name: 'Test Brand',
  description: 'Test description'
});

expect(response.success).toBe(true);
expect(response.data.name).toBe('Test Brand');
```

### UI Testing
```typescript
await pageHelper.navigateTo('/brands');
await page.click('[data-testid="add-brand-button"]');
await page.fill('[data-testid="brand-name"]', 'Test Brand');
await page.click('[data-testid="save-brand-button"]');
await pageHelper.waitForToast('Brand created successfully');
```

## Configuration

### Playwright Configuration
The `playwright.config.ts` file contains:
- Browser configurations
- Test timeout settings
- Reporter configurations
- Parallel execution settings
- Global setup/teardown

### Environment Variables
- `API_BASE_URL`: Backend API URL
- `BASE_URL`: Frontend application URL
- `DB_*`: Database connection details
- `TEST_USER_*`: Test user credentials
- `CI`: Set to true for CI environment

## CI/CD Integration

### GitHub Actions Example
```yaml
- name: Run E2E Tests
  run: |
    cd e2e_testing
    npm ci
    npm run install:browsers
    npm test
```

### Test Reports
- HTML reports: `reports/html-report/index.html`
- JSON results: `reports/test-results.json`
- JUnit XML: `reports/junit.xml`

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify database is running
   - Check connection parameters in `.env`
   - Ensure test database exists

2. **Authentication Failures**
   - Verify test user exists
   - Check credentials in `.env`
   - Ensure user has proper permissions

3. **Element Not Found**
   - Verify `data-testid` attributes exist
   - Check element visibility
   - Add wait conditions

4. **Timeout Errors**
   - Increase timeout values
   - Check network conditions
   - Verify server response times

### Debug Mode
Run tests in debug mode to step through:
```bash
npm run test:debug
```

### Screenshots and Videos
Failed tests automatically capture:
- Screenshots on failure
- Videos for failed tests
- Traces for debugging

## Best Practices

1. **Use data-testid attributes** for element selection
2. **Wait for elements** before interacting
3. **Clean up test data** after tests
4. **Use realistic test data** that matches production patterns
5. **Test error scenarios** not just happy paths
6. **Keep tests independent** and isolated
7. **Use descriptive test names** and organize with describe blocks
8. **Test across multiple browsers** and screen sizes

## Contributing

1. Write tests for new features
2. Update existing tests when features change
3. Follow the established test structure
4. Add appropriate assertions
5. Include both positive and negative test cases
6. Document complex test scenarios

## Support

For questions or issues with E2E tests:
1. Check the troubleshooting section
2. Review Playwright documentation
3. Contact the development team
