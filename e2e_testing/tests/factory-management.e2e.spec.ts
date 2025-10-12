import { test, expect, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from '../utils/login';

const TEST_FACTORY_NAME = 'E2E Factory Management Test';
const TEST_FACTORY_CODE = 'EFMT001';
const UPDATED_FACTORY_NAME = 'E2E Factory Management Test (Updated)';

// Helper function to select options from dropdown
async function selectOptionByLabel(modal: Locator, page: Page, label: string, option: string) {
  const container = modal.locator(`label:has-text("${label}")`).locator('..');
  const trigger = container.locator('button');
  await trigger.click();
  await page.getByRole('option', { name: option }).click();
}

// Helper function to create a test factory
async function createTestFactory(page: Page, factoryName: string = TEST_FACTORY_NAME, factoryCode: string = TEST_FACTORY_CODE) {
  await page.goto('/factory/management');

  // Click add factory button
  const addButton = page.getByTestId('add-factory-button');
  await expect(addButton).toBeVisible();
  await addButton.click();

  // Wait for factory form dialog
  const modal = page.getByTestId('factory-form-dialog');
  await expect(modal).toBeVisible();

  // Verify form title
  await expect(page.getByTestId('factory-form-title')).toContainText('Create New Factory');

  // Fill basic information
  await page.getByTestId('factory-name-input').fill(factoryName);
  await page.getByTestId('factory-code-input').fill(factoryCode);
  await page.getByTestId('factory-description-textarea').fill('Test factory created by E2E tests');

  // Fill address information
  await page.getByTestId('street-address-input').fill('123 Test Street');
  await page.getByTestId('city-input').fill('Dhaka');
  await page.getByTestId('state-input').fill('Dhaka');
  await page.getByTestId('postal-code-input').fill('1200');

  // Select country
  await selectOptionByLabel(modal, page, 'Country', 'Bangladesh');

  // Fill contact information
  await page.getByTestId('phone-input').fill('+8801234567890');
  await page.getByTestId('email-input').fill('factory@test.com');

  // Submit form
  const submitButton = page.getByTestId('submit-factory-button');
  await expect(submitButton).toBeEnabled();
  await submitButton.click();

  // Wait for modal to close
  await expect(modal).toBeHidden();

  return { factoryName, factoryCode };
}

// Helper function to delete test factory
async function deleteTestFactory(page: Page, factoryName: string) {
  await page.goto('/factory/management');

  // Search for the factory
  const searchInput = page.getByTestId('factory-search-input');
  await searchInput.fill(factoryName);

  // Find and click the factory row
  const factoryRow = page.getByTestId('factory-row').filter({ hasText: factoryName });
  await expect(factoryRow).toBeVisible();

  // Click the actions dropdown
  const dropdownTrigger = page.getByTestId('factory-actions-dropdown');
  await dropdownTrigger.click();

  // Click delete menu item
  const deleteMenuItem = page.getByTestId('delete-factory-menu-item');
  await deleteMenuItem.click();

  // Confirm deletion
  const confirmDialog = page.getByRole('dialog', { name: /delete factory/i });
  await expect(confirmDialog).toBeVisible();
  const deleteButton = confirmDialog.getByRole('button', { name: /delete/i });
  await deleteButton.click();

  // Wait for factory to be removed
  await expect(factoryRow).toBeHidden();
}

test.describe.serial('Factory Management - CRUD Operations', () => {
  let createdFactoryName = '';
  let createdFactoryCode = '';

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('displays factory management page correctly', async ({ page }) => {
    await page.goto('/factory/management');

    // Check page title and description
    await expect(page.getByTestId('factory-management-title')).toContainText('Factory Management');
    await expect(page.getByTestId('factory-management-subtitle')).toContainText('Manage factories, assign users, and control access permissions');

    // Check multi-factory badge
    await expect(page.getByTestId('multi-factory-badge')).toContainText('Multi-Factory System');

    // Check tabs
    await expect(page.getByTestId('factories-tab')).toContainText('Factories');
    await expect(page.getByTestId('users-tab')).toContainText('User Assignments');
    await expect(page.getByTestId('settings-tab')).toContainText('Settings');

    // Check add factory button
    await expect(page.getByTestId('add-factory-button')).toBeVisible();
  });

  test('creates a new factory successfully', async ({ page }) => {
    const { factoryName, factoryCode } = await createTestFactory(page);
    createdFactoryName = factoryName;
    createdFactoryCode = factoryCode;

    // Verify factory appears in the list
    const searchInput = page.getByTestId('factory-search-input');
    await searchInput.fill(factoryName);

    const factoryRow = page.getByTestId('factory-row').filter({ hasText: factoryName });
    await expect(factoryRow).toBeVisible();
    await expect(factoryRow).toContainText(factoryCode);
    await expect(factoryRow).toContainText('Dhaka, Dhaka');
  });

  test('displays factory details correctly', async ({ page }) => {
    test.skip(createdFactoryName === '', 'Factory must be created first');

    await page.goto('/factory/management');

    // Search for the factory
    const searchInput = page.getByTestId('factory-search-input');
    await searchInput.fill(createdFactoryName);

    const factoryRow = page.getByTestId('factory-row').filter({ hasText: createdFactoryName });
    await expect(factoryRow).toBeVisible();
    await expect(factoryRow).toContainText(createdFactoryCode);
    await expect(factoryRow).toContainText('Active'); // Should be active by default
  });

  test('edits factory information', async ({ page }) => {
    test.skip(createdFactoryName === '', 'Factory must be created first');

    await page.goto('/factory/management');

    // Search for the factory
    const searchInput = page.getByTestId('factory-search-input');
    await searchInput.fill(createdFactoryName);

    const factoryRow = page.getByTestId('factory-row').filter({ hasText: createdFactoryName });
    await expect(factoryRow).toBeVisible();

    // Click actions dropdown
    const dropdownTrigger = page.getByTestId('factory-actions-dropdown');
    await dropdownTrigger.click();

    // Click edit menu item
    const editMenuItem = page.getByTestId('edit-factory-menu-item');
    await editMenuItem.click();

    // Verify edit modal opens
    const modal = page.getByTestId('factory-form-dialog');
    await expect(modal).toBeVisible();
    await expect(page.getByTestId('factory-form-title')).toContainText('Edit Factory');

    // Verify current values are populated
    await expect(page.getByTestId('factory-name-input')).toHaveValue(createdFactoryName);
    await expect(page.getByTestId('factory-code-input')).toHaveValue(createdFactoryCode);

    // Update factory name
    await page.getByTestId('factory-name-input').fill(UPDATED_FACTORY_NAME);
    await page.getByTestId('factory-description-textarea').fill('Updated description for E2E tests');

    // Submit changes
    const submitButton = page.getByTestId('submit-factory-button');
    await submitButton.click();

    // Wait for modal to close
    await expect(modal).toBeHidden();

    // Verify updated name appears
    await expect(factoryRow).toContainText(UPDATED_FACTORY_NAME);
    createdFactoryName = UPDATED_FACTORY_NAME; // Update for subsequent tests
  });

  test('searches factories by name and code', async ({ page }) => {
    test.skip(createdFactoryName === '', 'Factory must be created first');

    await page.goto('/factory/management');

    // Test search by name
    const searchInput = page.getByTestId('factory-search-input');
    await searchInput.fill(createdFactoryName);
    await expect(page.getByTestId('factory-row')).toHaveCount(1);

    // Test search by code
    await searchInput.fill(createdFactoryCode);
    await expect(page.getByTestId('factory-row')).toHaveCount(1);

    // Test search with partial match
    await searchInput.fill(createdFactoryName.substring(0, 5));
    await expect(page.getByTestId('factory-row')).toHaveCount(1);

    // Clear search
    await searchInput.fill('');
    const totalFactories = await page.getByTestId('factory-row').count();
    expect(totalFactories).toBeGreaterThanOrEqual(1);
  });

  test('navigates factory tabs correctly', async ({ page }) => {
    await page.goto('/factory/management');

    // Check factories tab content is visible by default
    await expect(page.getByTestId('factories-tab-content')).toBeVisible();
    await expect(page.getByTestId('factory-overview-card')).toBeVisible();

    // Navigate to users tab
    await page.getByTestId('users-tab').click();
    await expect(page.getByTestId('users-tab-content')).toBeVisible();
    await expect(page.getByTestId('user-assignments-card')).toBeVisible();

    // Navigate to settings tab
    await page.getByTestId('settings-tab').click();
    await expect(page.getByTestId('settings-tab-content')).toBeVisible();
    await expect(page.getByTestId('access-control-card')).toBeVisible();
    await expect(page.getByTestId('factory-roles-card')).toBeVisible();
  });

  test('displays factory settings correctly', async ({ page }) => {
    await page.goto('/factory/management');

    // Navigate to settings tab
    await page.getByTestId('settings-tab').click();

    // Check access control settings
    await expect(page.getByTestId('access-control-title')).toContainText('Access Control');
    await expect(page.getByTestId('factory-filtering-title')).toContainText('Factory-Based Filtering');
    await expect(page.getByTestId('role-permissions-title')).toContainText('Role-Based Permissions');
    await expect(page.getByTestId('primary-assignment-title')).toContainText('Primary Factory Assignment');

    // Check all settings show as active
    await expect(page.getByTestId('factory-filtering-status')).toContainText('Active');
    await expect(page.getByTestId('role-permissions-status')).toContainText('Active');
    await expect(page.getByTestId('primary-assignment-status')).toContainText('Active');

    // Check factory roles
    await expect(page.getByTestId('factory-roles-title')).toContainText('Factory Roles');
    await expect(page.getByTestId('manager-role-title')).toContainText('Factory Manager');
    await expect(page.getByTestId('worker-role-title')).toContainText('Factory Worker');
    await expect(page.getByTestId('viewer-role-title')).toContainText('Factory Viewer');
  });

  test('deletes a factory', async ({ page }) => {
    test.skip(createdFactoryName === '', 'Factory must be created first');

    await deleteTestFactory(page, createdFactoryName);

    // Verify factory is removed
    const searchInput = page.getByTestId('factory-search-input');
    await searchInput.fill(createdFactoryName);
    await expect(page.getByTestId('factory-row')).toHaveCount(0);

    // Reset for cleanup
    createdFactoryName = '';
    createdFactoryCode = '';
  });
});

test.describe.serial('Factory Management - User Assignments', () => {
  let testFactoryName = '';
  let testFactoryCode = '';

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.beforeAll(async ({ browser }) => {
    // Create a test factory for user assignment tests
    const page = await browser.newPage();
    await loginAsAdmin(page);
    const result = await createTestFactory(page, `${TEST_FACTORY_NAME} Users`, `${TEST_FACTORY_CODE}U`);
    testFactoryName = result.factoryName;
    testFactoryCode = result.factoryCode;
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    // Clean up test factory
    if (testFactoryName) {
      const page = await browser.newPage();
      await loginAsAdmin(page);
      await deleteTestFactory(page, testFactoryName);
      await page.close();
    }
  });

  test('opens user assignment dialog', async ({ page }) => {
    await page.goto('/factory/management');

    // Search for test factory
    const searchInput = page.getByTestId('factory-search-input');
    await searchInput.fill(testFactoryName);

    const factoryRow = page.getByTestId('factory-row').filter({ hasText: testFactoryName });
    await expect(factoryRow).toBeVisible();

    // Click actions dropdown
    const dropdownTrigger = page.getByTestId('factory-actions-dropdown');
    await dropdownTrigger.click();

    // Click manage users menu item
    const manageUsersMenuItem = page.getByTestId('manage-users-menu-item');
    await manageUsersMenuItem.click();

    // Verify user assignment dialog opens
    const dialog = page.getByTestId('user-assignment-dialog');
    await expect(dialog).toBeVisible();
    await expect(page.getByTestId('user-assignment-title')).toContainText(`Manage Users - ${testFactoryName}`);
    await expect(page.getByTestId('user-assignment-description')).toBeVisible();

    // Check assign user button is visible
    await expect(page.getByTestId('assign-user-button')).toBeVisible();
  });

  test('displays user assignment interface elements', async ({ page }) => {
    await page.goto('/factory/management');

    // Search for test factory and open user assignment dialog
    const searchInput = page.getByTestId('factory-search-input');
    await searchInput.fill(testFactoryName);

    const factoryRow = page.getByTestId('factory-row').filter({ hasText: testFactoryName });
    await expect(factoryRow).toBeVisible();

    const dropdownTrigger = page.getByTestId('factory-actions-dropdown');
    await dropdownTrigger.click();

    const manageUsersMenuItem = page.getByTestId('manage-users-menu-item');
    await manageUsersMenuItem.click();

    // Verify dialog content
    const dialog = page.getByTestId('user-assignment-dialog');
    await expect(dialog).toBeVisible();

    // Check search functionality
    await expect(page.getByTestId('user-search-input')).toBeVisible();
    await expect(page.getByTestId('assign-user-button')).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('opens assign user dialog', async ({ page }) => {
    await page.goto('/factory/management');

    // Search for test factory and open user assignment dialog
    const searchInput = page.getByTestId('factory-search-input');
    await searchInput.fill(testFactoryName);

    const factoryRow = page.getByTestId('factory-row').filter({ hasText: testFactoryName });
    await expect(factoryRow).toBeVisible();

    const dropdownTrigger = page.getByTestId('factory-actions-dropdown');
    await dropdownTrigger.click();

    const manageUsersMenuItem = page.getByTestId('manage-users-menu-item');
    await manageUsersMenuItem.click();

    // Click assign user button
    const assignButton = page.getByTestId('assign-user-button');
    await assignButton.click();

    // Verify assign user dialog opens
    const assignDialog = page.getByTestId('assign-user-dialog');
    await expect(assignDialog).toBeVisible();
    await expect(page.getByTestId('assign-user-title')).toContainText('Assign User to Factory');

    // Close assign user dialog
    await page.keyboard.press('Escape');
    await expect(assignDialog).toBeHidden();

    // Close main dialog
    await page.keyboard.press('Escape');
  });
});
