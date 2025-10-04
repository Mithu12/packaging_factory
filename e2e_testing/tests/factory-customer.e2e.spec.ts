import { test, expect, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from '../utils/login';

const FACTORY_NAME = 'E2E Test Factory';
const FACTORY_CODE = 'ETF001';
const FACTORY_LOCATION = 'Dhaka, Bangladesh';

const CUSTOMER_NAME = 'E2E Test Customer';
const CUSTOMER_EMAIL = 'e2e-customer@test.com';
const CUSTOMER_PHONE = '+8801234567890';
const CUSTOMER_COMPANY = 'E2E Test Company';

// Helper function to select options from dropdown
async function selectOptionByLabel(modal: Locator, page: Page, label: string, option: string) {
  const container = modal.locator(`label:has-text("${label}")`).locator('..');
  const trigger = container.locator('button');
  await trigger.click();
  await page.getByRole('option', { name: option }).click();
}

// Helper function to create a factory
async function createFactory(page: Page, factoryName: string, factoryCode: string) {
  await page.goto('/factory/management');

  // Click add factory button
  const addButton = page.getByTestId('add-factory-button');
  await expect(addButton).toBeVisible();
  await addButton.click();

  // Fill factory form
  const modal = page.getByRole('dialog', { name: /add factory|create factory/i });
  await expect(modal).toBeVisible();

  await modal.getByLabel(/factory name/i).fill(factoryName);
  await modal.getByLabel(/factory code/i).fill(factoryCode);
  await modal.getByLabel(/description/i).fill('Test factory for E2E testing');

  // Select country (Bangladesh)
  await selectOptionByLabel(modal, page, 'Country', 'Bangladesh');

  // Fill address
  await modal.getByLabel(/city/i).fill('Dhaka');
  await modal.getByLabel(/state/i).fill('Dhaka');

  // Submit form
  await modal.getByRole('button', { name: /create factory|add factory/i }).click();
  await expect(modal).toBeHidden();

  return { factoryName, factoryCode };
}

// Helper function to create a customer
async function createCustomer(page: Page, customerName: string, customerEmail: string) {
  await page.goto('/factory/customers');

  // Click add customer button
  const addButton = page.getByTestId('add-customer-button');
  await expect(addButton).toBeVisible();
  await addButton.click();

  // Fill customer form
  const modal = page.getByRole('dialog', { name: /create new customer|add new customer/i });
  await expect(modal).toBeVisible();

  await modal.getByLabel(/name/i).fill(customerName);
  await modal.getByLabel(/email/i).fill(customerEmail);
  await modal.getByLabel(/phone/i).fill(CUSTOMER_PHONE);
  await modal.getByLabel(/company/i).fill(CUSTOMER_COMPANY);

  // Set credit limit
  await modal.getByLabel(/credit limit/i).fill('50000');

  // Select payment terms
  await selectOptionByLabel(modal, page, 'Payment Terms', 'Net 30 days');

  // Fill address
  await modal.getByLabel(/street address/i).fill('123 Test Street');
  await modal.getByLabel(/city/i).fill('Dhaka');
  await modal.getByLabel(/state/i).fill('Dhaka');
  await modal.getByLabel(/postal code/i).fill('1200');
  await selectOptionByLabel(modal, page, 'Country', 'Bangladesh');

  // Submit form
  await modal.getByRole('button', { name: /create customer/i }).click();
  await expect(modal).toBeHidden();

  return { customerName, customerEmail };
}

test.describe.serial('Factory Management Flows', () => {
  let factoryName = '';
  let factoryCode = '';
  let customerName = '';
  let customerEmail = '';

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('creates a new factory and shows it in the list', async ({ page }) => {
    factoryName = `${FACTORY_NAME} ${Date.now()}`;
    factoryCode = `${FACTORY_CODE}${Date.now()}`;

    await createFactory(page, factoryName, factoryCode);

    // Verify factory appears in the list
    const searchBox = page.getByTestId('factory-search-input');
    await searchBox.fill(factoryName);

    const factoryRow = page.getByTestId('factory-row').filter({ hasText: factoryName });
    await expect(factoryRow).toBeVisible();
    await expect(factoryRow).toContainText(factoryCode);
  });

  test('displays factory details and allows editing', async ({ page }) => {
    test.skip(factoryName === '', 'Factory must be created in previous test');

    await page.goto('/factory/management');
    const searchBox = page.getByTestId('factory-search-input');
    await searchBox.fill(factoryName);

    const factoryRow = page.getByTestId('factory-row').filter({ hasText: factoryName });
    await expect(factoryRow).toBeVisible();

    // Click the dropdown menu trigger
    const dropdownTrigger = page.getByTestId('factory-actions-dropdown');
    await dropdownTrigger.click();

    // Click edit action from dropdown
    await page.getByTestId('edit-factory-menu-item').click();

    // Verify edit modal opens and contains current values
    const modal = page.getByRole('dialog', { name: /edit factory/i });
    await expect(modal).toBeVisible();
    await expect(modal.getByLabel(/factory name/i)).toHaveValue(factoryName);
    await expect(modal.getByLabel(/factory code/i)).toHaveValue(factoryCode);

    // Update factory name
    const newFactoryName = `${factoryName} (Updated)`;
    await modal.getByLabel(/factory name/i).fill(newFactoryName);

    // Save changes
    await modal.getByRole('button', { name: /update factory|save changes/i }).click();
    await expect(modal).toBeHidden();

    // Verify updated name appears in list
    await expect(factoryRow).toContainText(newFactoryName);
  });

  test('allows factory user management', async ({ page }) => {
    test.skip(factoryName === '', 'Factory must be created in previous test');

    await page.goto('/factory/management');
    const searchBox = page.getByTestId('factory-search-input');
    await searchBox.fill(factoryName);

    const factoryRow = page.getByTestId('factory-row').filter({ hasText: factoryName });
    await expect(factoryRow).toBeVisible();

    // Click the dropdown menu trigger
    const dropdownTrigger = page.getByTestId('factory-actions-dropdown');
    await dropdownTrigger.click();

    // Click manage users action from dropdown
    await page.getByTestId('manage-users-menu-item').click();

    // Verify user assignment modal opens
    const modal = page.getByRole('dialog', { name: /manage users|user assignments/i });
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(factoryName);

    // Close modal
    await modal.getByRole('button', { name: /close|cancel/i }).click();
    await expect(modal).toBeHidden();
  });

  test('deletes a factory', async ({ page }) => {
    test.skip(factoryName === '', 'Factory must be created in previous test');

    await page.goto('/factory/management');
    const searchBox = page.getByTestId('factory-search-input');
    await searchBox.fill(factoryName);

    const factoryRow = page.getByTestId('factory-row').filter({ hasText: factoryName });
    await expect(factoryRow).toBeVisible();

    // Click the dropdown menu trigger
    const dropdownTrigger = page.getByTestId('factory-actions-dropdown');
    await dropdownTrigger.click();

    // Click delete action from dropdown
    await page.getByTestId('delete-factory-menu-item').click();

    // Confirm deletion in dialog
    const confirmDialog = page.getByRole('dialog', { name: /delete factory/i });
    await expect(confirmDialog).toBeVisible();
    await confirmDialog.getByRole('button', { name: /delete/i }).click();

    // Verify factory is removed from list
    await expect(factoryRow).toBeHidden();
  });
});

test.describe.serial('Customer Management Flows', () => {
  let createdCustomerName = '';
  let createdCustomerEmail = '';

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('creates a new customer and shows it in the list', async ({ page }) => {
    createdCustomerName = `${CUSTOMER_NAME} ${Date.now()}`;
    createdCustomerEmail = `e2e-${Date.now()}@test.com`;

    await createCustomer(page, createdCustomerName, createdCustomerEmail);

    // Verify customer appears in the list
    const searchBox = page.getByTestId('customer-search-input');
    await searchBox.fill(createdCustomerName);

    const customerRow = page.getByTestId('customer-row').filter({ hasText: createdCustomerName });
    await expect(customerRow).toBeVisible();
    await expect(customerRow).toContainText(createdCustomerEmail);
    await expect(customerRow).toContainText(CUSTOMER_PHONE);
    await expect(customerRow).toContainText(CUSTOMER_COMPANY);
  });

  test('displays customer details', async ({ page }) => {
    test.skip(createdCustomerName === '', 'Customer must be created in previous test');

    await page.goto('/factory/customers');
    const searchBox = page.getByTestId('customer-search-input');
    await searchBox.fill(createdCustomerName);

    const customerRow = page.getByTestId('customer-row').filter({ hasText: createdCustomerName });
    await expect(customerRow).toBeVisible();

    // Click view details action
    const viewButton = page.getByTestId('view-customer-button');
    await viewButton.click();

    // Verify details modal opens
    const modal = page.getByRole('dialog', { name: /customer details/i });
    await expect(modal).toBeVisible();
    await expect(modal).toContainText(createdCustomerName);
    await expect(modal).toContainText(createdCustomerEmail);
    await expect(modal).toContainText(CUSTOMER_PHONE);
    await expect(modal).toContainText(CUSTOMER_COMPANY);

    // Close modal
    await modal.getByRole('button', { name: /close/i }).click();
    await expect(modal).toBeHidden();
  });

  test('allows editing customer information', async ({ page }) => {
    test.skip(createdCustomerName === '', 'Customer must be created in previous test');

    await page.goto('/factory/customers');
    const searchBox = page.getByTestId('customer-search-input');
    await searchBox.fill(createdCustomerName);

    const customerRow = page.getByTestId('customer-row').filter({ hasText: createdCustomerName });
    await expect(customerRow).toBeVisible();

    // Click edit action
    const editButton = page.getByTestId('edit-customer-button');
    await editButton.click();

    // Verify edit modal opens
    const modal = page.getByRole('dialog', { name: /edit customer/i });
    await expect(modal).toBeVisible();
    await expect(modal.getByLabel(/name/i)).toHaveValue(createdCustomerName);
    await expect(modal.getByLabel(/email/i)).toHaveValue(createdCustomerEmail);

    // Update customer information
    const newCustomerName = `${createdCustomerName} (Updated)`;
    const newCompany = `${CUSTOMER_COMPANY} Updated`;

    await modal.getByLabel(/name/i).fill(newCustomerName);
    await modal.getByLabel(/company/i).fill(newCompany);

    // Save changes
    await modal.getByRole('button', { name: /update customer/i }).click();
    await expect(modal).toBeHidden();

    // Verify updated information appears in list
    await expect(customerRow).toContainText(newCustomerName);
    await expect(customerRow).toContainText(newCompany);
  });

  test('searches and filters customers', async ({ page }) => {
    await page.goto('/factory/customers');

    // Test search functionality
    const searchBox = page.getByTestId('customer-search-input');

    // Search by name
    await searchBox.fill(createdCustomerName);
    let customerRows = page.getByTestId('customer-row');
    await expect(customerRows).toHaveCount(1);

    // Search by email
    await searchBox.fill(createdCustomerEmail);
    await expect(customerRows).toHaveCount(1);

    // Search by company
    await searchBox.fill(CUSTOMER_COMPANY);
    await expect(customerRows).toHaveCount(1);

    // Clear search to show all customers
    await searchBox.fill('');
    const count = await customerRows.count();
    expect(count).toBeGreaterThan(0);

    // Test search with non-existent term
    await searchBox.fill('NonExistentCustomer12345');
    await expect(customerRows).toHaveCount(0);
    await expect(page.getByText(/no customers found/i)).toBeVisible();
  });

  test('displays customer statistics', async ({ page }) => {
    await page.goto('/factory/customers');

    // Check if stats cards are displayed
    await expect(page.getByText(/total customers/i)).toBeVisible();
    await expect(page.getByText(/companies/i)).toBeVisible();
    await expect(page.getByText(/credit customers/i)).toBeVisible();
    await expect(page.getByText(/this month/i)).toBeVisible();

    // Verify stats show actual numbers
    const totalCustomersText = await page.getByText(/total customers/i).textContent();
    expect(totalCustomersText).toMatch(/\d+/);
  });

  test('marks customer as inactive (delete)', async ({ page }) => {
    test.skip(createdCustomerName === '', 'Customer must be created in previous test');

    await page.goto('/factory/customers');
    const searchBox = page.getByTestId('customer-search-input');
    await searchBox.fill(createdCustomerName);

    const customerRow = page.getByTestId('customer-row').filter({ hasText: createdCustomerName });
    await expect(customerRow).toBeVisible();

    // Click delete action
    const deleteButton = page.getByTestId('delete-customer-button');
    await deleteButton.click();

    // Confirm deletion in dialog
    const confirmDialog = page.getByRole('dialog', { name: /delete customer/i });
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText(/marked as inactive/i);
    await confirmDialog.getByRole('button', { name: /delete/i }).click();

    // Verify customer is no longer in active list
    await expect(customerRow).toBeHidden();
  });

  test('refreshes customer data', async ({ page }) => {
    await page.goto('/factory/customers');

    // Click refresh button
    const refreshButton = page.getByTestId('refresh-customers-button');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // Verify page still loads correctly after refresh
    await expect(page.getByText(/customer management/i)).toBeVisible();
    await expect(page.getByRole('table')).toBeVisible();
  });
});
