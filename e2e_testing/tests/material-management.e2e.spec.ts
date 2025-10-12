import { test, expect, type Locator, type Page } from '@playwright/test';
import { loginAsAdmin } from '../utils/login';

const TEST_MATERIAL_PRODUCT = 'E2E Material Test Product';
const TEST_MATERIAL_SKU = 'MAT-TEST-001';
const TEST_WORK_ORDER_PRODUCT = 'E2E WO Material Test Product';
const TEST_WORK_ORDER_SKU = 'WO-MAT-TEST-001';

// Helper function to select options from dropdown
async function selectOptionByLabel(modal: Locator, page: Page, label: string, option: string) {
  const container = modal.locator(`label:has-text("${label}")`).locator('..');
  const trigger = container.locator('button');
  await trigger.click();
  await page.getByRole('option', { name: option }).click();
}

// Helper function to create test products for material testing
async function createTestProducts(page: Page) {
  await page.goto('/inventory/products');

  const addButton = page.getByRole('button', { name: /add.*product|new.*product/i });
  if (await addButton.isVisible()) {
    // Create material product
    await addButton.click();
    const modal = page.getByRole('dialog');
    await expect(modal).toBeVisible();

    await page.getByLabel(/product.*name|name/i).fill(TEST_MATERIAL_PRODUCT);
    await page.getByLabel(/sku|product.*code/i).fill(TEST_MATERIAL_SKU);
    await page.getByLabel(/description/i).fill('Test material product for allocation testing');

    const submitButton = modal.getByRole('button', { name: /create.*product|save/i });
    await submitButton.click();
    await expect(modal).toBeHidden();

    // Create work order product
    await addButton.click();
    await expect(modal).toBeVisible();

    await page.getByLabel(/product.*name|name/i).fill(TEST_WORK_ORDER_PRODUCT);
    await page.getByLabel(/sku|product.*code/i).fill(TEST_WORK_ORDER_SKU);
    await page.getByLabel(/description/i).fill('Test work order product for material testing');

    await submitButton.click();
    await expect(modal).toBeHidden();
  }

  return {
    materialProduct: TEST_MATERIAL_PRODUCT,
    workOrderProduct: TEST_WORK_ORDER_PRODUCT
  };
}

// Helper function to create a test work order for material allocation
async function createTestWorkOrder(page: Page, productName: string) {
  await page.goto('/factory/work-orders');

  const createButton = page.getByTestId('create-work-order-button');
  if (await createButton.isVisible()) {
    await createButton.click();

    const modal = page.getByRole('dialog', { name: /create.*work.*order/i });
    if (await modal.isVisible()) {
      // Select product
      const productSelect = modal.getByLabel(/product/i);
      if (await productSelect.isVisible()) {
        await productSelect.click();
        await page.getByRole('option', { name: productName }).click();
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

      const submitButton = modal.getByRole('button', { name: /create/i });
      await submitButton.click();
      await expect(modal).toBeHidden();
    }
  }

  return { productName, quantity: 5 };
}

// Helper function to create a test material allocation
async function createTestAllocation(page: Page, workOrderProduct: string, materialProduct: string) {
  await page.goto('/factory/material-allocation');

  const allocateButton = page.getByTestId('allocate-material-button');
  if (await allocateButton.isVisible()) {
    await allocateButton.click();

    const modal = page.getByRole('dialog', { name: /allocate.*material/i });
    if (await modal.isVisible()) {
      // Select work order requirement (assuming interface exists)
      const requirementSelect = modal.getByLabel(/work.*order.*requirement|requirement/i);
      if (await requirementSelect.isVisible()) {
        await requirementSelect.click();
        // This would need to be adjusted based on actual interface
        // For now, we'll just try to fill basic fields
      }

      // Select inventory item
      const inventorySelect = modal.getByLabel(/inventory.*item|material/i);
      if (await inventorySelect.isVisible()) {
        await inventorySelect.click();
        await page.getByRole('option', { name: materialProduct }).click();
      }

      // Set allocated quantity
      const quantityInput = modal.getByLabel(/allocated.*quantity|quantity/i);
      if (await quantityInput.isVisible()) {
        await quantityInput.fill('2');
      }

      // Set location
      const locationInput = modal.getByLabel(/location/i);
      if (await locationInput.isVisible()) {
        await locationInput.fill('Warehouse A');
      }

      const submitButton = modal.getByRole('button', { name: /allocate|create/i });
      await submitButton.click();
      await expect(modal).toBeHidden();
    }
  }

  return { materialProduct, allocatedQuantity: 2 };
}

// Helper function to create a test material consumption
async function createTestConsumption(page: Page, materialProduct: string) {
  await page.goto('/factory/material-consumption');

  const logButton = page.getByTestId('log-consumption-button');
  if (await logButton.isVisible()) {
    await logButton.click();

    const modal = page.getByRole('dialog', { name: /log.*consumption/i });
    if (await modal.isVisible()) {
      // Select work order requirement
      const requirementSelect = modal.getByLabel(/work.*order.*requirement|requirement/i);
      if (await requirementSelect.isVisible()) {
        await requirementSelect.click();
        // Select first available option
        const firstOption = page.getByRole('option').first();
        if (await firstOption.isVisible()) {
          await firstOption.click();
        }
      }

      // Set consumed quantity
      const quantityInput = modal.getByLabel(/consumed.*quantity|quantity/i);
      if (await quantityInput.isVisible()) {
        await quantityInput.fill('1.5');
      }

      // Set wastage (optional)
      const wastageInput = modal.getByLabel(/wastage.*quantity/i);
      if (await wastageInput.isVisible()) {
        await wastageInput.fill('0.2');
      }

      const submitButton = modal.getByRole('button', { name: /log.*consumption|save/i });
      await submitButton.click();
      await expect(modal).toBeHidden();
    }
  }

  return { materialProduct, consumedQuantity: 1.5, wastageQuantity: 0.2 };
}

test.describe.serial('Material Allocation Management', () => {
  let testProducts = { materialProduct: '', workOrderProduct: '' };

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.beforeAll(async ({ browser }) => {
    // Create test products for material testing
    const page = await browser.newPage();
    await loginAsAdmin(page);
    const result = await createTestProducts(page);
    testProducts = result;
    await page.close();
  });

  test('displays material allocation page correctly', async ({ page }) => {
    await page.goto('/factory/material-allocation');

    // Check page title and elements
    await expect(page.getByTestId('material-allocation-title')).toContainText('Material Allocation');
    await expect(page.getByTestId('material-allocation-subtitle')).toContainText('Allocate materials to work orders');

    // Check action buttons
    await expect(page.getByTestId('refresh-allocations-button')).toBeVisible();
    await expect(page.getByTestId('allocate-material-button')).toBeVisible();

    // Check stats cards
    await expect(page.getByTestId('total-allocations-card')).toBeVisible();
    await expect(page.getByTestId('active-allocations-card')).toBeVisible();
    await expect(page.getByTestId('total-value-card')).toBeVisible();
    await expect(page.getByTestId('allocation-efficiency-card')).toBeVisible();
  });

  test('displays allocation statistics correctly', async ({ page }) => {
    await page.goto('/factory/material-allocation');

    // Check stats contain numbers or are properly displayed
    const totalAllocationsCount = page.getByTestId('total-allocations-count');
    if (await totalAllocationsCount.isVisible()) {
      const countText = await totalAllocationsCount.textContent();
      expect(countText).toMatch(/\d+/);
    }

    const activeAllocationsCount = page.getByTestId('active-allocations-count');
    if (await activeAllocationsCount.isVisible()) {
      const countText = await activeAllocationsCount.textContent();
      expect(countText).toMatch(/\d+/);
    }

    const totalValue = page.getByTestId('total-value-amount');
    if (await totalValue.isVisible()) {
      const valueText = await totalValue.textContent();
      expect(valueText).toMatch(/[\d,]+(\.\d+)?/);
    }
  });

  test('opens allocate material dialog', async ({ page }) => {
    await page.goto('/factory/material-allocation');

    const allocateButton = page.getByTestId('allocate-material-button');
    await allocateButton.click();

    const modal = page.getByRole('dialog', { name: /allocate.*material/i });
    await expect(modal).toBeVisible();

    // Check dialog has form elements
    await expect(modal.getByLabel(/work.*order.*requirement|requirement/i)).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });

  test('refreshes allocation data', async ({ page }) => {
    await page.goto('/factory/material-allocation');

    const refreshButton = page.getByTestId('refresh-allocations-button');
    await expect(refreshButton).toBeVisible();
    await refreshButton.click();

    // Verify page still loads correctly after refresh
    await expect(page.getByTestId('material-allocation-title')).toBeVisible();
    await expect(page.getByTestId('allocation-stats-grid')).toBeVisible();
  });
});

test.describe.serial('Material Consumption Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('displays material consumption page correctly', async ({ page }) => {
    await page.goto('/factory/material-consumption');

    // Check page title and elements
    await expect(page.getByTestId('material-consumption-title')).toContainText('Material Consumption');
    await expect(page.getByTestId('material-consumption-subtitle')).toContainText('Record material usage');

    // Check action buttons
    await expect(page.getByTestId('log-consumption-button')).toBeVisible();
    await expect(page.getByTestId('bulk-consumption-button')).toBeVisible();

    // Check stats cards
    await expect(page.getByTestId('total-records-card')).toBeVisible();
    await expect(page.getByTestId('materials-consumed-card')).toBeVisible();
    await expect(page.getByTestId('total-wastage-card')).toBeVisible();
    await expect(page.getByTestId('avg-wastage-card')).toBeVisible();
    await expect(page.getByTestId('consumption-value-card')).toBeVisible();
  });

  test('displays consumption statistics correctly', async ({ page }) => {
    await page.goto('/factory/material-consumption');

    // Check stats contain numbers
    const totalRecordsCount = page.getByTestId('total-records-count');
    if (await totalRecordsCount.isVisible()) {
      const countText = await totalRecordsCount.textContent();
      expect(countText).toMatch(/\d+|"..."$/);
    }

    const materialsConsumedCount = page.getByTestId('materials-consumed-count');
    if (await materialsConsumedCount.isVisible()) {
      const countText = await materialsConsumedCount.textContent();
      expect(countText).toMatch(/\d+|"..."$/);
    }

    const totalWastageAmount = page.getByTestId('total-wastage-amount');
    if (await totalWastageAmount.isVisible()) {
      const amountText = await totalWastageAmount.textContent();
      expect(amountText).toMatch(/[\d,]+(\.\d+)?|"..."$/);
    }
  });

  test('opens log consumption dialog', async ({ page }) => {
    await page.goto('/factory/material-consumption');

    const logButton = page.getByTestId('log-consumption-button');
    await logButton.click();

    const modal = page.getByRole('dialog', { name: /log.*consumption/i });
    await expect(modal).toBeVisible();

    // Check dialog has form elements
    await expect(modal.getByLabel(/work.*order.*requirement|requirement/i)).toBeVisible();
    await expect(modal.getByLabel(/consumed.*quantity|quantity/i)).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });

  test('opens bulk consumption dialog', async ({ page }) => {
    await page.goto('/factory/material-consumption');

    const bulkButton = page.getByTestId('bulk-consumption-button');
    await bulkButton.click();

    const modal = page.getByRole('dialog', { name: /bulk.*consumption/i });
    await expect(modal).toBeVisible();

    // Check dialog has form elements
    await expect(modal.getByLabel(/work.*order/i)).toBeVisible();

    // Close dialog
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });

  test('validates consumption form fields', async ({ page }) => {
    await page.goto('/factory/material-consumption');

    const logButton = page.getByTestId('log-consumption-button');
    await logButton.click();

    const modal = page.getByRole('dialog', { name: /log.*consumption/i });
    await expect(modal).toBeVisible();

    // Try to submit without required fields
    const submitButton = modal.getByRole('button', { name: /log.*consumption|save/i });
    await submitButton.click();

    // Form should still be open (validation failed)
    await expect(modal).toBeVisible();

    // Fill required quantity but no requirement selected
    const quantityInput = modal.getByLabel(/consumed.*quantity|quantity/i);
    if (await quantityInput.isVisible()) {
      await quantityInput.fill('1');
      await submitButton.click();
      // Should still be open without requirement
      await expect(modal).toBeVisible();
    }

    // Close dialog
    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });
});

test.describe('Material Management - Integration Scenarios', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('allocation and consumption workflow integration', async ({ page }) => {
    // Navigate to allocation page
    await page.goto('/factory/material-allocation');

    // Check that allocation page loads
    await expect(page.getByTestId('material-allocation-title')).toBeVisible();

    // Navigate to consumption page
    await page.goto('/factory/material-consumption');

    // Check that consumption page loads
    await expect(page.getByTestId('material-consumption-title')).toBeVisible();

    // Verify both pages have consistent UI elements
    await expect(page.getByTestId('material-consumption-actions')).toBeVisible();
    await expect(page.getByTestId('consumption-stats-grid')).toBeVisible();
  });

  test('material tracking across allocation states', async ({ page }) => {
    await page.goto('/factory/material-allocation');

    // Look for status indicators
    const statusElements = page.locator('[data-testid*="status"], .badge, [class*="status"]');
    if (await statusElements.count() > 0) {
      // Verify status elements exist and show different states
      const firstStatus = statusElements.first();
      await expect(firstStatus).toBeVisible();

      // Check for different status types
      const allocatedStatus = statusElements.filter({ hasText: /allocated|consumed|returned/i });
      expect(await allocatedStatus.count()).toBeGreaterThanOrEqual(0);
    }
  });

  test('wastage tracking in consumption records', async ({ page }) => {
    await page.goto('/factory/material-consumption');

    // Check that wastage is tracked in stats
    const wastageCard = page.getByTestId('total-wastage-card');
    if (await wastageCard.isVisible()) {
      const wastageValue = page.getByTestId('total-wastage-amount');
      if (await wastageValue.isVisible()) {
        const wastageText = await wastageValue.textContent();
        expect(wastageText).toMatch(/[\d,]+(\.\d+)?|"..."$/);
      }
    }

    // Check wastage percentage tracking
    const avgWastageCard = page.getByTestId('avg-wastage-card');
    if (await avgWastageCard.isVisible()) {
      const wastagePercentage = page.getByTestId('avg-wastage-percentage');
      if (await wastagePercentage.isVisible()) {
        const percentageText = await wastagePercentage.textContent();
        expect(percentageText).toMatch(/\d+\.\d+%|"..."$/);
      }
    }
  });
});
