import { FullConfig } from '@playwright/test';
import { cleanupTestData } from '../utils/test-data-cleanup';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 Starting global teardown...');
  
  try {
    // Clean up test data from database
    await cleanupTestData();
    console.log('✅ Test data cleaned up successfully');
    
  } catch (error) {
    console.error('❌ Global teardown failed:', error);
    // Don't throw error to avoid masking test failures
  }
  
  console.log('🎉 Global teardown completed');
}

export default globalTeardown;
