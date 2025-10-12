import { test, expect, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from '../utils/login';

const TEST_CUSTOMER_NAME = 'E2E Customer Management Test';
const TEST_CUSTOMER_EMAIL = 'e2e-customer-mgmt@test.com';
const TEST_CUSTOMER_PHONE = '+8801234567890';
const TEST_CUSTOMER_COMPANY = 'E2E Test Company';
const UPDATED_CUSTOMER_NAME = 'E2E Customer Management Test (Updated)';
const UPDATED_CUSTOMER_COMPANY = 'E2E Test Company Updated';

// Helper function to select options from dropdown
async function selectOptionByLabel(modal: Locator, page: Page, label: string, option: string) {
  const container = modal.locator(`label:has-text("${label}")`).locator('..');
  const trigger = container.locator('button');
  await trigger.click();
  await page.getByRole('option', { name: option }).click();
}

// Helper function to create a test customer
async function createTestCustomer(
  page: Page,
  customerName: string = TEST_CUSTOMER_NAME,
  customerEmail: string = TEST_CUSTOMER_EMAIL
) {
  await page.goto('/factory/customers');

  // Click add customer button
  const addButton = page.getByTestId('add-customer-button');
  await expect(addButton).toBeVisible();
  await addButton.click();

  // Wait for customer form dialog
  const modal = page.getByTestId('customer-form-dialog');
  await expect(modal).toBeVisible();

  // Verify form title
  await expect(page.getByTestId('customer-form-title')).toContainText('Create New Customer');

  // Fill basic information
  await page.getByTestId('customer-name-input').fill(customerName);
  await page.getByTestId('customer-email-input').fill(customerEmail);
  await page.getByTestId('phone-input').fill(TEST_CUSTOMER_PHONE);
  await page.getByTestId('company-input').fill(TEST_CUSTOMER_COMPANY);

  // Fill credit information
  await page.getByTestId('credit-limit-input').fill('50000');

  // Select payment terms
  await selectOptionByLabel(modal, page, 'Payment Terms', 'Net 30 days');

  // Fill address information
  await page.getByTestId('street-address-input').fill('123 Test Street');
  await page.getByTestId('city-input').fill('Dhaka');
  await page.getByTestId('state-input').fill('Dhaka');
  await page.getByTestId('postal-code-input').fill('1200');

  // Select country
  await selectOptionByLabel(modal, page, 'Country', 'Bangladesh');

  // Submit form
  const submitButton = page.getByTestId('submit-customer-button');
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  // Wait for modal to close
  await expect(modal).toBeHidden();

  return { customerName, customerEmail };
}

// Helper function to delete test customer
async function deleteTestCustomer(page: Page, customerName: string) {
  await page.goto('/factory/customers');

  // Search for the customer
  const searchInput = page.getByTestId('customer-search-input');
  await searchInput.fill(customerName);

  // Find customer row
  const customerRow = page.getByTestId('customer-row').filter({ hasText: customerName });
  await expect(customerRow).toBeVisible();

  // Click delete button
  const deleteButton = page.getByTestId('delete-customer-button');
  await deleteButton.click();

  // Confirm deletion
  const confirmDialog = page.getByRole('dialog', { name: /delete customer/i });
  await expect(confirmDialog).toBeVisible();
  const deleteConfirmButton = confirmDialog.getByRole('button', { name: /delete/i });
  await deleteConfirmButton.click();

  // Wait for customer to be removed
  await expect(customerRow).toBeHidden();
}

test.describe.serial('Customer Management - CRUD Operations', () => {
  let createdCustomerName = '';
  let createdCustomerEmail = '';

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('displays customer management page correctly', async ({ page }) => {
    await page.goto('/factory/customers');

    // Check page header
    await expect(page.getByRole('heading', { name: 'Customer Management' })).toBeVisible();
    await expect(page.getByText('Manage factory customers and their information')).toBeVisible();

    // Check action buttons
    await expect(page.getByTestId('refresh-customers-button')).toBeVisible();
    await expect(page.getByTestId('add-customer-button')).toBeVisible();

    // Check stats cards
    await expect(page.getByText('Total Customers')).toBeVisible();
    await expect(page.getByText('Companies')).toBeVisible();
    await expect(page.getByText('Credit Customers')).toBeVisible();
    await expect(page.getByText('This Month')).toBeVisible();
  });

  test('creates a new customer successfully', async ({ page }) => {
    const timestamp = Date.now();
    const customerName = `${TEST_CUSTOMER_NAME} ${timestamp}`;
    const customerEmail = `e2e-customer-${timestamp}@test.com`;

    const result = await createTestCustomer(page, customerName, customerEmail);
    createdCustomerName = result.customerName;
    createdCustomerEmail = result.customerEmail;

    // Verify customer appears in the list
    const searchInput = page.getByTestId('customer-search-input');
    await searchInput.fill(customerName);

    const customerRow = page.getByTestId('customer-row').filter({ hasText: customerName });
    await expect(customerRow).toBeVisible();
    await expect(customerRow).toContainText(customerEmail);
    await expect(customerRow).toContainText(TEST_CUSTOMER_PHONE);
    await expect(customerRow).toContainText(TEST_CUSTOMER_COMPANY);
  });

  test('displays customer details correctly', async ({ page }) => {
    test.skip(createdCustomerName === '', 'Customer must be created first');

    await page.goto('/factory/customers');

    // Search for the customer
    const searchInput = page.getByTestId('customer-search-input');
    await searchInput.fill(createdCustomerName);

    const customerRow = page.getByTestId('customer-row').filter({ hasText: createdCustomerName });
    await expect(customerRow).toBeVisible();

    // Click view details button
    const viewButton = page.getByTestId('view-customer-button');
    await viewButton.click();

    // Verify details dialog opens
    const detailsDialog = page.getByRole('dialog', { name: /customer details/i });
    await expect(detailsDialog).toBeVisible();
    await expect(detailsDialog).toContainText(createdCustomerName);
    await expect(detailsDialog).toContainText(createdCustomerEmail);
    await expect(detailsDialog).toContainText(TEST_CUSTOMER_PHONE);
    await expect(detailsDialog).toContainText(TEST_CUSTOMER_COMPANY);

    // Close details dialog
    await detailsDialog.getByRole('button', { name: /close/i }).click();
    await expect(detailsDialog).toBeHidden();
  });

  test('edits customer information', async ({ page }) => {
    test.skip(createdCustomerName === '', 'Customer must be created first');

    await page.goto('/factory/customers');

    // Search for the customer
    const searchInput = page.getByTestId('customer-search-input');
    await searchInput.fill(createdCustomerName);

    const customerRow = page.getByTestId('customer-row').filter({ hasText: createdCustomerName });
    await expect(customerRow).toBeVisible();

    // Click edit button
    const editButton = page.getByTestId('edit-customer-button');
    await editButton.click();

    // Verify edit dialog opens
    const editDialog = page.getByTestId('customer-form-dialog');
    await expect(editDialog).toBeVisible();
    await expect(page.getByTestId('customer-form-title')).toContainText('Edit Customer');

    // Verify current values are populated
    await expect(page.getByTestId('customer-name-input')).toHaveValue(createdCustomerName);
    await expect(page.getByTestId('customer-email-input')).toHaveValue(createdCustomerEmail);

    // Update customer information
    await page.getByTestId('customer-name-input').fill(UPDATED_CUSTOMER_NAME);
    await page.getByTestId('company-input').fill(UPDATED_CUSTOMER_COMPANY);

    // Submit changes
    const submitButton = page.getByTestId('submit-customer-button');
    await submitButton.click();

    // Wait for dialog to close
    await expect(editDialog).toBeHidden();

    // Verify updated information appears
    await expect(customerRow).toContainText(UPDATED_CUSTOMER_NAME);
    await expect(customerRow).toContainText(UPDATED_CUSTOMER_COMPANY);
    createdCustomerName = UPDATED_CUSTOMER_NAME; // Update for subsequent tests
  });

  test('searches customers by name, email, and company', async ({ page }) => {
    test.skip(createdCustomerName === '', 'Customer must be created first');

    await page.goto('/factory/customers');

    const searchInput = page.getByTestId('customer-search-input');

    // Test search by name
    await searchInput.fill(createdCustomerName);
    await expect(page.getByTestId('customer-row')).toHaveCount(1);

    // Test search by email
    await searchInput.fill(createdCustomerEmail);
    await expect(page.getByTestId('customer-row')).toHaveCount(1);

    // Test search by company
    await searchInput.fill(UPDATED_CUSTOMER_COMPANY);
    await expect(page.getByTestId('customer-row')).toHaveCount(1);

    // Test search with partial match
    await searchInput.fill(createdCustomerName.substring(0, 10));
    await expect(page.getByTestId('customer-row')).toHaveCount(1);

    // Clear search
    await searchInput.fill('');
    const totalCustomers = await page.getByTestId('customer-row').count();
    expect(totalCustomers).toBeGreaterThanOrEqual(1);
  });

  test('displays customer statistics correctly', async ({ page }) => {
    await page.goto('/factory/customers');

    // Check if stats are displayed
    await expect(page.getByText('Total Customers')).toBeVisible();
    await expect(page.getByText('Companies')).toBeVisible();
    await expect(page.getByText('Credit Customers')).toBeVisible();
    await expect(page.getByText('This Month')).toBeVisible();

    // Verify stats contain numbers
    const totalCustomersText = await page.locator('text=Total Customers').locator('..').locator('..').getByRole('heading').textContent();
    expect(totalCustomersText).toMatch(/\d+/);

    const companiesText = await page.locator('text=Companies').locator('..').locator('..').getByRole('heading').textContent();
    expect(companiesText).toMatch(/\d+/);
  });

  test('refreshes customer data', async ({ page }) => {
    await page.goto('/factory/customers');

    // Click refresh button
    const refreshButton = page.getByTestId('refresh-customers-button');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // Verify page still loads correctly after refresh
    await expect(page.getByRole('heading', { name: 'Customer Management' })).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });

  test('deletes a customer (marks as inactive)', async ({ page }) => {
    test.skip(createdCustomerName === '', 'Customer must be created first');

    await deleteTestCustomer(page, createdCustomerName);

    // Verify customer is no longer in active list
    const searchInput = page.getByTestId('customer-search-input');
    await searchInput.fill(createdCustomerName);
    await expect(page.getByTestId('customer-row')).toHaveCount(0);

    // Reset for cleanup
    createdCustomerName = '';
    createdCustomerEmail = '';
  });
});

test.describe('Customer Management - Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('validates required fields in customer form', async ({ page }) => {
    await page.goto('/factory/customers');

    // Click add customer button
    const addButton = page.getByTestId('add-customer-button');
    await addButton.click();

    const modal = page.getByTestId('customer-form-dialog');
    await expect(modal).toBeVisible();

    // Try to submit without required fields
    const submitButton = page.getByTestId('submit-customer-button');
    await submitButton.click();

    // Form should still be open (validation failed)
    await expect(modal).toBeVisible();

    // Fill required fields
    await page.getByTestId('customer-name-input').fill('Test Customer');
    await page.getByTestId('customer-email-input').fill('test@example.com');

    // Submit should work now
    await submitButton.click();
    await expect(modal).toBeHidden();
  });

  test('validates email format', async ({ page }) => {
    await page.goto('/factory/customers');

    // Click add customer button
    const addButton = page.getByTestId('add-customer-button');
    await addButton.click();

    const modal = page.getByTestId('customer-form-dialog');
    await expect(modal).toBeVisible();

    // Fill invalid email
    await page.getByTestId('customer-name-input').fill('Test Customer');
    await page.getByTestId('customer-email-input').fill('invalid-email');

    // Submit
    const submitButton = page.getByTestId('submit-customer-button');
    await submitButton.click();

    // Form should still be open (validation failed)
    await expect(modal).toBeVisible();

    // Fix email
    await page.getByTestId('customer-email-input').fill('valid@example.com');
    await submitButton.click();
    await expect(modal).toBeHidden();
  });
});
