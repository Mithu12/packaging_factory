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
    
    // Try to set up authentication state for UI tests (optional)
    await setupAuthState(config);
    
  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  }
  
  console.log('🎉 Global setup completed successfully');
}

async function setupAuthState(config: FullConfig) {
  try {
    const baseURL = process.env.BASE_URL || config.projects[0]?.use?.baseURL || 'http://localhost:8080';
    console.log(`🔐 Attempting to setup auth state for: ${baseURL}`);
    
    // Check if frontend is available
    const response = await fetch(baseURL).catch(() => null);
    if (!response || !response.ok) {
      console.log('⚠️  Frontend not available, skipping auth state setup');
      return;
    }
    
    const browser = await chromium.launch();
    const context = await browser.newContext({
      baseURL: baseURL
    });
    const page = await context.newPage();
    
    // Navigate to login page and authenticate
    await page.goto('/login', { timeout: 10000 });
    
    // Check if login form exists
    const emailField = await page.locator('[data-testid="email"]').first();
    const passwordField = await page.locator('[data-testid="password"]').first();
    const loginButton = await page.locator('[data-testid="login-button"]').first();
    
    if (await emailField.isVisible() && await passwordField.isVisible() && await loginButton.isVisible()) {
      await emailField.fill(process.env.TEST_USER_EMAIL || 'test@example.com');
      await passwordField.fill(process.env.TEST_USER_PASSWORD || 'testpassword');
      await loginButton.click();
      
      // Wait for successful login (with timeout)
      await page.waitForURL('/dashboard', { timeout: 10000 });
      
      // Save authenticated state
      await context.storageState({ path: 'config/auth-state.json' });
      console.log('✅ Authentication state saved');
    } else {
      console.log('⚠️  Login form not found, skipping auth state setup');
    }
    
    await browser.close();
    
  } catch (error) {
    console.log('⚠️  Auth state setup failed (non-critical):', error.message);
    // Don't throw error - auth state setup is optional
  }
}

export default globalSetup;
