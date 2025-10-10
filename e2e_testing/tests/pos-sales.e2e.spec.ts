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

  test('sales return creates reversing voucher', async ({ page }) => {
    await loginAsAdmin(page);

    // First create a POS sale to have an order to return
    await page.goto('/pos');

    // Add product to cart and complete sale
    const addButtons = page.getByTestId('pos-add-to-cart-button');
    await expect(addButtons.first()).toBeVisible();
    await addButtons.first().click();

    await page.getByTestId('pos-checkout-button').click();
    await page.getByLabel('Tax Amount').fill('5');
    await page.getByLabel('Cash Received').fill('100');

    await page.getByRole('button', { name: 'Complete Sale', exact: true }).click();

    // Get order number from receipt
    const receipt = page.getByTestId('sales-receipt');
    await expect(receipt).toBeVisible();
    const orderNumber = await receipt.getByTestId('order-number').innerText();

    // Navigate to sales orders to find the order and create a return
    await page.goto('/sales-orders');
    const search = page.getByTestId('order-search-input');
    await search.fill(orderNumber);

    const orderRow = page.getByTestId('order-row').filter({ hasText: orderNumber });
    await expect(orderRow).toBeVisible();

    // Click return action (assuming there's a return button)
    // This selector may need to be adjusted based on actual UI
    const returnButton = orderRow.getByTestId('order-return-button');
    await expect(returnButton).toBeVisible();
    await returnButton.click();

    // Fill return form (this will depend on actual return UI)
    // For now, assume there's a return creation modal
    const returnModal = page.getByRole('dialog', { name: /create return/i });
    await expect(returnModal).toBeVisible();

    // Select return reason and items to return
    await returnModal.getByLabel(/return reason/i).fill('Customer dissatisfaction');

    // Select first item for return
    const returnItems = returnModal.getByTestId('return-item-checkbox');
    if (await returnItems.count() > 0) {
      await returnItems.first().check();
    }

    // Submit return
    await returnModal.getByRole('button', { name: /create return/i }).click();
    await expect(returnModal).toBeHidden();

    // Find the return in the returns list and complete it
    await page.goto('/returns');
    const returnSearch = page.getByTestId('return-search-input');
    await returnSearch.fill(orderNumber);

    const returnRow = page.getByTestId('return-row').filter({ hasText: orderNumber });
    await expect(returnRow).toBeVisible();

    // Complete the return (this may require approval first)
    const completeButton = returnRow.getByTestId('return-complete-button');
    if (await completeButton.isVisible()) {
      await completeButton.click();
    }

    // Verify that a reversing voucher was created
    // The reversing voucher should have reference starting with "REV-"
    await page.goto('/accounts/vouchers');
    const voucherSearch = page.getByTestId('voucher-search-input');
    await voucherSearch.fill(`REV-${orderNumber}`);

    const reversingRow = page.getByTestId('voucher-row').filter({ hasText: `REV-${orderNumber}` });
    await expect(reversingRow).toBeVisible();

    // Open voucher detail and confirm it's a reversing entry
    await reversingRow.click();
    await expect(page.getByTestId('voucher-reference')).toHaveText(`REV-${orderNumber}`);
    await expect(page.getByTestId('voucher-narration')).toContainText('Reversing Entry');
  });
});
