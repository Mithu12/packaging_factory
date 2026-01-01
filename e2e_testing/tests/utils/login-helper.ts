import { Page, expect } from '@playwright/test';

export async function login(page: Page) {
  // Navigate to login page
  await page.goto('/login');

  // Check if we are already logged in (redirected to dashboard)
  if (page.url().includes('/dashboard')) {
      return;
  }

  // Fill credentials
  await page.fill('input[name="username"]', 'admin');
  await page.fill('input[name="password"]', 'admin123');

  // Submit
  await page.click('button[type="submit"]');

  // Wait for navigation and verify success
  // We expect to be redirected to dashboard
  await expect(page).toHaveURL(/\/dashboard/);
  
  // Optional: Wait for network idle to ensure dashboard data is loaded
  await page.waitForLoadState('networkidle');
}
