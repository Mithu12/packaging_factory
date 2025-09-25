import { test, expect, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from '../utils/login';

const CATEGORY_NAME = 'E2E Category';
const BRAND_NAME = 'E2E Brand';
const ORIGIN_NAME = 'E2E Origin';
const SUPPLIER_NAME = 'E2E Supplier';

async function selectOptionByLabel(modal: Locator, page: Page, label: string, option: string) {
  const container = modal.locator(`label:has-text("${label}")`).locator('..');
  const trigger = container.locator('button');
  await trigger.click();
  await page.getByRole('option', { name: option }).click();
}

test.describe.serial('Product management flows', () => {
  let productName = '';
  let productSku = '';
  let productBarcode = '';

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('creates a new product and shows it in the catalog list', async ({ page }) => {
    productName = `E2E Product ${Date.now()}`;
    const productDescription = 'Automated test product for Playwright coverage';

    await page.goto('/products');
    await expect(page.getByRole('button', { name: 'Add Product' })).toBeVisible();

    const addProductButton = page.getByRole('button', { name: 'Add Product' }).first();
    await addProductButton.click();

    const modal = page.getByRole('dialog', { name: 'Add New Product' });
    await expect(modal).toBeVisible();

    await modal.getByLabel('Product Name *').fill(productName);
    await modal.getByLabel('Description').fill(productDescription);

    await selectOptionByLabel(modal, page, 'Category *', CATEGORY_NAME);
    await selectOptionByLabel(modal, page, 'Brand', BRAND_NAME);
    await selectOptionByLabel(modal, page, 'Origin', ORIGIN_NAME);

    await expect(modal.locator('#sku')).not.toHaveValue('');
    productSku = await modal.locator('#sku').inputValue();

    await modal.getByLabel('Cost Price *').fill('15');
    await modal.getByLabel('Selling Price').fill('25');
    await modal.getByLabel('Current Stock *').fill('50');
    await modal.getByLabel('Minimum Stock *').fill('10');
    await modal.getByLabel('Reorder Point').fill('15');

    await selectOptionByLabel(modal, page, 'Supplier *', SUPPLIER_NAME);

    const barcodeButton = modal.locator('button[title="Generate barcode from SKU"]');
    await barcodeButton.click();
    productBarcode = await modal.locator('#barcode').inputValue();

    await modal.getByRole('button', { name: 'Add Product', exact: true }).click();
    await expect(modal).toBeHidden();

    const searchBox = page.getByPlaceholder('Search products...');
    await searchBox.fill(productName);

    const productRow = page.locator('table tbody tr', { hasText: productName });
    await expect(productRow).toBeVisible();
    await expect(productRow).toContainText(SUPPLIER_NAME);
    await expect(productRow).toContainText(CATEGORY_NAME);
  });

  test('displays product details with related supplier context', async ({ page }) => {
    test.skip(productName === '', 'Product must be created in previous test');

    await page.goto('/products');
    const searchBox = page.getByPlaceholder('Search products...');
    await searchBox.fill(productName);

    const productRow = page.locator('table tbody tr', { hasText: productName });
    await expect(productRow).toBeVisible();

    const actionButton = productRow.locator('button').last();
    await actionButton.click();
    await page.getByRole('menuitem', { name: 'View Details' }).click();

    await expect(page).toHaveURL(/\/products\/\d+$/);
    await expect(page.locator('[data-testid="product-title"]')).toHaveText(productName);
    await expect(page.locator('[data-testid="product-sku"]')).toContainText(productSku);
    await expect(page.getByText(CATEGORY_NAME)).toBeVisible();
    await expect(page.getByText(BRAND_NAME)).toBeVisible();
    await expect(page.getByText(ORIGIN_NAME)).toBeVisible();
    if (productBarcode) {
      await expect(page.getByText(productBarcode)).toBeVisible();
    }
    await expect(page.getByText(SUPPLIER_NAME)).toBeVisible();

    const supplierButton = page.getByRole('button', { name: 'View Supplier Details' });
    await supplierButton.click();

    await expect(page).toHaveURL(/\/suppliers\/\d+$/);
    await expect(page.getByRole('heading', { name: SUPPLIER_NAME })).toBeVisible();
  });
});

