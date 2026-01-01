import { test, expect } from '@playwright/test';
import { login } from './utils/login-helper';

test.describe('Category Management', () => {
    // Unique category name for this run to avoid collisions
    const TEST_CATEGORY_NAME = `E2E Test Category ${Date.now()}`;
    const TEST_CATEGORY_DESC = 'Created by Playwright E2E Test';
    const UPDATED_CATEGORY_NAME = `${TEST_CATEGORY_NAME} (Updated)`;

    test.beforeEach(async ({ page }) => {
        await login(page);
        await page.goto('/inventory/categories');
        await page.waitForLoadState('networkidle');
    });

    test('should create, update, and delete a product category', async ({ page }) => {
        // --- CREATE ---
        // Open Add Category Dialog
        await page.click('button:has-text("Add Category")');
        
        // Fill Form
        await expect(page.locator('h2:has-text("Add New Category")')).toBeVisible();
        await page.fill('input[name="name"]', TEST_CATEGORY_NAME);
        await page.fill('input[name="description"]', TEST_CATEGORY_DESC);

        // Submit
        // Note: There are two "Add Category" buttons (trigger and submit). 
        // We need to target the submit button inside the dialog specifically.
        await page.click('button[type="submit"]:has-text("Add Category")');

        // Verify Success Toast
        await expect(page.locator('.toast')).toContainText('Category added successfully');
        await expect(page.locator('.toast')).toBeVisible();

        // Verify it appears in the list (search for it first to be safe)
        await page.fill('input[placeholder="Search categories..."]', TEST_CATEGORY_NAME);
        // Wait for search debounce/filtering
        await page.waitForTimeout(500); 
        await expect(page.locator(`text=${TEST_CATEGORY_NAME}`).first()).toBeVisible();

        // --- UPDATE ---
        // Find the card containing our category and click Edit
        // We use the unique name to find the specific card
        const card = page.locator('.rounded-xl', { hasText: TEST_CATEGORY_NAME }).first();
        // Assuming the Edit button is the first button in the actions area or use accessibility label if available.
        // Based on code: Edit icon is Lucide Edit.
        // We'll traverse from the card title or use a more specific selector strategy.
        // Best approach: Find the row/card, then find the edit button within it.
        // The edit button has an onClick handler and usually an icon.
        
        // Let's use layout selector: find the card with the text, then click the button with the edit icon inside it.
        // Since we don't have distinct classes/IDs, we might rely on order or generic button selector within the card.
        // The Edit button is in `div.flex.gap-2` inside `CardHeader`.
        
        // Assuming simple layout:
        await card.locator('button').first().click(); // First button is usually Edit, second is Delete based on code order

        // Wait for Edit Dialog
        await expect(page.locator('h2:has-text("Edit Category")')).toBeVisible();
        
        // Modify Name
        await page.fill('input[name="name"]', UPDATED_CATEGORY_NAME);
        await page.click('button:has-text("Update Category")');

        // Verify Update Toast
        await expect(page.locator('.toast')).toContainText('Category updated successfully');
        
        // Verify Update in List
        await page.fill('input[placeholder="Search categories..."]', UPDATED_CATEGORY_NAME);
        await page.waitForTimeout(500);
        await expect(page.locator(`text=${UPDATED_CATEGORY_NAME}`).first()).toBeVisible();

        // --- DELETE (Cleanup) ---
        // Ensure we find the updated card
        const updatedCard = page.locator('.rounded-xl', { hasText: UPDATED_CATEGORY_NAME }).first();
        
        // Click Delete (Second button)
        await updatedCard.locator('button').nth(1).click();
        
        // Verify Delete Toast
        await expect(page.locator('.toast')).toContainText('Category deleted successfully');
        
        // Verify Removal
        // Wait a bit for list refresh
        await page.waitForTimeout(1000);
        await expect(page.locator(`text=${UPDATED_CATEGORY_NAME}`)).toBeHidden();
    });
});
