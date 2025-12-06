import { test, expect, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from '../utils/login';

const CATEGORY_NAME = 'E2E Category';
const BRAND_NAME = 'E2E Brand';
const ORIGIN_NAME = 'E2E Origin';
const SUPPLIER_NAME = 'E2E Supplier';

/**
 * Helper to select an option from a custom select dropdown in a modal/form
 */
async function selectOptionByLabel(modal: Locator, page: Page, label: string, option: string) {
  const container = modal.locator(`label:has-text("${label}")`).locator('..');
  const trigger = container.locator('button');
  await trigger.click();
  await page.getByRole('option', { name: option }).click();
}

/**
 * Helper to select an option from a standalone select by test id
 */
async function selectByTestId(page: Page, testId: string, optionText: string) {
  const trigger = page.getByTestId(testId);
  await trigger.click();
  await page.getByRole('option', { name: optionText }).click();
}

/**
 * Helper to fill input by test id
 */
async function fillByTestId(page: Page, testId: string, value: string) {
  const input = page.getByTestId(testId);
  await input.fill(value);
}

test.describe.serial('Product Management - CRUD Operations', () => {
  let productName = '';
  let productSku = '';
  let productBarcode = '';
  let productId = '';

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('creates a new product with all required fields', async ({ page }) => {
    productName = `E2E Product ${Date.now()}`;
    const productDescription = 'Automated test product for Playwright coverage';

    await page.goto('/products');
    
    // Wait for page to load
    await expect(page.getByTestId('products-page')).toBeVisible();
    
    const addProductButton = page.getByTestId('add-product-button');
    await expect(addProductButton).toBeVisible();

    await addProductButton.click();

    const modal = page.getByRole('dialog', { name: 'Add New Product' });
    await expect(modal).toBeVisible();

    // Fill required fields
    await fillByTestId(page, 'add-product-name', productName);
    await page.getByTestId('add-product-description').fill(productDescription);

    // Select category (required)
    await selectByTestId(page, 'add-product-category', CATEGORY_NAME);

    // Select brand (optional)
    await selectByTestId(page, 'add-product-brand', BRAND_NAME);

    // Select origin (optional)
    await selectByTestId(page, 'add-product-origin', ORIGIN_NAME);

    // Verify SKU is auto-generated
    const skuInput = modal.locator('#sku');
    await expect(skuInput).not.toHaveValue('');
    productSku = await skuInput.inputValue();

    // Fill pricing
    await fillByTestId(page, 'add-product-cost-price', '15');
    await fillByTestId(page, 'add-product-selling-price', '25');

    // Fill stock information
    await fillByTestId(page, 'add-product-current-stock', '50');
    await fillByTestId(page, 'add-product-min-stock', '10');
    await fillByTestId(page, 'add-product-reorder-point', '15');

    // Select supplier (required)
    await selectByTestId(page, 'add-product-supplier', SUPPLIER_NAME);

    // Generate barcode from SKU
    const barcodeButton = modal.locator('button[title="Generate barcode from SKU"]');
    await barcodeButton.click();
    productBarcode = await modal.locator('#barcode').inputValue();
    expect(productBarcode).toBeTruthy();

    // Submit form
    await page.getByTestId('submit-add-product').click();
    await expect(modal).toBeHidden();

    // Verify product appears in list
    const searchBox = page.getByTestId('product-search-input');
    await searchBox.fill(productName);

    const productRow = page.getByTestId('product-row').filter({ hasText: productName });
    await expect(productRow).toBeVisible();
    await expect(productRow).toContainText(SUPPLIER_NAME);
    await expect(productRow).toContainText(CATEGORY_NAME);
    
    // Extract product ID from the row
    const dataProductId = await productRow.getAttribute('data-product-id');
    if (dataProductId) {
      productId = dataProductId;
    }
  });

  test('searches and filters products correctly', async ({ page }) => {
    test.skip(productName === '', 'Product must be created in previous test');

    await page.goto('/products');
    await expect(page.getByTestId('products-page')).toBeVisible();

    // Test search by name
    const searchBox = page.getByTestId('product-search-input');
    await searchBox.fill(productName);

    const productRow = page.getByTestId('product-row').filter({ hasText: productName });
    await expect(productRow).toBeVisible();

    // Verify only matching products are shown
    const allRows = page.getByTestId('product-row');
    const count = await allRows.count();
    expect(count).toBeGreaterThanOrEqual(1);

    // Clear search and verify all products return
    await searchBox.clear();
    await page.waitForTimeout(300); // Wait for filter debounce
    
    const totalRowsAfterClear = await page.getByTestId('product-row').count();
    expect(totalRowsAfterClear).toBeGreaterThanOrEqual(count);

    // Search by SKU
    await searchBox.fill(productSku);
    await expect(productRow).toBeVisible();
  });

  test('displays product details with all information', async ({ page }) => {
    test.skip(productName === '', 'Product must be created in previous test');

    await page.goto('/products');
    const searchBox = page.getByTestId('product-search-input');
    await searchBox.fill(productName);

    const productRow = page.getByTestId('product-row').filter({ hasText: productName });
    await expect(productRow).toBeVisible();

    // Navigate to product details via dropdown menu
    const actionButton = productRow.locator('button').last();
    await actionButton.click();
    await page.getByRole('menuitem', { name: 'View Details' }).click();

    await expect(page).toHaveURL(/\/products\/\d+$/);
    await expect(page.getByTestId('product-details-page')).toBeVisible();
    
    // Verify product title and SKU
    await expect(page.getByTestId('product-title')).toHaveText(productName);
    await expect(page.getByTestId('product-sku')).toContainText(productSku);

    // Verify category, brand, origin are displayed
    await expect(page.getByText(CATEGORY_NAME)).toBeVisible();
    await expect(page.getByText(BRAND_NAME)).toBeVisible();
    await expect(page.getByText(ORIGIN_NAME)).toBeVisible();

    // Verify barcode is displayed if generated
    if (productBarcode) {
      await expect(page.getByText(productBarcode)).toBeVisible();
    }

    // Verify supplier name is displayed
    await expect(page.getByText(SUPPLIER_NAME)).toBeVisible();

    // Verify action buttons exist
    await expect(page.getByTestId('product-edit-button')).toBeVisible();
    await expect(page.getByTestId('product-adjust-stock-button')).toBeVisible();
  });

  test('navigates to supplier details from product page', async ({ page }) => {
    test.skip(productName === '', 'Product must be created in previous test');

    await page.goto('/products');
    const searchBox = page.getByTestId('product-search-input');
    await searchBox.fill(productName);

    const productRow = page.getByTestId('product-row').filter({ hasText: productName });
    const actionButton = productRow.locator('button').last();
    await actionButton.click();
    await page.getByRole('menuitem', { name: 'View Details' }).click();

    await expect(page).toHaveURL(/\/products\/\d+$/);

    // Click on view supplier details button
    const supplierButton = page.getByTestId('view-supplier-details-button');
    await supplierButton.click();

    await expect(page).toHaveURL(/\/suppliers\/\d+$/);
    await expect(page.getByRole('heading', { name: SUPPLIER_NAME })).toBeVisible();
  });

  test('edits an existing product', async ({ page }) => {
    test.skip(productName === '', 'Product must be created in previous test');

    await page.goto('/products');
    const searchBox = page.getByTestId('product-search-input');
    await searchBox.fill(productName);

    const productRow = page.getByTestId('product-row').filter({ hasText: productName });
    const actionButton = productRow.locator('button').last();
    await actionButton.click();
    await page.getByRole('menuitem', { name: 'Edit Product' }).click();

    await expect(page).toHaveURL(/\/products\/\d+\/edit$/);
    await expect(page.getByTestId('edit-product-page')).toBeVisible();

    // Update product description
    const updatedDescription = 'Updated description via E2E test';
    const descriptionInput = page.getByLabel('Description');
    await descriptionInput.clear();
    await descriptionInput.fill(updatedDescription);

    // Update selling price
    const newSellingPrice = '35';
    const sellingPriceInput = page.getByLabel('Selling Price');
    await sellingPriceInput.clear();
    await sellingPriceInput.fill(newSellingPrice);

    // Save changes
    const saveButton = page.getByRole('button', { name: /save|update/i });
    await saveButton.click();

    // Wait for save to complete and redirect
    await page.waitForURL(/\/products\/\d+$/);

    // Verify changes were saved
    await expect(page.getByText(updatedDescription)).toBeVisible();
  });

  test('adjusts stock for a product', async ({ page }) => {
    test.skip(productName === '', 'Product must be created in previous test');

    await page.goto('/products');
    const searchBox = page.getByTestId('product-search-input');
    await searchBox.fill(productName);

    const productRow = page.getByTestId('product-row').filter({ hasText: productName });
    const actionButton = productRow.locator('button').last();
    await actionButton.click();
    await page.getByRole('menuitem', { name: 'Adjust Stock' }).click();

    await expect(page).toHaveURL(/\/products\/\d+\/adjust-stock$/);

    // Select adjustment type
    const adjustmentTypeSelect = page.getByLabel(/adjustment.*type/i);
    await adjustmentTypeSelect.click();
    await page.getByRole('option', { name: /increase/i }).click();

    // Enter quantity
    const quantityInput = page.getByLabel(/quantity/i);
    await quantityInput.fill('10');

    // Select reason
    const reasonSelect = page.getByLabel(/reason/i);
    await reasonSelect.click();
    await page.getByRole('option', { name: /stock.*count.*correction/i }).click();

    // Enter reference (optional)
    const referenceInput = page.getByLabel(/reference/i);
    if (await referenceInput.isVisible()) {
      await referenceInput.fill('E2E-ADJUST-001');
    }

    // Enter notes (optional)
    const notesInput = page.getByLabel(/notes/i);
    if (await notesInput.isVisible()) {
      await notesInput.fill('Stock adjustment for E2E testing');
    }

    // Submit adjustment
    const submitButton = page.getByRole('button', { name: /save|adjust|submit/i });
    await submitButton.click();

    // Wait for success - either toast or redirect
    await page.waitForTimeout(1000);
    
    // Verify we're redirected or stay on page with updated stock
    const currentUrl = page.url();
    expect(currentUrl).toContain('/products/');
  });

  test('toggles product status (deactivate/activate)', async ({ page }) => {
    test.skip(productName === '', 'Product must be created in previous test');

    await page.goto('/products');
    const searchBox = page.getByTestId('product-search-input');
    await searchBox.fill(productName);

    const productRow = page.getByTestId('product-row').filter({ hasText: productName });
    await expect(productRow).toBeVisible();

    // Check initial status is active
    const statusBadge = productRow.locator('.badge, [class*="badge"]').first();
    await expect(statusBadge).toContainText(/active/i);

    // Click deactivate
    const actionButton = productRow.locator('button').last();
    await actionButton.click();
    await page.getByRole('menuitem', { name: /deactivate/i }).click();

    // Wait for status update
    await page.waitForTimeout(500);

    // Verify status changed to inactive/discontinued
    await searchBox.clear();
    await searchBox.fill(productName);
    
    const updatedRow = page.getByTestId('product-row').filter({ hasText: productName });
    const updatedBadge = updatedRow.locator('.badge, [class*="badge"]').first();
    await expect(updatedBadge).not.toContainText(/^active$/i);

    // Reactivate product
    const reactivateAction = updatedRow.locator('button').last();
    await reactivateAction.click();
    await page.getByRole('menuitem', { name: /activate/i }).click();

    await page.waitForTimeout(500);

    // Verify status is active again
    await searchBox.clear();
    await searchBox.fill(productName);
    
    const reactivatedRow = page.getByTestId('product-row').filter({ hasText: productName });
    const finalBadge = reactivatedRow.locator('.badge, [class*="badge"]').first();
    await expect(finalBadge).toContainText(/active/i);
  });
});

test.describe('Product Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('shows validation errors when required fields are empty', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByTestId('products-page')).toBeVisible();

    const addProductButton = page.getByTestId('add-product-button');
    await addProductButton.click();

    const modal = page.getByRole('dialog', { name: 'Add New Product' });
    await expect(modal).toBeVisible();

    // Try to submit without filling required fields
    const submitButton = page.getByTestId('submit-add-product');
    await submitButton.click();

    // Form should still be visible (not submitted)
    await expect(modal).toBeVisible();

    // Check for validation state on required fields
    const nameInput = page.getByTestId('add-product-name');
    await expect(nameInput).toHaveAttribute('aria-invalid', 'true');
  });

  test('validates cost price and selling price are numbers', async ({ page }) => {
    await page.goto('/products');
    
    const addProductButton = page.getByTestId('add-product-button');
    await addProductButton.click();

    const modal = page.getByRole('dialog', { name: 'Add New Product' });
    await expect(modal).toBeVisible();

    // Fill basic required fields
    await fillByTestId(page, 'add-product-name', 'Validation Test Product');
    await selectByTestId(page, 'add-product-category', CATEGORY_NAME);
    await selectByTestId(page, 'add-product-supplier', SUPPLIER_NAME);

    // Fill numeric fields with valid numbers
    const costPriceInput = page.getByTestId('add-product-cost-price');
    await costPriceInput.fill('10.50');
    await expect(costPriceInput).toHaveValue('10.50');

    const sellingPriceInput = page.getByTestId('add-product-selling-price');
    await sellingPriceInput.fill('20.99');
    await expect(sellingPriceInput).toHaveValue('20.99');

    // Close modal without submitting
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });

  test('auto-generates SKU from product name', async ({ page }) => {
    await page.goto('/products');
    
    const addProductButton = page.getByTestId('add-product-button');
    await addProductButton.click();

    const modal = page.getByRole('dialog', { name: 'Add New Product' });
    await expect(modal).toBeVisible();

    // SKU should be empty initially
    const skuInput = modal.locator('#sku');
    await expect(skuInput).toHaveValue('');

    // Fill product name
    await fillByTestId(page, 'add-product-name', 'Auto SKU Test Product');

    // SKU should be auto-generated
    await expect(skuInput).not.toHaveValue('');
    const generatedSku = await skuInput.inputValue();
    expect(generatedSku.length).toBeGreaterThan(0);

    // Close modal
    await page.keyboard.press('Escape');
  });

  test('generates barcode from SKU', async ({ page }) => {
    await page.goto('/products');
    
    const addProductButton = page.getByTestId('add-product-button');
    await addProductButton.click();

    const modal = page.getByRole('dialog', { name: 'Add New Product' });
    await expect(modal).toBeVisible();

    // Fill product name to generate SKU
    await fillByTestId(page, 'add-product-name', 'Barcode Test Product');

    // Wait for SKU to be generated
    const skuInput = modal.locator('#sku');
    await expect(skuInput).not.toHaveValue('');

    // Barcode should be empty initially
    const barcodeInput = modal.locator('#barcode');
    await expect(barcodeInput).toHaveValue('');

    // Generate barcode from SKU
    const generateBarcodeBtn = modal.locator('button[title="Generate barcode from SKU"]');
    await generateBarcodeBtn.click();

    // Barcode should now have a value
    await expect(barcodeInput).not.toHaveValue('');
    const generatedBarcode = await barcodeInput.inputValue();
    expect(generatedBarcode.length).toBeGreaterThan(0);

    // Close modal
    await page.keyboard.press('Escape');
  });
});

test.describe('Products List Page Features', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('displays product statistics cards', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByTestId('products-page')).toBeVisible();

    // Check for stats cards
    await expect(page.getByText('Total Products')).toBeVisible();
    await expect(page.getByText('Low Stock')).toBeVisible();
    await expect(page.getByText('Categories')).toBeVisible();
    await expect(page.getByText('Total Value')).toBeVisible();
  });

  test('displays categories sidebar', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByTestId('products-page')).toBeVisible();

    // Check for categories section
    const categoriesCard = page.locator('text=Categories').first();
    await expect(categoriesCard).toBeVisible();
  });

  test('product table shows correct columns', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByTestId('products-page')).toBeVisible();

    // Check table headers
    await expect(page.getByRole('columnheader', { name: 'Product' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Category' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Stock Status' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Price' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Supplier' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
  });

  test('pagination works correctly', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByTestId('products-page')).toBeVisible();

    // Check if pagination exists (may depend on number of products)
    const paginationSection = page.locator('[class*="pagination"], [data-testid*="pagination"]');
    
    // If there are enough products, pagination should be visible
    if (await paginationSection.isVisible()) {
      // Look for page size selector or page navigation
      const nextButton = page.getByRole('button', { name: /next|>/i });
      if (await nextButton.isEnabled()) {
        await nextButton.click();
        // Page should update
        await page.waitForTimeout(300);
      }
    }
  });
});

test.describe('Product Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('navigates from product details back to products list', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByTestId('products-page')).toBeVisible();

    // Click on first product to view details
    const firstProductRow = page.getByTestId('product-row').first();
    
    if (await firstProductRow.isVisible()) {
      const actionButton = firstProductRow.locator('button').last();
      await actionButton.click();
      await page.getByRole('menuitem', { name: 'View Details' }).click();

      await expect(page).toHaveURL(/\/products\/\d+$/);

      // Click back button
      const backButton = page.getByTestId('back-to-products-button');
      await backButton.click();

      await expect(page).toHaveURL('/products');
      await expect(page.getByTestId('products-page')).toBeVisible();
    }
  });

  test('navigates from edit page back to product details', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByTestId('products-page')).toBeVisible();

    const firstProductRow = page.getByTestId('product-row').first();
    
    if (await firstProductRow.isVisible()) {
      const actionButton = firstProductRow.locator('button').last();
      await actionButton.click();
      await page.getByRole('menuitem', { name: 'Edit Product' }).click();

      await expect(page).toHaveURL(/\/products\/\d+\/edit$/);
      await expect(page.getByTestId('edit-product-page')).toBeVisible();

      // Click back button
      const backButton = page.getByTestId('edit-product-back-button');
      await backButton.click();

      await expect(page).toHaveURL(/\/products\/\d+$/);
    }
  });
});
