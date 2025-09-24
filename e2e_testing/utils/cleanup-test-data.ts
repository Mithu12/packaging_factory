#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
import { cleanupTestData } from './test-data-cleanup';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // Clean up test data from database
    await cleanupTestData();
    console.log('✅ Test data cleaned up successfully');
    
    console.log('🎉 Test data cleanup completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test data cleanup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
