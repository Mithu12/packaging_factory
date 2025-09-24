import { test, expect } from '@playwright/test';
import { ApiHelper, PageHelper } from '../../utils/api-helpers';
import { getTestBrandId, createTestData } from '../../utils/test-data-setup';
import { cleanupSpecificTestData } from '../../utils/test-data-cleanup';

test.describe('Brands Module E2E Tests', () => {
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
    await cleanupSpecificTestData('brands', [
      'E2E Test Brand',
      'Updated E2E Brand',
      'Brand to Delete'
    ]);
  });

  test.describe('API Tests', () => {
    test('should get all brands', async () => {
      const response = await apiHelper.getBrands(authToken);
      
      expect(response.success).toBe(true);
      expect(response.data).toBeInstanceOf(Array);
      expect(response.data.length).toBeGreaterThan(0);
      
      // Verify brand structure
      const brand = response.data[0];
      expect(brand).toHaveProperty('id');
      expect(brand).toHaveProperty('name');
      expect(brand).toHaveProperty('is_active');
      expect(brand).toHaveProperty('product_count');
    });

    test('should create a new brand', async () => {
      const brandData = {
        name: 'E2E Test Brand',
        description: 'Brand created via E2E test'
      };

      const response = await apiHelper.createBrand(authToken, brandData);
      
      expect(response.success).toBe(true);
      expect(response.data.name).toBe(brandData.name);
      expect(response.data.description).toBe(brandData.description);
      expect(response.data.is_active).toBe(true);
      expect(response.data.id).toBeDefined();
    });

    test('should get a specific brand by ID', async () => {
      const testBrandId = await getTestBrandId();
      const response = await apiHelper.getBrand(authToken, testBrandId);
      
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(testBrandId);
      expect(response.data.name).toBeDefined();
      expect(response.data.is_active).toBeDefined();
    });

    test('should update a brand', async () => {
      // First create a brand to update
      const createResponse = await apiHelper.createBrand(authToken, {
        name: 'Brand to Update',
        description: 'Original description'
      });
      
      const brandId = createResponse.data.id;
      const updateData = {
        name: 'Updated E2E Brand',
        description: 'Updated description'
      };

      const response = await apiHelper.updateBrand(authToken, brandId, updateData);
      
      expect(response.success).toBe(true);
      expect(response.data.name).toBe(updateData.name);
      expect(response.data.description).toBe(updateData.description);
    });

    test('should delete a brand', async () => {
      // First create a brand to delete
      const createResponse = await apiHelper.createBrand(authToken, {
        name: 'Brand to Delete',
        description: 'Will be deleted'
      });
      
      const brandId = createResponse.data.id;
      const response = await apiHelper.deleteBrand(authToken, brandId);
      
      expect(response.success).toBe(true);
      expect(response.message).toContain('deleted successfully');
    });

    test('should handle validation errors', async ({ request }) => {
      const response = await request.post('/api/brands', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: { name: '' } // Invalid: empty name
      });
      
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    test('should get brands by status', async ({ request }) => {
      const response = await request.get('/api/brands/status/active', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
      
      // Verify all returned brands are active
      data.data.forEach((brand: any) => {
        expect(brand.is_active).toBe(true);
      });
    });

    test('should handle invalid brand status', async ({ request }) => {
      const response = await request.get('/api/brands/status/invalid', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.message).toContain('Invalid status');
    });

    test('should require authentication', async ({ request }) => {
      const response = await request.get('/api/brands');
      expect(response.status()).toBe(401);
    });
  });

  test.describe('UI Tests', () => {
    test('should display brands list page', async ({ page }) => {
      await pageHelper.navigateTo('/brands');
      
      // Wait for page to load
      await page.waitForSelector('[data-testid="brands-list"]');
      
      // Check page title
      await expect(page.locator('h1')).toContainText('Brands');
      
      // Check for brands table/list
      await expect(page.locator('[data-testid="brands-table"]')).toBeVisible();
      
      // Check for add brand button
      await expect(page.locator('[data-testid="add-brand-button"]')).toBeVisible();
    });

    test('should create a new brand via UI', async ({ page }) => {
      await pageHelper.navigateTo('/brands');
      
      // Click add brand button
      await page.click('[data-testid="add-brand-button"]');
      
      // Fill brand form
      await page.fill('[data-testid="brand-name"]', 'UI Test Brand');
      await page.fill('[data-testid="brand-description"]', 'Created via UI test');
      
      // Submit form
      await page.click('[data-testid="save-brand-button"]');
      
      // Wait for success message
      await pageHelper.waitForToast('Brand created successfully');
      
      // Verify brand appears in list
      await expect(page.locator('[data-testid="brands-table"]')).toContainText('UI Test Brand');
    });

    test('should edit a brand via UI', async ({ page }) => {
      await pageHelper.navigateTo('/brands');
      
      // Find and click edit button for test brand
      const testBrandRow = page.locator('[data-testid="brand-row"]').filter({ hasText: 'Test Brand 1' });
      await testBrandRow.locator('[data-testid="edit-brand-button"]').click();
      
      // Update brand name
      await page.fill('[data-testid="brand-name"]', 'Updated Test Brand 1');
      
      // Save changes
      await page.click('[data-testid="save-brand-button"]');
      
      // Wait for success message
      await pageHelper.waitForToast('Brand updated successfully');
      
      // Verify changes
      await expect(page.locator('[data-testid="brands-table"]')).toContainText('Updated Test Brand 1');
    });

    test('should delete a brand via UI', async ({ page }) => {
      await pageHelper.navigateTo('/brands');
      
      // Create a brand to delete first
      await page.click('[data-testid="add-brand-button"]');
      await page.fill('[data-testid="brand-name"]', 'Brand to Delete UI');
      await page.click('[data-testid="save-brand-button"]');
      await pageHelper.waitForToast('Brand created successfully');
      
      // Find and click delete button
      const brandRow = page.locator('[data-testid="brand-row"]').filter({ hasText: 'Brand to Delete UI' });
      await brandRow.locator('[data-testid="delete-brand-button"]').click();
      
      // Confirm deletion
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Wait for success message
      await pageHelper.waitForToast('Brand deleted successfully');
      
      // Verify brand is removed
      await expect(page.locator('[data-testid="brands-table"]')).not.toContainText('Brand to Delete UI');
    });

    test('should filter brands by status', async ({ page }) => {
      await pageHelper.navigateTo('/brands');
      
      // Click status filter
      await page.click('[data-testid="status-filter"]');
      await page.click('[data-testid="status-active"]');
      
      // Wait for filtering
      await page.waitForTimeout(500);
      
      // Verify only active brands are shown
      const brandRows = page.locator('[data-testid="brand-row"]');
      const count = await brandRows.count();
      
      if (count > 0) {
        for (let i = 0; i < count; i++) {
          const statusBadge = brandRows.nth(i).locator('[data-testid="brand-status"]');
          await expect(statusBadge).toContainText('Active');
        }
      }
    });

    test('should search brands', async ({ page }) => {
      await pageHelper.navigateTo('/brands');
      
      // Enter search term
      await page.fill('[data-testid="search-brands"]', 'Test Brand');
      
      // Wait for search results
      await page.waitForTimeout(500); // Debounce
      
      // Verify filtered results
      const brandRows = page.locator('[data-testid="brand-row"]');
      const count = await brandRows.count();
      
      for (let i = 0; i < count; i++) {
        const brandName = brandRows.nth(i).locator('[data-testid="brand-name"]');
        await expect(brandName).toContainText('Test Brand');
      }
    });

    test('should handle form validation', async ({ page }) => {
      await pageHelper.navigateTo('/brands');
      await page.click('[data-testid="add-brand-button"]');
      
      // Try to submit empty form
      await page.click('[data-testid="save-brand-button"]');
      
      // Check for validation errors
      await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
    });

    test('should display brand statistics', async ({ page }) => {
      await pageHelper.navigateTo('/brands');
      
      // Check for statistics cards
      await expect(page.locator('[data-testid="total-brands"]')).toBeVisible();
      await expect(page.locator('[data-testid="active-brands"]')).toBeVisible();
      await expect(page.locator('[data-testid="inactive-brands"]')).toBeVisible();
    });
  });

  test.describe('Accessibility Tests', () => {
    test('brands page should be accessible', async ({ page }) => {
      await pageHelper.navigateTo('/brands');
      
      // Basic accessibility checks
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-testid="add-brand-button"]')).toHaveAttribute('type', 'button');
      
      // Check for proper ARIA labels
      await expect(page.locator('[data-testid="search-brands"]')).toHaveAttribute('aria-label');
    });
  });

  test.describe('Performance Tests', () => {
    test('brands list should load within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      await pageHelper.navigateTo('/brands');
      await page.waitForSelector('[data-testid="brands-table"]');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });
  });
});
