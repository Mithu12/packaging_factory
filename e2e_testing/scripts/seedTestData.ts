import { Pool, PoolClient } from 'pg';

export interface SeedConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

type Client = PoolClient;

async function ensureCategory(client: Client, name: string, description: string): Promise<number> {
  const existing = await client.query('SELECT id FROM categories WHERE name = $1', [name]);
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const result = await client.query(
    `INSERT INTO categories (name, description) VALUES ($1, $2) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id`,
    [name, description]
  );
  return result.rows[0].id;
}

async function ensureBrand(client: Client, name: string): Promise<number> {
  const existing = await client.query('SELECT id FROM brands WHERE name = $1', [name]);
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const result = await client.query(
    `INSERT INTO brands (name, description, is_active) VALUES ($1, $2, true) ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description RETURNING id`,
    [name, `${name} reference brand for automated tests`]
  );
  return result.rows[0].id;
}

async function ensureOrigin(client: Client, name: string): Promise<number> {
  const existing = await client.query('SELECT id FROM origins WHERE name = $1', [name]);
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const result = await client.query(
    `INSERT INTO origins (name, description, status) VALUES ($1, $2, 'active') ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description, status = 'active' RETURNING id`,
    [name, `${name} origin for automated tests`]
  );
  return result.rows[0].id;
}

async function ensureSupplier(client: Client, code: string, name: string): Promise<number> {
  const existing = await client.query('SELECT id FROM suppliers WHERE supplier_code = $1', [code]);
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const result = await client.query(
    `INSERT INTO suppliers (
      supplier_code,
      name,
      contact_person,
      phone,
      email,
      address,
      city,
      country,
      status,
      rating,
      total_orders
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', 5, 0)
    RETURNING id`,
    [
      code,
      name,
      'Test Contact',
      '+1234567890',
      'supplier+e2e@example.com',
      '123 Test Street',
      'Test City',
      'Test Country'
    ]
  );
  return result.rows[0].id;
}

async function ensureSubcategory(client: Client, name: string, categoryId: number): Promise<number> {
  const existing = await client.query('SELECT id FROM subcategories WHERE name = $1 AND category_id = $2', [name, categoryId]);
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const result = await client.query(
    `INSERT INTO subcategories (name, description, category_id) VALUES ($1, $2, $3) RETURNING id`,
    [name, `${name} reference subcategory for automated tests`, categoryId]
  );
  return result.rows[0].id;
}

export async function seedReferenceData(config: SeedConfig): Promise<void> {
  const pool = new Pool({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    database: config.database,
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const categoryId = await ensureCategory(client, 'E2E Category', 'Category used for automated product tests');
    await ensureSubcategory(client, 'E2E Subcategory', categoryId);
    await ensureBrand(client, 'E2E Brand');
    await ensureOrigin(client, 'E2E Origin');
    await ensureSupplier(client, 'SUP-E2E', 'E2E Supplier');

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
