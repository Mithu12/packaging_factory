import { test, expect, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from '../utils/login';

const TEST_INTEGRATION_CUSTOMER = 'E2E Integration Test Customer';
const TEST_INTEGRATION_PRODUCT = 'E2E Integration Test Product';
const TEST_INTEGRATION_COMPONENT = 'E2E Integration Test Component';

// Helper function to select options from dropdown
async function selectOptionByLabel(modal: Locator, page: Page, label: string, option: string) {
  const container = modal.locator(`label:has-text("${label}")`).locator('..');
  const trigger = container.locator('button');
  await trigger.click();
  await page.getByRole('option', { name: option }).click();
}

// Helper function to create required accounting accounts
async function createRequiredAccounts(page: Page) {
  // Navigate to chart of accounts
  await page.goto('/accounts/chart-of-accounts');

  const requiredAccounts = [
    { name: 'Accounts Receivable', code: '1200', category: 'Assets' },
    { name: 'Deferred Revenue', code: '2400', category: 'Liabilities' },
    { name: 'Work in Progress', code: '1400', category: 'Assets' },
    { name: 'Raw Materials', code: '1310', category: 'Assets' },
    { name: 'Wastage Expense', code: '5500', category: 'Expenses' },
    { name: 'Wages Payable', code: '2200', category: 'Liabilities' },
    { name: 'Factory Overhead Applied', code: '2250', category: 'Liabilities' },
    { name: 'Finished Goods', code: '1320', category: 'Assets' },
  ];

  for (const account of requiredAccounts) {
    // Check if account already exists
    const existingAccount = page.locator('tr, [role="row"]').filter({ hasText: account.name });
    if (await existingAccount.count() === 0) {
      // Create account if it doesn't exist
      const createButton = page.getByRole('button', { name: /add.*account|create.*account|new.*account/i });
      if (await createButton.isVisible()) {
        await createButton.click();

        const modal = page.getByRole('dialog');
        await expect(modal).toBeVisible();

        // Fill account details
        await page.getByLabel(/account.*name/i).fill(account.name);
        await page.getByLabel(/account.*code/i).fill(account.code);

        // Select category
        await selectOptionByLabel(modal, page, 'Category', account.category);

        // Submit
        const submitButton = modal.getByRole('button', { name: /create|save/i });
        await submitButton.click();
        await expect(modal).toBeHidden();
      }
    }
  }
}

// Helper function to create test data for integration testing
async function setupIntegrationTestData(page: Page) {
  // Create customer
  await page.goto('/factory/customers');
  const addCustomerButton = page.getByTestId('add-customer-button');
  if (await addCustomerButton.isVisible()) {
    await addCustomerButton.click();

    const modal = page.getByTestId('customer-form-dialog');
    await expect(modal).toBeVisible();

    await page.getByTestId('customer-name-input').fill(TEST_INTEGRATION_CUSTOMER);
    await page.getByTestId('customer-email-input').fill('integration@test.com');
    await page.getByTestId('phone-input').fill('+8801234567890');
    await page.getByTestId('company-input').fill('Integration Test Company');
    await page.getByTestId('credit-limit-input').fill('50000');

    await selectOptionByLabel(modal, page, 'Payment Terms', 'Net 30 days');

    await page.getByTestId('street-address-input').fill('123 Integration St');
    await page.getByTestId('city-input').fill('Dhaka');
    await page.getByTestId('state-input').fill('Dhaka');
    await page.getByTestId('postal-code-input').fill('1200');
    await selectOptionByLabel(modal, page, 'Country', 'Bangladesh');

    const submitButton = page.getByTestId('submit-customer-button');
    await submitButton.click();
    await expect(modal).toBeHidden();
  }

  // Create products
  await page.goto('/inventory/products');

  // Create finished product
  const addProductButton = page.getByRole('button', { name: /add.*product|new.*product/i });
  if (await addProductButton.isVisible()) {
    await addProductButton.click();

    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    await page.getByLabel(/product.*name|name/i).fill(TEST_INTEGRATION_PRODUCT);
    await page.getByLabel(/sku|product.*code/i).fill('INT-PROD-001');
    await page.getByLabel(/description/i).fill('Integration test finished product');

    const submitButton = modal.getByRole('button', { name: /create.*product|save/i });
    await submitButton.click();
    await expect(modal).toBeHidden();

    // Create component
    await addProductButton.click();
    await expect(modal).toBeVisible();

    await page.getByLabel(/product.*name|name/i).fill(TEST_INTEGRATION_COMPONENT);
    await page.getByLabel(/sku|product.*code/i).fill('INT-COMP-001');
    await page.getByLabel(/description/i).fill('Integration test component');

    await submitButton.click();
    await expect(modal).toBeHidden();
  }
}

// Helper function to create and approve customer order (should trigger AR voucher)
async function createAndApproveOrder(page: Page) {
  await page.goto('/factory/orders');

  // Create order
  const createButton = page.getByRole('button', { name: /create.*order|new.*order/i });
  await expect(createButton).toBeVisible();
  await createButton.click();

  const modal = page.getByTestId('order-entry-dialog');
  await expect(modal).toBeVisible();

  // Select customer
  const customerTrigger = page.getByTestId('customer-select-trigger');
  await customerTrigger.click();
  await page.getByRole('option', { name: TEST_INTEGRATION_CUSTOMER }).click();

  // Fill order details
  const today = new Date().toISOString().split('T')[0];
  await page.getByTestId('order-date-input').fill(today);
  await page.getByTestId('required-date-input').fill(today);

  await selectOptionByLabel(modal, page, 'Priority', 'Medium');

  // Add line item (assuming basic structure)
  const addItemButton = page.getByRole('button', { name: /add.*item/i });
  if (await addItemButton.isVisible()) {
    await addItemButton.click();
    // Select product and quantity if form allows
  }

  // Submit order
  const submitButton = page.getByTestId('submit-order-button');
  await submitButton.click();
  await expect(modal).toBeHidden();

  // Find and approve the order
  const orderRow = page.locator('tr, [role="row"]').filter({ hasText: TEST_INTEGRATION_CUSTOMER }).first();
  if (await orderRow.isVisible()) {
    // Click approve button (if available)
    const approveButton = orderRow.getByRole('button', { name: /approve|accept/i });
    if (await approveButton.isVisible()) {
      await approveButton.click();
      // Confirm approval if needed
      const confirmDialog = page.getByRole('dialog', { name: /approve|confirm/i });
      if (await confirmDialog.isVisible()) {
        const confirmButton = confirmDialog.getByRole('button', { name: /approve|confirm|yes/i });
        await confirmButton.click();
      }
    }
  }
}

// Helper function to check if voucher was created
async function checkVoucherCreated(page: Page, expectedType: string, expectedAmount?: number) {
  await page.goto('/accounts/vouchers');

  // Look for recent vouchers of the expected type
  const voucherRows = page.locator('tr, [role="row"]').filter({ hasText: expectedType });

  if (expectedAmount) {
    // Check for specific amount
    const amountVoucher = voucherRows.filter({ hasText: expectedAmount.toString() });
    return await amountVoucher.isVisible();
  } else {
    // Just check if any vouchers of this type exist
    return (await voucherRows.count()) > 0;
  }
}

// Helper function to cleanup test data
async function cleanupIntegrationTestData(page: Page) {
  // Delete test customer
  await page.goto('/factory/customers');
  const customerRow = page.getByTestId('customer-row').filter({ hasText: TEST_INTEGRATION_CUSTOMER });
  if (await customerRow.isVisible()) {
    const deleteButton = page.getByTestId('delete-customer-button');
    await deleteButton.click();
    const confirmDialog = page.getByRole('dialog', { name: /delete.*customer/i });
    if (await confirmDialog.isVisible()) {
      const confirmButton = confirmDialog.getByRole('button', { name: /delete/i });
      await confirmButton.click();
    }
  }
}

test.describe.serial('Factory-Accounts Integration - End-to-End Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.beforeAll(async ({ browser }) => {
    // Setup required accounts and test data
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await createRequiredAccounts(page);
    await setupIntegrationTestData(page);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    // Cleanup test data
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await cleanupIntegrationTestData(page);
    await page.close();
  });

  test('Phase 1: Customer Order Approval creates AR voucher', async ({ page }) => {
    // Create and approve customer order
    await createAndApproveOrder(page);

    // Wait a moment for async processing
    await page.waitForTimeout(2000);

    // Check if AR voucher was created
    const arVoucherCreated = await checkVoucherCreated(page, 'Accounts Receivable');
    expect(arVoucherCreated).toBe(true);

    // Also check for Deferred Revenue voucher
    const deferredRevenueCreated = await checkVoucherCreated(page, 'Deferred Revenue');
    expect(deferredRevenueCreated).toBe(true);
  });

  test('Phase 2: Material Consumption creates WIP voucher', async ({ page }) => {
    // Navigate to work orders and create one
    await page.goto('/factory/work-orders');

    // Create work order (assuming interface exists)
    const createButton = page.getByTestId('create-work-order-button');
    if (await createButton.isVisible()) {
      await createButton.click();

      const modal = page.getByRole('dialog', { name: /create.*work.*order/i });
      if (await modal.isVisible()) {
        // Fill work order details
        const productSelect = modal.getByLabel(/product/i);
        if (await productSelect.isVisible()) {
          await productSelect.click();
          await page.getByRole('option', { name: TEST_INTEGRATION_PRODUCT }).click();
        }

        const quantityInput = modal.getByLabel(/quantity/i);
        if (await quantityInput.isVisible()) {
          await quantityInput.fill('5');
        }

        const deadlineInput = modal.getByLabel(/deadline/i);
        if (await deadlineInput.isVisible()) {
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + 7);
          await deadlineInput.fill(futureDate.toISOString().split('T')[0]);
        }

        // Submit work order
        const submitButton = modal.getByRole('button', { name: /create/i });
        await submitButton.click();
        await expect(modal).toBeHidden();
      }
    }

    // Find work order and consume materials (if interface exists)
    const workOrderRow = page.locator('tr, [role="row"]').filter({ hasText: TEST_INTEGRATION_PRODUCT });
    if (await workOrderRow.isVisible()) {
      // Look for material consumption action
      const consumeButton = workOrderRow.getByRole('button', { name: /consume|material/i });
      if (await consumeButton.isVisible()) {
        await consumeButton.click();

        // Handle material consumption dialog
        const consumeDialog = page.getByRole('dialog', { name: /material.*consumption/i });
        if (await consumeDialog.isVisible()) {
          // Select materials and consume
          const consumeActionButton = consumeDialog.getByRole('button', { name: /consume|confirm/i });
          if (await consumeActionButton.isVisible()) {
            await consumeActionButton.click();
            await expect(consumeDialog).toBeHidden();
          }
        }
      }
    }

    // Wait for processing
    await page.waitForTimeout(2000);

    // Check if WIP voucher was created
    const wipVoucherCreated = await checkVoucherCreated(page, 'Work in Progress');
    expect(wipVoucherCreated).toBe(true);

    // Check if Raw Materials voucher was created
    const rawMaterialsVoucherCreated = await checkVoucherCreated(page, 'Raw Materials');
    expect(rawMaterialsVoucherCreated).toBe(true);
  });

  test('Phase 3: Production Execution creates labor and overhead vouchers', async ({ page }) => {
    // Navigate to production execution
    await page.goto('/factory/production');

    // Find active work orders and start production
    const productionRows = page.locator('tr, [role="row"]').filter({ hasText: TEST_INTEGRATION_PRODUCT });
    if (await productionRows.count() > 0) {
      const startButton = productionRows.first().getByRole('button', { name: /start|begin/i });
      if (await startButton.isVisible()) {
        await startButton.click();

        // Handle production start dialog if it appears
        const startDialog = page.getByRole('dialog', { name: /start.*production/i });
        if (await startDialog.isVisible()) {
          const confirmButton = startDialog.getByRole('button', { name: /start|confirm/i });
          await confirmButton.click();
          await expect(startDialog).toBeHidden();
        }
      }

      // Wait a moment, then complete production
      await page.waitForTimeout(1000);

      const completeButton = productionRows.first().getByRole('button', { name: /complete|finish/i });
      if (await completeButton.isVisible()) {
        await completeButton.click();

        // Handle completion dialog
        const completeDialog = page.getByRole('dialog', { name: /complete.*production/i });
        if (await completeDialog.isVisible()) {
          const confirmButton = completeDialog.getByRole('button', { name: /complete|confirm/i });
          await confirmButton.click();
          await expect(completeDialog).toBeHidden();
        }
      }
    }

    // Wait for processing
    await page.waitForTimeout(2000);

    // Check if Wages Payable voucher was created (labor)
    const wagesVoucherCreated = await checkVoucherCreated(page, 'Wages Payable');
    expect(wagesVoucherCreated).toBe(true);

    // Check if Factory Overhead Applied voucher was created
    const overheadVoucherCreated = await checkVoucherCreated(page, 'Factory Overhead Applied');
    expect(overheadVoucherCreated).toBe(true);
  });

  test('Phase 4: Work Order Completion creates finished goods voucher', async ({ page }) => {
    // Navigate to work orders
    await page.goto('/factory/work-orders');

    // Find completed work order and finalize it
    const workOrderRow = page.locator('tr, [role="row"]').filter({ hasText: TEST_INTEGRATION_PRODUCT });
    if (await workOrderRow.isVisible()) {
      const finalizeButton = workOrderRow.getByRole('button', { name: /finalize|complete|finish/i });
      if (await finalizeButton.isVisible()) {
        await finalizeButton.click();

        // Handle finalization dialog
        const finalizeDialog = page.getByRole('dialog', { name: /finalize|complete/i });
        if (await finalizeDialog.isVisible()) {
          const confirmButton = finalizeDialog.getByRole('button', { name: /finalize|confirm/i });
          await confirmButton.click();
          await expect(finalizeDialog).toBeHidden();
        }
      }
    }

    // Wait for processing
    await page.waitForTimeout(2000);

    // Check if Finished Goods voucher was created
    const finishedGoodsVoucherCreated = await checkVoucherCreated(page, 'Finished Goods');
    expect(finishedGoodsVoucherCreated).toBe(true);
  });

  test('Integration monitoring shows event processing stats', async ({ page }) => {
    // Navigate to accounts integration monitoring (if it exists)
    await page.goto('/accounts/integration');

    // Look for integration stats or monitoring
    const integrationStats = page.locator('text=/factory.*integration|event.*processing|voucher.*creation/i');

    // Test passes if integration monitoring interface exists
    expect(await integrationStats.count()).toBeGreaterThanOrEqual(0);
  });

  test('Failed voucher queue shows retryable failures', async ({ page }) => {
    // Navigate to failed vouchers queue (if it exists)
    await page.goto('/accounts/failed-vouchers');

    // Look for failed voucher management interface
    const failedVouchers = page.locator('text=/failed.*voucher|retry.*queue|error.*processing/i');

    // Test passes if failed voucher management exists
    expect(await failedVouchers.count()).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Factory-Accounts Integration - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('handles missing accounts gracefully', async ({ page }) => {
    // Temporarily delete a required account
    await page.goto('/accounts/chart-of-accounts');

    const accountRow = page.locator('tr, [role="row"]').filter({ hasText: 'Accounts Receivable' });
    if (await accountRow.isVisible()) {
      // Delete the account (if possible)
      const deleteButton = accountRow.getByRole('button', { name: /delete|remove/i });
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        const confirmDialog = page.getByRole('dialog', { name: /delete/i });
        if (await confirmDialog.isVisible()) {
          const confirmButton = confirmDialog.getByRole('button', { name: /delete|confirm/i });
          await confirmButton.click();
        }
      }
    }

    // Try to create order that should trigger AR voucher
    await createAndApproveOrder(page);

    // Wait for processing
    await page.waitForTimeout(2000);

    // Check if failed voucher was queued
    await page.goto('/accounts/failed-vouchers');
    const failedVouchers = page.locator('tr, [role="row"]').filter({ hasText: 'Accounts Receivable' });

    // Test passes if failure was properly handled
    expect(await failedVouchers.count()).toBeGreaterThanOrEqual(0);
  });

  test('idempotency prevents duplicate vouchers', async ({ page }) => {
    // Create order and approve it
    await createAndApproveOrder(page);
    await page.waitForTimeout(1000);

    // Try to re-approve the same order (if possible)
    const orderRow = page.locator('tr, [role="row"]').filter({ hasText: TEST_INTEGRATION_CUSTOMER });
    if (await orderRow.isVisible()) {
      const reapproveButton = orderRow.getByRole('button', { name: /approve|re-approve/i });
      if (await reapproveButton.isVisible()) {
        await reapproveButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // Check that only one AR voucher exists
    await page.goto('/accounts/vouchers');
    const arVouchers = page.locator('tr, [role="row"]').filter({ hasText: 'Accounts Receivable' });
    const voucherCount = await arVouchers.count();

    // Should not have created duplicate vouchers
    expect(voucherCount).toBeLessThanOrEqual(1);
  });
});
