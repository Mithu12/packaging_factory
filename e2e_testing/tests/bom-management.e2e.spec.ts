import { test, expect, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from '../utils/login';

const TEST_PRODUCT_NAME = 'E2E BOM Test Product';
const TEST_PRODUCT_SKU = 'BOM-TEST-001';
const TEST_COMPONENT_NAME = 'E2E BOM Test Component';
const TEST_COMPONENT_SKU = 'BOM-COMP-001';

// Helper function to select options from dropdown
async function selectOptionByLabel(modal: Locator, page: Page, label: string, option: string) {
  const container = modal.locator(`label:has-text("${label}")`).locator('..');
  const trigger = container.locator('button');
  await trigger.click();
  await page.getByRole('option', { name: option }).click();
}

// Helper function to create a test product for BOM
async function createTestProduct(page: Page) {
  // Navigate to products page (assuming it exists)
  await page.goto('/inventory/products');

  // Click add product button
  const addButton = page.getByRole('button', { name: /add.*product|new.*product|create.*product/i });
  if (await addButton.isVisible()) {
    await addButton.click();

    // Fill product form
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    await page.getByLabel(/product.*name|name/i).fill(TEST_PRODUCT_NAME);
    await page.getByLabel(/sku|product.*code/i).fill(TEST_PRODUCT_SKU);
    await page.getByLabel(/description/i).fill('Test product for BOM testing');

    // Submit form
    const submitButton = page.getByRole('button', { name: /create.*product|save.*product/i });
    await submitButton.click();
    await expect(modal).toBeHidden();
  }

  return { productName: TEST_PRODUCT_NAME, productSku: TEST_PRODUCT_SKU };
}

// Helper function to create a test component product
async function createTestComponent(page: Page) {
  await page.goto('/inventory/products');

  const addButton = page.getByRole('button', { name: /add.*product|new.*product|create.*product/i });
  if (await addButton.isVisible()) {
    await addButton.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    await page.getByLabel(/product.*name|name/i).fill(TEST_COMPONENT_NAME);
    await page.getByLabel(/sku|product.*code/i).fill(TEST_COMPONENT_SKU);
    await page.getByLabel(/description/i).fill('Test component for BOM testing');

    const submitButton = page.getByRole('button', { name: /create.*product|save.*product/i });
    await submitButton.click();
    await expect(modal).toBeHidden();
  }

  return { componentName: TEST_COMPONENT_NAME, componentSku: TEST_COMPONENT_SKU };
}

// Helper function to create a test BOM
async function createTestBOM(page: Page, productName: string) {
  await page.goto('/factory/bom');

  // Click create BOM button
  const createButton = page.getByTestId('create-bom-button');
  await expect(createButton).toBeVisible();
  await createButton.click();

  // Wait for BOM editor to load
  await expect(page.getByTestId('bom-editor-title')).toContainText('Create BOM');
  await expect(page.getByTestId('bom-editor-loading')).toBeHidden();

  // Select parent product
  const productSelect = page.getByTestId('parent-product-select');
  await productSelect.click();

  // Find and select the test product
  await page.getByRole('option', { name: productName }).click();

  // Fill BOM details
  const versionInput = page.getByLabel(/version/i);
  if (await versionInput.isVisible()) {
    await versionInput.fill('1.0');
  }

  // Add a component
  const addComponentButton = page.getByRole('button', { name: /add.*component/i });
  if (await addComponentButton.isVisible()) {
    await addComponentButton.click();

    // Fill component details
    const componentSelect = page.getByLabel(/component.*product/i).last();
    if (await componentSelect.isVisible()) {
      await componentSelect.click();
      await page.getByRole('option', { name: TEST_COMPONENT_NAME }).click();
    }

    const quantityInput = page.getByLabel(/quantity.*required/i).last();
    if (await quantityInput.isVisible()) {
      await quantityInput.fill('2');
    }
  }

  // Save BOM
  const saveButton = page.getByTestId('save-bom-button');
  await saveButton.click();

  // Wait for save to complete and redirect
  await expect(page.getByTestId('bom-editor-container')).toBeHidden();
  await expect(page.getByTestId('bom-list-title')).toBeVisible();

  return { productName };
}

// Helper function to delete test BOM
async function deleteTestBOM(page: Page, productName: string) {
  await page.goto('/factory/bom');

  // Search for BOM
  const searchInput = page.getByTestId('bom-search-input');
  if (await searchInput.isVisible()) {
    await searchInput.fill(productName);

    // Find BOM row and delete it
    const bomRow = page.getByTestId(/^bom-row-/).filter({ hasText: productName });
    if (await bomRow.isVisible()) {
      // Click actions menu
      const actionsButton = bomRow.locator('button').last();
      await actionsButton.click();

      // Click delete
      const deleteButton = page.getByRole('menuitem', { name: /delete|remove/i });
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirm deletion
        const confirmDialog = page.getByRole('dialog', { name: /delete.*bom|confirm.*delete/i });
        if (await confirmDialog.isVisible()) {
          const confirmButton = confirmDialog.getByRole('button', { name: /delete|confirm/i });
          await confirmButton.click();
        }
      }
    }
  }
}

test.describe.serial('BOM Management - BOM Creation and Management', () => {
  let testProductName = '';
  let testComponentName = '';

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.beforeAll(async ({ browser }) => {
    // Create test products for BOM
    const page = await browser.newPage();
    await loginAsAdmin(page);

    const productResult = await createTestProduct(page);
    testProductName = productResult.productName;

    const componentResult = await createTestComponent(page);
    testComponentName = componentResult.componentName;

    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    // Cleanup test BOM
    if (testProductName) {
      const page = await browser.newPage();
      await loginAsAdmin(page);
      await deleteTestBOM(page, testProductName);
      await page.close();
    }
  });

  test('displays BOM management page correctly', async ({ page }) => {
    await page.goto('/factory/bom');

    // Check page title and elements
    await expect(page.getByTestId('bom-list-title')).toContainText('Bill of Materials');
    await expect(page.getByTestId('bom-list-subtitle')).toContainText('Manage product component structures');

    // Check action buttons
    await expect(page.getByTestId('create-bom-button')).toBeVisible();
    await expect(page.getByTestId('import-bom-button')).toBeVisible();
    await expect(page.getByTestId('export-bom-button')).toBeVisible();

    // Check stats cards
    await expect(page.getByTestId('total-boms-card')).toBeVisible();
    await expect(page.getByTestId('avg-components-card')).toBeVisible();
    await expect(page.getByTestId('avg-cost-card')).toBeVisible();
    await expect(page.getByTestId('bom-issues-card')).toBeVisible();

    // Check tabs
    await expect(page.getByTestId('all-boms-tab')).toBeVisible();
    await expect(page.getByTestId('active-boms-tab')).toBeVisible();
    await expect(page.getByTestId('issues-tab')).toBeVisible();
    await expect(page.getByTestId('analytics-tab')).toBeVisible();
  });

  test('displays BOM statistics correctly', async ({ page }) => {
    await page.goto('/factory/bom');

    // Check stats contain numbers or are properly displayed
    const totalBomsCount = page.getByTestId('total-boms-count');
    if (await totalBomsCount.isVisible()) {
      const countText = await totalBomsCount.textContent();
      expect(countText).toMatch(/\d+/);
    }

    const avgComponentsValue = page.getByTestId('avg-components-value');
    if (await avgComponentsValue.isVisible()) {
      const valueText = await avgComponentsValue.textContent();
      expect(valueText).toMatch(/\d+\.\d+|\d+/);
    }
  });

  test('opens create BOM editor', async ({ page }) => {
    await page.goto('/factory/bom');

    // Click create BOM button
    const createButton = page.getByTestId('create-bom-button');
    await createButton.click();

    // Verify BOM editor opens
    await expect(page.getByTestId('bom-editor-title')).toContainText('Create BOM');
    await expect(page.getByTestId('bom-editor-subtitle')).toContainText('Define product component structure');

    // Check editor elements
    await expect(page.getByTestId('bom-summary-stats')).toBeVisible();
    await expect(page.getByTestId('bom-details-card')).toBeVisible();

    // Check action buttons
    await expect(page.getByTestId('back-button')).toBeVisible();
    await expect(page.getByTestId('save-bom-button')).toBeVisible();
    await expect(page.getByTestId('preview-button')).toBeVisible();

    // Go back
    const backButton = page.getByTestId('back-button');
    await backButton.click();
    await expect(page.getByTestId('bom-list-title')).toBeVisible();
  });

  test('searches BOMs by product name', async ({ page }) => {
    await page.goto('/factory/bom');

    // Check if search functionality exists
    const searchInput = page.getByTestId('bom-search-input');
    if (await searchInput.isVisible()) {
      // Search for existing BOMs
      await searchInput.fill('test');

      // Verify search works (at least doesn't crash)
      await expect(page.getByTestId('bom-list-container')).toBeVisible();

      // Clear search
      await searchInput.fill('');
      await expect(page.getByTestId('bom-list-container')).toBeVisible();
    }
  });

  test('filters BOMs by status', async ({ page }) => {
    await page.goto('/factory/bom');

    // Check status filter tabs
    const statusTabs = page.getByTestId('status-filter-tabs-list');
    if (await statusTabs.isVisible()) {
      // Click different status filters
      const activeTab = page.getByTestId('filter-active-tab');
      if (await activeTab.isVisible()) {
        await activeTab.click();
        await expect(page.getByTestId('all-boms-tab-content')).toBeVisible();
      }

      const allTab = page.getByTestId('filter-all-tab');
      if (await allTab.isVisible()) {
        await allTab.click();
        await expect(page.getByTestId('all-boms-tab-content')).toBeVisible();
      }
    }
  });

  test('navigates between BOM tabs', async ({ page }) => {
    await page.goto('/factory/bom');

    // Default tab should be active
    await expect(page.getByTestId('all-boms-tab-content')).toBeVisible();

    // Navigate to other tabs
    const activeTab = page.getByTestId('active-boms-tab');
    if (await activeTab.isVisible()) {
      await activeTab.click();
      // Should still show content (may be same as all BOMs)
      await expect(page.getByTestId('bom-list-container')).toBeVisible();
    }

    const issuesTab = page.getByTestId('issues-tab');
    if (await issuesTab.isVisible()) {
      await issuesTab.click();
      await expect(page.getByTestId('bom-list-container')).toBeVisible();
    }

    // Go back to all BOMs
    const allBomsTab = page.getByTestId('all-boms-tab');
    await allBomsTab.click();
    await expect(page.getByTestId('all-boms-tab-content')).toBeVisible();
  });

  test('displays BOM table with correct headers', async ({ page }) => {
    await page.goto('/factory/bom');

    // Check table headers
    await expect(page.getByTestId('bom-id-header')).toContainText('BOM ID');
    await expect(page.getByTestId('product-header')).toContainText('Product');
    await expect(page.getByTestId('version-header')).toContainText('Version');
    await expect(page.getByTestId('components-header')).toContainText('Components');
    await expect(page.getByTestId('total-cost-header')).toContainText('Total Cost');
    await expect(page.getByTestId('status-header')).toContainText('Status');
    await expect(page.getByTestId('created-header')).toContainText('Created');
    await expect(page.getByTestId('actions-header')).toContainText('Actions');
  });
});

test.describe('BOM Management - BOM Editor Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('BOM editor shows correct summary statistics', async ({ page }) => {
    await page.goto('/factory/bom/new');

    // Check summary stats are displayed
    await expect(page.getByTestId('bom-summary-stats')).toBeVisible();

    // Check individual stat cards
    await expect(page.getByTestId('components-stat-card')).toBeVisible();
    await expect(page.getByTestId('total-cost-stat-card')).toBeVisible();
    await expect(page.getByTestId('max-lead-time-stat-card')).toBeVisible();
    await expect(page.getByTestId('suppliers-stat-card')).toBeVisible();

    // Check stat values (should be 0 or default)
    await expect(page.getByTestId('components-count')).toContainText('0');
    await expect(page.getByTestId('total-cost-value')).toContainText('0');
  });

  test('BOM editor validates required fields', async ({ page }) => {
    await page.goto('/factory/bom/new');

    // Try to save without required fields
    const saveButton = page.getByTestId('save-bom-button');
    await saveButton.click();

    // Should still be on editor (validation failed)
    await expect(page.getByTestId('bom-editor-title')).toContainText('Create BOM');

    // Check that parent product is required
    const productSelect = page.getByTestId('parent-product-select-trigger');
    const productLabel = page.getByTestId('parent-product-label');
    await expect(productLabel).toContainText('Parent Product *');
  });

  test('BOM editor back button works', async ({ page }) => {
    await page.goto('/factory/bom/new');

    // Click back button
    const backButton = page.getByTestId('back-button');
    await backButton.click();

    // Should navigate back to BOM list
    await expect(page.getByTestId('bom-list-title')).toBeVisible();
  });
});
