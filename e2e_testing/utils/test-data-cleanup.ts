import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'erp_system_test',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
});

export async function cleanupTestData(): Promise<void> {
  const client = await pool.connect();
  try {
    // Clean up test data in reverse order of dependencies
    
    // Clean up subcategories first
    await client.query(`
      DELETE FROM subcategories 
      WHERE name LIKE 'Test Subcategory%'
    `);

    // Clean up categories
    await client.query(`
      DELETE FROM categories 
      WHERE name LIKE 'Test Category%' OR name LIKE '%Test Category'
    `);

    // Clean up brands
    await client.query(`
      DELETE FROM brands 
      WHERE name LIKE 'Test Brand%' OR name LIKE '%Test Brand'
    `);

    // Clean up origins
    await client.query(`
      DELETE FROM origins 
      WHERE name LIKE 'Test Origin%' OR name LIKE '%Test Origin'
    `);

    // Clean up test users
    await client.query(`
      DELETE FROM users 
      WHERE email LIKE '%test%' AND email != 'admin@example.com'
    `);

    console.log('Test data cleaned up successfully');
    
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function cleanupSpecificTestData(type: 'brands' | 'categories' | 'origins', names: string[]): Promise<void> {
  const client = await pool.connect();
  try {
    const placeholders = names.map((_, index) => `$${index + 1}`).join(', ');
    
    switch (type) {
      case 'brands':
        await client.query(`DELETE FROM brands WHERE name IN (${placeholders})`, names);
        break;
      case 'categories':
        await client.query(`DELETE FROM categories WHERE name IN (${placeholders})`, names);
        break;
      case 'origins':
        await client.query(`DELETE FROM origins WHERE name IN (${placeholders})`, names);
        break;
    }
    
    console.log(`Cleaned up ${type}: ${names.join(', ')}`);
    
  } catch (error) {
    console.error(`Error cleaning up ${type}:`, error);
    throw error;
  } finally {
    client.release();
  }
}
