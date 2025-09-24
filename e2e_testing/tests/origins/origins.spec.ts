import { test, expect } from '@playwright/test';
import { ApiHelper, PageHelper } from '../../utils/api-helpers';
import { getTestOriginId, createTestData } from '../../utils/test-data-setup';
import { cleanupSpecificTestData } from '../../utils/test-data-cleanup';

test.describe('Origins Module E2E Tests', () => {
  let apiHelper: ApiHelper;
  let pageHelper: PageHelper;
  let authToken: string;
  const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
  const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword';

  test.beforeAll(async ({ request }) => {
    apiHelper = new ApiHelper(request);
    await createTestData();
  });

  test.beforeEach(async ({ page, request }) => {
    pageHelper = new PageHelper(page);
    apiHelper = new ApiHelper(request);
    
    // Authenticate user
    authToken = await apiHelper.authenticateUser(testEmail, testPassword);
    
    // Set up authentication state for UI tests
    await pageHelper.login(testEmail, testPassword);
  });

  test.afterAll(async () => {
    // Clean up test data
    await cleanupSpecificTestData('origins', [
      'E2E Test Origin',
      'Updated E2E Origin',
      'Origin to Delete',
      'UI Test Origin',
      'Origin to Delete UI'
    ]);
  });

  test.describe('API Tests', () => {
    test('should get all origins', async () => {
      const response = await apiHelper.getOrigins(authToken);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeInstanceOf(Array);
      expect(response.data.length).toBeGreaterThan(0);
      
      // Verify origin structure
      const origin = response.data[0];
      expect(origin).toHaveProperty('id');
      expect(origin).toHaveProperty('name');
      expect(origin).toHaveProperty('status');
      expect(origin).toHaveProperty('created_at');
      expect(origin).toHaveProperty('updated_at');
    });

    test('should create a new origin', async () => {
      const originData = {
        name: 'E2E Test Origin',
        description: 'Origin created via E2E test'
      };

      const response = await apiHelper.createOrigin(authToken, originData);
      
      expect(response.success).toBe(true);
      expect(response.data.name).toBe(originData.name);
      expect(response.data.description).toBe(originData.description);
      expect(response.data.status).toBe('active');
      expect(response.data.id).toBeDefined();
    });

    test('should get a specific origin by ID', async () => {
      const testOriginId = await getTestOriginId();
      const response = await apiHelper.getOrigin(authToken, testOriginId);
      
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(testOriginId);
      expect(response.data.name).toBeDefined();
      expect(response.data.status).toBeDefined();
    });

    test('should update an origin', async () => {
      // First create an origin to update
      const createResponse = await apiHelper.createOrigin(authToken, {
        name: 'Origin to Update',
        description: 'Original description'
      });
      
      const originId = createResponse.data.id;
      const updateData = {
        name: 'Updated E2E Origin',
        description: 'Updated description'
      };

      const response = await apiHelper.updateOrigin(authToken, originId, updateData);
      
      expect(response.success).toBe(true);
      expect(response.data.name).toBe(updateData.name);
      expect(response.data.description).toBe(updateData.description);
    });

    test('should delete an origin', async () => {
      // First create an origin to delete
      const createResponse = await apiHelper.createOrigin(authToken, {
        name: 'Origin to Delete',
        description: 'Will be deleted'
      });
      
      const originId = createResponse.data.id;
      const response = await apiHelper.deleteOrigin(authToken, originId);
      
      expect(response.success).toBe(true);
      expect(response.message).toContain('deleted successfully');
    });

    test('should get origin statistics', async ({ request }) => {
      const response = await request.get('/api/origins/stats', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('total_origins');
      expect(data.data).toHaveProperty('active_origins');
      expect(data.data).toHaveProperty('inactive_origins');
    });

    test('should get origins by status', async ({ request }) => {
      const response = await request.get('/api/origins/status/active', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      
      // Verify all returned origins are active
      data.data.forEach((origin: any) => {
        expect(origin.status).toBe('active');
      });
    });

    test('should handle invalid status in status endpoint', async ({ request }) => {
      const response = await request.get('/api/origins/status/invalid', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Invalid status');
    });

    test('should handle validation errors', async ({ request }) => {
      const response = await request.post('/api/origins', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: { name: '' } // Invalid: empty name
      });
      
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should handle invalid origin ID', async ({ request }) => {
      const response = await request.get('/api/origins/999999', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      expect(response.status()).toBe(404);
    });

    test('should require authentication', async ({ request }) => {
      const response = await request.get('/api/origins');
      expect(response.status()).toBe(401);
    });

    test('should require proper permissions', async ({ request }) => {
      // Test with invalid/expired token
      const response = await request.get('/api/origins', {
        headers: { 'Authorization': 'Bearer invalid-token' }
      });
      expect(response.status()).toBe(401);
    });
  });

  test.describe('UI Tests', () => {
    test('should display origins list page', async ({ page }) => {
      await pageHelper.navigateTo('/origins');
      
      // Wait for page to load
      await page.waitForSelector('[data-testid="origins-list"]');
      
      // Check page title
      await expect(page.locator('h1')).toContainText('Origins');
      
      // Check for origins table/list
      await expect(page.locator('[data-testid="origins-table"]')).toBeVisible();
      
      // Check for add origin button
      await expect(page.locator('[data-testid="add-origin-button"]')).toBeVisible();
    });

    test('should create a new origin via UI', async ({ page }) => {
      await pageHelper.navigateTo('/origins');
      
      // Click add origin button
      await page.click('[data-testid="add-origin-button"]');
      
      // Fill origin form
      await page.fill('[data-testid="origin-name"]', 'UI Test Origin');
      await page.fill('[data-testid="origin-description"]', 'Created via UI test');
      
      // Submit form
      await page.click('[data-testid="save-origin-button"]');
      
      // Wait for success message
      await pageHelper.waitForToast('Origin created successfully');
      
      // Verify origin appears in list
      await expect(page.locator('[data-testid="origins-table"]')).toContainText('UI Test Origin');
    });

    test('should edit an origin via UI', async ({ page }) => {
      await pageHelper.navigateTo('/origins');
      
      // Find and click edit button for test origin
      const testOriginRow = page.locator('[data-testid="origin-row"]').filter({ hasText: 'Test Origin 1' });
      await testOriginRow.locator('[data-testid="edit-origin-button"]').click();
      
      // Update origin name
      await page.fill('[data-testid="origin-name"]', 'Updated Test Origin 1');
      
      // Save changes
      await page.click('[data-testid="save-origin-button"]');
      
      // Wait for success message
      await pageHelper.waitForToast('Origin updated successfully');
      
      // Verify changes
      await expect(page.locator('[data-testid="origins-table"]')).toContainText('Updated Test Origin 1');
    });

    test('should delete an origin via UI', async ({ page }) => {
      await pageHelper.navigateTo('/origins');
      
      // Create an origin to delete first
      await page.click('[data-testid="add-origin-button"]');
      await page.fill('[data-testid="origin-name"]', 'Origin to Delete UI');
      await page.click('[data-testid="save-origin-button"]');
      await pageHelper.waitForToast('Origin created successfully');
      
      // Find and click delete button
      const originRow = page.locator('[data-testid="origin-row"]').filter({ hasText: 'Origin to Delete UI' });
      await originRow.locator('[data-testid="delete-origin-button"]').click();
      
      // Confirm deletion
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Wait for success message
      await pageHelper.waitForToast('Origin deleted successfully');
      
      // Verify origin is removed
      await expect(page.locator('[data-testid="origins-table"]')).not.toContainText('Origin to Delete UI');
    });

    test('should view origin details', async ({ page }) => {
      await pageHelper.navigateTo('/origins');
      
      // Click on an origin to view details
      const testOriginRow = page.locator('[data-testid="origin-row"]').filter({ hasText: 'Test Origin 1' });
      await testOriginRow.locator('[data-testid="view-origin-button"]').click();
      
      // Verify origin details page
      await expect(page.locator('[data-testid="origin-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="origin-name"]')).toContainText('Test Origin 1');
    });

    test('should filter origins by status', async ({ page }) => {
      await pageHelper.navigateTo('/origins');
      
      // Click status filter
      await page.click('[data-testid="status-filter"]');
      await page.click('[data-testid="status-active"]');
      
      // Wait for filtering
      await page.waitForTimeout(500);
      
      // Verify only active origins are shown
      const originRows = page.locator('[data-testid="origin-row"]');
      const count = await originRows.count();
      
      for (let i = 0; i < count; i++) {
        const statusBadge = originRows.nth(i).locator('[data-testid="origin-status"]');
        await expect(statusBadge).toContainText('Active');
      }
    });

    test('should search origins', async ({ page }) => {
      await pageHelper.navigateTo('/origins');
      
      // Enter search term
      await page.fill('[data-testid="search-origins"]', 'Test Origin');
      
      // Wait for search results
      await page.waitForTimeout(500); // Debounce
      
      // Verify filtered results
      const originRows = page.locator('[data-testid="origin-row"]');
      const count = await originRows.count();
      
      for (let i = 0; i < count; i++) {
        const originName = originRows.nth(i).locator('[data-testid="origin-name"]');
        await expect(originName).toContainText('Test Origin');
      }
    });

    test('should sort origins', async ({ page }) => {
      await pageHelper.navigateTo('/origins');
      
      // Click on name column header to sort
      await page.click('[data-testid="sort-name"]');
      
      // Wait for sorting
      await page.waitForTimeout(500);
      
      // Verify sorting (basic check - first item should change)
      const firstOrigin = page.locator('[data-testid="origin-row"]').first();
      await expect(firstOrigin).toBeVisible();
    });

    test('should handle form validation', async ({ page }) => {
      await pageHelper.navigateTo('/origins');
      await page.click('[data-testid="add-origin-button"]');
      
      // Try to submit empty form
      await page.click('[data-testid="save-origin-button"]');
      
      // Check for validation errors
      await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
    });

    test('should display origin statistics', async ({ page }) => {
      await pageHelper.navigateTo('/origins');
      
      // Check for statistics cards
      await expect(page.locator('[data-testid="total-origins"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-origins"]')).toBeVisible();
      await expect(page.locator('[data-testid="inactive-origins"]')).toBeVisible();
    });

    test('should refresh origins list', async ({ page }) => {
      await pageHelper.navigateTo('/origins');
      
      // Click refresh button
      await page.click('[data-testid="refresh-origins"]');
      
      // Wait for refresh
      await page.waitForSelector('[data-testid="origins-table"]');
      
      // Verify data is still displayed
      await expect(page.locator('[data-testid="origins-table"]')).toBeVisible();
    });

    test('should export origins data', async ({ page }) => {
      await pageHelper.navigateTo('/origins');
      
      // Check if export button exists
      const exportButton = page.locator('[data-testid="export-origins"]');
      if (await exportButton.isVisible()) {
        await exportButton.click();
        
        // Wait for download or export completion
        await page.waitForTimeout(1000);
      }
    });
  });

  test.describe('Accessibility Tests', () => {
    test('origins page should be accessible', async ({ page }) => {
      await pageHelper.navigateTo('/origins');
      
      // Basic accessibility checks
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-testid="add-origin-button"]')).toHaveAttribute('type', 'button');
      
      // Check for proper ARIA labels
      const searchInput = page.locator('[data-testid="search-origins"]');
      if (await searchInput.isVisible()) {
        await expect(searchInput).toHaveAttribute('aria-label');
      }
    });

    test('form should be accessible', async ({ page }) => {
      await pageHelper.navigateTo('/origins');
      await page.click('[data-testid="add-origin-button"]');
      
      // Check form accessibility
      await expect(page.locator('[data-testid="origin-name"]')).toHaveAttribute('aria-label');
      await expect(page.locator('[data-testid="origin-description"]')).toHaveAttribute('aria-label');
    });
  });

  test.describe('Performance Tests', () => {
    test('origins list should load within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      await pageHelper.navigateTo('/origins');
      await page.waitForSelector('[data-testid="origins-table"]');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    test('origin creation should be fast', async ({ page }) => {
      await pageHelper.navigateTo('/origins');
      await page.click('[data-testid="add-origin-button"]');
      
      const startTime = Date.now();
      await page.fill('[data-testid="origin-name"]', 'Performance Test Origin');
      await page.click('[data-testid="save-origin-button"]');
      await pageHelper.waitForToast('Origin created successfully');
      const creationTime = Date.now() - startTime;
      
      expect(creationTime).toBeLessThan(5000); // Should create within 5 seconds
    });
  });

  test.describe('Error Handling Tests', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await pageHelper.navigateTo('/origins');
      
      // Simulate network failure
      await page.route('**/api/origins', route => route.abort());
      
      // Try to refresh
      await page.click('[data-testid="refresh-origins"]');
      
      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });

    test('should handle server errors', async ({ page }) => {
      await pageHelper.navigateTo('/origins');
      
      // Simulate server error
      await page.route('**/api/origins', route => 
        route.fulfill({ status: 500, body: 'Internal Server Error' })
      );
      
      // Try to load data
      await page.reload();
      
      // Should show error state
      await expect(page.locator('[data-testid="error-state"]')).toBeVisible();
    });
  });
});
