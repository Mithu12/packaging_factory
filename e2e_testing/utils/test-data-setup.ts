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

export async function createTestUser(): Promise<string> {
  const client = await pool.connect();
  try {
    // Create test user if doesn't exist
    const userResult = await client.query(`
      INSERT INTO users (email, password, first_name, last_name, role, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      ON CONFLICT (email) DO UPDATE SET
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING id, email
    `, [
      process.env.TEST_USER_EMAIL || 'test@example.com',
      '$2b$10$example.hash.for.testing', // In real setup, hash the password
      'Test',
      'User',
      process.env.TEST_USER_ROLE || 'admin',
      'active'
    ]);

    const userId = userResult.rows[0].id;
    console.log(`Test user created/updated with ID: ${userId}`);
    
    // Return mock auth token (in real implementation, generate proper JWT)
    return 'mock-auth-token-for-testing';
    
  } catch (error) {
    console.error('Error creating test user:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function createTestData(): Promise<void> {
  const client = await pool.connect();
  try {
    // Create test brands
    await client.query(`
      INSERT INTO brands (name, description, status, created_at, updated_at)
      VALUES 
        ('Test Brand 1', 'Test brand for E2E testing', 'active', NOW(), NOW()),
        ('Test Brand 2', 'Another test brand', 'active', NOW(), NOW()),
        ('Inactive Test Brand', 'Inactive test brand', 'inactive', NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
    `);

    // Create test categories
    await client.query(`
      INSERT INTO categories (name, description, status, created_at, updated_at)
      VALUES 
        ('Test Category 1', 'Test category for E2E testing', 'active', NOW(), NOW()),
        ('Test Category 2', 'Another test category', 'active', NOW(), NOW()),
        ('Inactive Test Category', 'Inactive test category', 'inactive', NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
    `);

    // Create test subcategories
    const categoryResult = await client.query(`
      SELECT id FROM categories WHERE name = 'Test Category 1' LIMIT 1
    `);
    
    if (categoryResult.rows.length > 0) {
      const categoryId = categoryResult.rows[0].id;
      await client.query(`
        INSERT INTO subcategories (name, description, category_id, status, created_at, updated_at)
        VALUES 
          ('Test Subcategory 1', 'Test subcategory for E2E testing', $1, 'active', NOW(), NOW()),
          ('Test Subcategory 2', 'Another test subcategory', $1, 'active', NOW(), NOW())
        ON CONFLICT (name, category_id) DO NOTHING
      `, [categoryId]);
    }

    // Create test origins
    await client.query(`
      INSERT INTO origins (name, description, status, created_at, updated_at)
      VALUES 
        ('Test Origin 1', 'Test origin for E2E testing', 'active', NOW(), NOW()),
        ('Test Origin 2', 'Another test origin', 'active', NOW(), NOW()),
        ('Inactive Test Origin', 'Inactive test origin', 'inactive', NOW(), NOW())
      ON CONFLICT (name) DO NOTHING
    `);

    console.log('Test data created successfully');
    
  } catch (error) {
    console.error('Error creating test data:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getTestBrandId(): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id FROM brands WHERE name = 'Test Brand 1' LIMIT 1
    `);
    return result.rows[0]?.id;
  } finally {
    client.release();
  }
}

export async function getTestCategoryId(): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id FROM categories WHERE name = 'Test Category 1' LIMIT 1
    `);
    return result.rows[0]?.id;
  } finally {
    client.release();
  }
}

export async function getTestOriginId(): Promise<number> {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT id FROM origins WHERE name = 'Test Origin 1' LIMIT 1
    `);
    return result.rows[0]?.id;
  } finally {
    client.release();
  }
}
