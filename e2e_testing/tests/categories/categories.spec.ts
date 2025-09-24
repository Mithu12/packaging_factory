import { test, expect } from '@playwright/test';
import { ApiHelper, PageHelper } from '../../utils/api-helpers';
import { getTestCategoryId, createTestData } from '../../utils/test-data-setup';
import { cleanupSpecificTestData } from '../../utils/test-data-cleanup';

test.describe('Categories Module E2E Tests', () => {
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
    await cleanupSpecificTestData('categories', [
      'E2E Test Category',
      'Updated E2E Category',
      'Category to Delete',
      'UI Test Category',
      'Category to Delete UI'
    ]);
  });

  test.describe('API Tests', () => {
    test('should get all categories', async () => {
      const response = await apiHelper.getCategories(authToken);
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('categories');
      expect(response.data.categories).toBeInstanceOf(Array);
      expect(response.data.categories.length).toBeGreaterThan(0);
      
      // Verify category structure
      const category = response.data.categories[0];
      expect(category).toHaveProperty('id');
      expect(category).toHaveProperty('name');
      // Categories don't have a status field
      expect(category).toHaveProperty('subcategory_count');
    });

    test('should get categories with pagination', async () => {
      const response = await apiHelper.getCategories(authToken, { page: 1, limit: 5 });
      
      expect(response.success).toBe(true);
      expect(response.data).toHaveProperty('categories');
      expect(response.data).toHaveProperty('total');
      expect(response.data).toHaveProperty('page');
      expect(response.data).toHaveProperty('limit');
      expect(response.data.categories.length).toBeLessThanOrEqual(5);
    });

    test('should create a new category', async () => {
      const categoryData = {
        name: 'E2E Test Category',
        description: 'Category created via E2E test'
      };

      const response = await apiHelper.createCategory(authToken, categoryData);
      
      expect(response.success).toBe(true);
      expect(response.data.name).toBe(categoryData.name);
      expect(response.data.description).toBe(categoryData.description);
      // Categories don't have a status field - they're always active
      expect(response.data.id).toBeDefined();
    });

    test('should get a specific category by ID', async () => {
      const testCategoryId = await getTestCategoryId();
      const response = await apiHelper.getCategory(authToken, testCategoryId);
      
      expect(response.success).toBe(true);
      expect(response.data.id).toBe(testCategoryId);
      expect(response.data.name).toBeDefined();
      // Categories don't have a status field
      expect(response.data).toHaveProperty('subcategories');
    });

    test('should update a category', async () => {
      // First create a category to update
      const createResponse = await apiHelper.createCategory(authToken, {
        name: 'Category to Update',
        description: 'Original description'
      });
      
      const categoryId = createResponse.data.id;
      const updateData = {
        name: 'Updated E2E Category',
        description: 'Updated description'
      };

      const response = await apiHelper.updateCategory(authToken, categoryId, updateData);
      
      expect(response.success).toBe(true);
      expect(response.data.name).toBe(updateData.name);
      expect(response.data.description).toBe(updateData.description);
    });

    test('should delete a category', async () => {
      // First create a category to delete
      const createResponse = await apiHelper.createCategory(authToken, {
        name: 'Category to Delete',
        description: 'Will be deleted'
      });
      
      const categoryId = createResponse.data.id;
      const response = await apiHelper.deleteCategory(authToken, categoryId);
      
      expect(response.success).toBe(true);
      expect(response.message).toContain('deleted successfully');
    });

    test('should get category statistics', async ({ request }) => {
      const response = await request.get('/api/categories/stats', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('total_categories');
      expect(data.data).toHaveProperty('active_categories');
      expect(data.data).toHaveProperty('inactive_categories');
    });

    test('should search categories', async ({ request }) => {
      const response = await request.get('/api/categories/search?q=Test', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toBeInstanceOf(Array);
    });

    test('should handle validation errors', async ({ request }) => {
      const response = await request.post('/api/categories', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: { name: '' } // Invalid: empty name
      });
      
      expect(response.status()).toBe(400);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should require authentication', async ({ request }) => {
      const response = await request.get('/api/categories');
      expect(response.status()).toBe(401);
    });
  });

  test.describe('Subcategories API Tests', () => {
    let testCategoryId: number;

    test.beforeEach(async () => {
      testCategoryId = await getTestCategoryId();
    });

    test('should get subcategories for a category', async ({ request }) => {
      const response = await request.get(`/api/categories/${testCategoryId}/subcategories`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('subcategories');
    });

    test('should create a subcategory', async ({ request }) => {
      const subcategoryData = {
        name: 'E2E Test Subcategory',
        description: 'Subcategory created via E2E test',
        category_id: testCategoryId
      };

      const response = await request.post('/api/categories/subcategories', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: subcategoryData
      });
      
      expect(response.status()).toBe(201);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.name).toBe(subcategoryData.name);
      expect(data.data.category_id).toBe(testCategoryId);
    });

    test('should get all subcategories', async ({ request }) => {
      const response = await request.get('/api/categories/subcategories', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      
      expect(response.status()).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('subcategories');
    });
  });

  test.describe('UI Tests', () => {
    test('should display categories list page', async ({ page }) => {
      await pageHelper.navigateTo('/categories');
      
      // Wait for page to load
      await page.waitForSelector('[data-testid="categories-list"]');
      
      // Check page title
      await expect(page.locator('h1')).toContainText('Categories');
      
      // Check for categories table/list
      await expect(page.locator('[data-testid="categories-table"]')).toBeVisible();
      
      // Check for add category button
      await expect(page.locator('[data-testid="add-category-button"]')).toBeVisible();
    });

    test('should create a new category via UI', async ({ page }) => {
      await pageHelper.navigateTo('/categories');
      
      // Click add category button
      await page.click('[data-testid="add-category-button"]');
      
      // Fill category form
      await page.fill('[data-testid="category-name"]', 'UI Test Category');
      await page.fill('[data-testid="category-description"]', 'Created via UI test');
      
      // Submit form
      await page.click('[data-testid="save-category-button"]');
      
      // Wait for success message
      await pageHelper.waitForToast('Category created successfully');
      
      // Verify category appears in list
      await expect(page.locator('[data-testid="categories-table"]')).toContainText('UI Test Category');
    });

    test('should edit a category via UI', async ({ page }) => {
      await pageHelper.navigateTo('/categories');
      
      // Find and click edit button for test category
      const testCategoryRow = page.locator('[data-testid="category-row"]').filter({ hasText: 'Test Category 1' });
      await testCategoryRow.locator('[data-testid="edit-category-button"]').click();
      
      // Update category name
      await page.fill('[data-testid="category-name"]', 'Updated Test Category 1');
      
      // Save changes
      await page.click('[data-testid="save-category-button"]');
      
      // Wait for success message
      await pageHelper.waitForToast('Category updated successfully');
      
      // Verify changes
      await expect(page.locator('[data-testid="categories-table"]')).toContainText('Updated Test Category 1');
    });

    test('should delete a category via UI', async ({ page }) => {
      await pageHelper.navigateTo('/categories');
      
      // Create a category to delete first
      await page.click('[data-testid="add-category-button"]');
      await page.fill('[data-testid="category-name"]', 'Category to Delete UI');
      await page.click('[data-testid="save-category-button"]');
      await pageHelper.waitForToast('Category created successfully');
      
      // Find and click delete button
      const categoryRow = page.locator('[data-testid="category-row"]').filter({ hasText: 'Category to Delete UI' });
      await categoryRow.locator('[data-testid="delete-category-button"]').click();
      
      // Confirm deletion
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Wait for success message
      await pageHelper.waitForToast('Category deleted successfully');
      
      // Verify category is removed
      await expect(page.locator('[data-testid="categories-table"]')).not.toContainText('Category to Delete UI');
    });

    test('should view category details with subcategories', async ({ page }) => {
      await pageHelper.navigateTo('/categories');
      
      // Click on a category to view details
      const testCategoryRow = page.locator('[data-testid="category-row"]').filter({ hasText: 'Test Category 1' });
      await testCategoryRow.locator('[data-testid="view-category-button"]').click();
      
      // Verify category details page
      await expect(page.locator('[data-testid="category-details"]')).toBeVisible();
      await expect(page.locator('[data-testid="subcategories-section"]')).toBeVisible();
    });

    test('should sort categories', async ({ page }) => {
      await pageHelper.navigateTo('/categories');
      
      // Click on name column header to sort
      await page.click('[data-testid="sort-name"]');
      
      // Wait for sorting
      await page.waitForTimeout(500);
      
      // Verify sorting (basic check - first item should change)
      const firstCategory = page.locator('[data-testid="category-row"]').first();
      await expect(firstCategory).toBeVisible();
    });

    test('should search categories', async ({ page }) => {
      await pageHelper.navigateTo('/categories');
      
      // Enter search term
      await page.fill('[data-testid="search-categories"]', 'Test Category');
      
      // Wait for search results
      await page.waitForTimeout(500); // Debounce
      
      // Verify filtered results
      const categoryRows = page.locator('[data-testid="category-row"]');
      const count = await categoryRows.count();
      
      for (let i = 0; i < count; i++) {
        const categoryName = categoryRows.nth(i).locator('[data-testid="category-name"]');
        await expect(categoryName).toContainText('Test Category');
      }
    });

    test('should paginate categories', async ({ page }) => {
      await pageHelper.navigateTo('/categories');
      
      // Check if pagination exists
      const pagination = page.locator('[data-testid="pagination"]');
      if (await pagination.isVisible()) {
        // Click next page
        await page.click('[data-testid="next-page"]');
        
        // Verify page change
        await expect(page.locator('[data-testid="current-page"]')).toContainText('2');
      }
    });

    test('should handle form validation', async ({ page }) => {
      await pageHelper.navigateTo('/categories');
      await page.click('[data-testid="add-category-button"]');
      
      // Try to submit empty form
      await page.click('[data-testid="save-category-button"]');
      
      // Check for validation errors
      await expect(page.locator('[data-testid="name-error"]')).toContainText('Name is required');
    });

    test('should display category statistics', async ({ page }) => {
      await pageHelper.navigateTo('/categories');
      
      // Check for statistics cards
      await expect(page.locator('[data-testid="total-categories"]')).toBeVisible();
      await expect(page.locator('[data-testid="categories-with-subcategories"]')).toBeVisible();
      await expect(page.locator('[data-testid="total-subcategories"]')).toBeVisible();
    });
  });

  test.describe('Subcategories UI Tests', () => {
    test('should manage subcategories', async ({ page }) => {
      await pageHelper.navigateTo('/categories');
      
      // Navigate to category with subcategories
      const testCategoryRow = page.locator('[data-testid="category-row"]').filter({ hasText: 'Test Category 1' });
      await testCategoryRow.locator('[data-testid="view-category-button"]').click();
      
      // Add subcategory
      await page.click('[data-testid="add-subcategory-button"]');
      await page.fill('[data-testid="subcategory-name"]', 'UI Test Subcategory');
      await page.click('[data-testid="save-subcategory-button"]');
      
      // Verify subcategory was added
      await pageHelper.waitForToast('Subcategory created successfully');
      await expect(page.locator('[data-testid="subcategories-list"]')).toContainText('UI Test Subcategory');
    });
  });

  test.describe('Accessibility Tests', () => {
    test('categories page should be accessible', async ({ page }) => {
      await pageHelper.navigateTo('/categories');
      
      // Basic accessibility checks
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('[data-testid="add-category-button"]')).toHaveAttribute('type', 'button');
      
      // Check for proper ARIA labels
      await expect(page.locator('[data-testid="search-categories"]')).toHaveAttribute('aria-label');
    });
  });

  test.describe('Performance Tests', () => {
    test('categories list should load within reasonable time', async ({ page }) => {
      const startTime = Date.now();
      await pageHelper.navigateTo('/categories');
      await page.waitForSelector('[data-testid="categories-table"]');
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });
  });
});
