#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
import { createTestUser, createTestData } from './test-data-setup';

// Load environment variables
dotenv.config();

async function main() {
  console.log('🚀 Setting up test data...');
  
  try {
    // Create test data in database
    await createTestData();
    console.log('✅ Test data created successfully');
    
    // Create test user
    const authToken = await createTestUser();
    console.log('✅ Test user created successfully');
    
    console.log('🎉 Test data setup completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Test data setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}
