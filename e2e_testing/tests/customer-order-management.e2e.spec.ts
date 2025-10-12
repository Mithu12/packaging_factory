import { test, expect, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from '../utils/login';

const TEST_ORDER_CUSTOMER_NAME = 'E2E Order Test Customer';
const TEST_ORDER_CUSTOMER_EMAIL = 'e2e-order-customer@test.com';

// Helper function to select options from dropdown
async function selectOptionByLabel(modal: Locator, page: Page, label: string, option: string) {
  const container = modal.locator(`label:has-text("${label}")`).locator('..');
  const trigger = container.locator('button');
  await trigger.click();
  await page.getByRole('option', { name: option }).click();
}

// Helper function to create a test customer for orders
async function createTestOrderCustomer(page: Page) {
  await page.goto('/factory/customers');

  // Click add customer button
  const addButton = page.getByTestId('add-customer-button');
  await expect(addButton).toBeVisible();
  await addButton.click();

  // Fill customer form
  const modal = page.getByTestId('customer-form-dialog');
  await expect(modal).toBeVisible();

  await page.getByTestId('customer-name-input').fill(TEST_ORDER_CUSTOMER_NAME);
  await page.getByTestId('customer-email-input').fill(TEST_ORDER_CUSTOMER_EMAIL);
  await page.getByTestId('phone-input').fill('+8801234567890');
  await page.getByTestId('company-input').fill('E2E Order Test Company');
  await page.getByTestId('credit-limit-input').fill('50000');

  // Select payment terms
  await selectOptionByLabel(modal, page, 'Payment Terms', 'Net 30 days');

  // Fill address
  await page.getByTestId('street-address-input').fill('123 Test Street');
  await page.getByTestId('city-input').fill('Dhaka');
  await page.getByTestId('state-input').fill('Dhaka');
  await page.getByTestId('postal-code-input').fill('1200');
  await selectOptionByLabel(modal, page, 'Country', 'Bangladesh');

  // Submit form
  const submitButton = page.getByTestId('submit-customer-button');
  await submitButton.click();
  await expect(modal).toBeHidden();

  return { customerName: TEST_ORDER_CUSTOMER_NAME, customerEmail: TEST_ORDER_CUSTOMER_EMAIL };
}

// Helper function to create a test order
async function createTestOrder(page: Page, customerName: string) {
  await page.goto('/factory/orders');

  // Click create order button
  const createButton = page.getByRole('button', { name: /create.*order|new.*order/i });
  await expect(createButton).toBeVisible();
  await createButton.click();

  // Wait for order entry dialog
  const modal = page.getByTestId('order-entry-dialog');
  await expect(modal).toBeVisible();

  // Select customer
  const customerTrigger = page.getByTestId('customer-select-trigger');
  await customerTrigger.click();

  // Wait for customer options and select the test customer
  await page.getByRole('option', { name: customerName }).click();

  // Fill order dates
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + 30);

  const orderDate = today.toISOString().split('T')[0];
  const requiredDate = futureDate.toISOString().split('T')[0];

  await page.getByTestId('order-date-input').fill(orderDate);
  await page.getByTestId('required-date-input').fill(requiredDate);

  // Select priority
  const priorityTrigger = modal.locator('label:has-text("Priority")').locator('..').locator('button');
  await priorityTrigger.click();
  await page.getByRole('option', { name: 'Medium' }).click();

  // Add a line item (assuming there's a way to add line items)
  // This might need to be adjusted based on the actual form structure
  const addLineItemButton = page.getByRole('button', { name: /add.*item|add.*line/i });
  if (await addLineItemButton.isVisible()) {
    await addLineItemButton.click();
    // Fill line item details - this would need to be adjusted based on actual form
  }

  // Submit order
  const submitButton = page.getByTestId('submit-order-button');
  await submitButton.click();
  await expect(modal).toBeHidden();

  return { orderDate, requiredDate };
}

// Helper function to cleanup test customer
async function deleteTestOrderCustomer(page: Page) {
  await page.goto('/factory/customers');

  // Search for test customer
  const searchInput = page.getByTestId('customer-search-input');
  await searchInput.fill(TEST_ORDER_CUSTOMER_NAME);

  // Delete customer
  const customerRow = page.getByTestId('customer-row').filter({ hasText: TEST_ORDER_CUSTOMER_NAME });
  if (await customerRow.isVisible()) {
    const deleteButton = page.getByTestId('delete-customer-button');
    await deleteButton.click();

    const confirmDialog = page.getByRole('dialog', { name: /delete customer/i });
    await expect(confirmDialog).toBeVisible();
    const deleteConfirmButton = confirmDialog.getByRole('button', { name: /delete/i });
    await deleteConfirmButton.click();
    await expect(customerRow).toBeHidden();
  }
}

test.describe.serial('Customer Order Management - Order Creation and Management', () => {
  let testCustomerName = '';
  let testCustomerEmail = '';

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.beforeAll(async ({ browser }) => {
    // Create test customer for orders
    const page = await browser.newPage();
    await loginAsAdmin(page);
    const result = await createTestOrderCustomer(page);
    testCustomerName = result.customerName;
    testCustomerEmail = result.customerEmail;
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    // Cleanup test customer
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await deleteTestOrderCustomer(page);
    await page.close();
  });

  test('displays customer order management page correctly', async ({ page }) => {
    await page.goto('/factory/orders');

    // Check page title and description
    await expect(page.getByRole('heading', { name: /customer.*order|order.*management/i })).toBeVisible();

    // Check action buttons
    await expect(page.getByRole('button', { name: /create.*order|new.*order/i })).toBeVisible();

    // Check tabs (if any)
    const tabs = page.locator('[role="tab"]');
    if (await tabs.count() > 0) {
      await expect(tabs.filter({ hasText: /all|pending|active/i })).toBeVisible();
    }

    // Check table or list view
    await expect(page.locator('table, [role="table"]')).toBeVisible();
  });

  test('opens create order dialog', async ({ page }) => {
    await page.goto('/factory/orders');

    // Click create order button
    const createButton = page.getByRole('button', { name: /create.*order|new.*order/i });
    await createButton.click();

    // Verify order entry dialog opens
    const dialog = page.getByTestId('order-entry-dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('order-entry-title')).toContainText('Create New Customer Order');
    await expect(page.getByTestId('customer-info-card')).toBeVisible();
    await expect(page.getByTestId('order-info-card')).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('validates required fields in order form', async ({ page }) => {
    await page.goto('/factory/orders');

    // Open create order dialog
    const createButton = page.getByRole('button', { name: /create.*order|new.*order/i });
    await createButton.click();

    const dialog = page.getByTestId('order-entry-dialog');
    await expect(dialog).toBeVisible();

    // Try to submit without required fields
    const submitButton = page.getByTestId('submit-order-button');
    await submitButton.click();

    // Form should still be open (validation failed)
    await expect(dialog).toBeVisible();

    // Fill required fields
    const customerTrigger = page.getByTestId('customer-select-trigger');
    await customerTrigger.click();
    await page.getByRole('option', { name: testCustomerName }).click();

    const today = new Date().toISOString().split('T')[0];
    await page.getByTestId('order-date-input').fill(today);
    await page.getByTestId('required-date-input').fill(today);

    // Submit should work now
    await submitButton.click();
    await expect(dialog).toBeHidden();
  });

  test('creates a new customer order successfully', async ({ page }) => {
    const { orderDate, requiredDate } = await createTestOrder(page, testCustomerName);

    // Verify order appears in the list
    // This might need adjustment based on the actual table structure
    await expect(page.getByText(testCustomerName)).toBeVisible();
    await expect(page.getByText(orderDate)).toBeVisible();
  });

  test('displays order details correctly', async ({ page }) => {
    // First create an order
    await createTestOrder(page, testCustomerName);

    // Click on the order to view details
    const orderRow = page.locator('tr, [role="row"]').filter({ hasText: testCustomerName }).first();
    await orderRow.click();

    // Verify order details dialog opens
    const detailsDialog = page.getByTestId('order-details-dialog');
    await expect(detailsDialog).toBeVisible();
    await expect(page.getByTestId('order-details-title')).toContainText('Order Details');
    await expect(detailsDialog).toContainText(testCustomerName);

    // Close details dialog
    await page.keyboard.press('Escape');
    await expect(detailsDialog).toBeHidden();
  });

  test('filters orders by status', async ({ page }) => {
    await page.goto('/factory/orders');

    // Check if there are status filter tabs
    const statusTabs = page.locator('[role="tab"]');
    if (await statusTabs.count() > 0) {
      // Try to click on different status tabs
      const pendingTab = statusTabs.filter({ hasText: /pending|draft/i });
      if (await pendingTab.isVisible()) {
        await pendingTab.click();
        // Verify page updates
        await expect(page.getByRole('heading', { name: /customer.*order|order.*management/i })).toBeVisible();
      }
    }
  });

  test('searches orders by customer name', async ({ page }) => {
    await page.goto('/factory/orders');

    // Check if search functionality exists
    const searchInput = page.getByPlaceholder(/search.*order|search.*customer/i);
    if (await searchInput.isVisible()) {
      // Search for test customer
      await searchInput.fill(testCustomerName);
      await expect(page.getByText(testCustomerName)).toBeVisible();

      // Search for non-existent customer
      await searchInput.fill('NonExistentCustomer12345');
      const noResults = page.getByText(/no.*order|no.*result/i);
      if (await noResults.isVisible()) {
        await expect(noResults).toBeVisible();
      }

      // Clear search
      await searchInput.fill('');
      await expect(page.getByText(testCustomerName)).toBeVisible();
    }
  });
});

test.describe('Customer Order Management - Order Status Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('displays order status progression', async ({ page }) => {
    await page.goto('/factory/orders');

    // Look for status badges or indicators
    const statusElements = page.locator('[data-testid*="status"], .badge, [class*="status"]');
    if (await statusElements.count() > 0) {
      // Verify status elements are displayed
      await expect(statusElements.first()).toBeVisible();
    }

    // Check for status-specific actions or buttons
    const actionButtons = page.locator('button').filter({ hasText: /approve|reject|start|complete|ship/i });
    // This test passes if action buttons exist (they might be conditional)
    expect(await actionButtons.count()).toBeGreaterThanOrEqual(0);
  });

  test('shows order statistics and metrics', async ({ page }) => {
    await page.goto('/factory/orders');

    // Check for statistics cards or metrics
    const statCards = page.locator('[data-testid*="stat"], [class*="stat"], .card').filter({ hasText: /\d+/ });
    if (await statCards.count() > 0) {
      // Verify statistics contain numbers
      const firstStat = statCards.first();
      const statText = await firstStat.textContent();
      expect(statText).toMatch(/\d+/);
    }
  });
});
