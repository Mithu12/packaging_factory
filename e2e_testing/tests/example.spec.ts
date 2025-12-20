import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  // Expect a title "to contain" a substring.
  // Note: Adjust this based on actual app title
  await expect(page).toHaveTitle(/ERP/);
});
