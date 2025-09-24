import { FullConfig, chromium } from '@playwright/test';
import { createTestUser, createTestData } from '../utils/test-data-setup';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting global setup...');
  
  try {
    // Create test data in database
    await createTestData();
    console.log('✅ Test data created successfully');
    
    // Create test user and get auth token
    const authToken = await createTestUser();
    console.log('✅ Test user created and authenticated');
    
    // Store auth state for tests
    const browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to login page and authenticate
    await page.goto('/login');
    await page.fill('[data-testid="email"]', process.env.TEST_USER_EMAIL || 'test@example.com');
    await page.fill('[data-testid="password"]', process.env.TEST_USER_PASSWORD || 'testpassword');
    await page.click('[data-testid="login-button"]');
    
    // Wait for successful login
    await page.waitForURL('/dashboard');
    
    // Save authenticated state
    await context.storageState({ path: 'config/auth-state.json' });
    
    await browser.close();
    console.log('✅ Authentication state saved');
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
  
  console.log('🎉 Global setup completed successfully');
}

export default globalSetup;
