import { test, expect } from '@playwright/test';
import { loginAsAdmin } from '../utils/login';

// Basic smoke e2e: create a POS sale that completes immediately and verify a voucher is created

test.describe.serial('POS → Accounts voucher integration', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('completed POS order creates a voucher', async ({ page }) => {
    await page.goto('/pos');

    // Add first product to cart
    const addButtons = page.getByTestId('pos-add-to-cart-button');
    await expect(addButtons.first()).toBeVisible();
    await addButtons.first().click();

    // Proceed to checkout
    await page.getByTestId('pos-checkout-button').click();

    // Fill tax and cash to create partial due (so both Cash and AR are present)
    // These labels/selectors must exist in POS checkout UI
    await page.getByLabel('Tax Amount').fill('10');
    await page.getByLabel('Cash Received').fill('50');

    // Complete sale
    await page.getByRole('button', { name: 'Complete Sale', exact: true }).click();

    // Grab order number from receipt section
    const receipt = page.getByTestId('sales-receipt');
    await expect(receipt).toBeVisible();
    const orderNumber = await receipt.getByTestId('order-number').innerText();

    // Navigate to vouchers and search by reference
    await page.goto('/accounts/vouchers');
    const search = page.getByTestId('voucher-search-input');
    await expect(search).toBeVisible();
    await search.fill(orderNumber);

    const row = page.getByTestId('voucher-row').filter({ hasText: orderNumber });
    await expect(row).toBeVisible();

    // Open voucher detail and confirm reference
    await row.click();
    await expect(page.getByTestId('voucher-reference')).toHaveText(orderNumber);
  });
});
