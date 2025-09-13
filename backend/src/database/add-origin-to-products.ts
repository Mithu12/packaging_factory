import pool from './connection';
import { MyLogger } from '@/utils/new-logger';

export async function addOriginToProducts() {
  const action = 'Add Origin Column to Products';
  const client = await pool.connect();
  
  try {
    MyLogger.info(action);
    
    // Add origin_id column to products table if it doesn't exist
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS origin_id INTEGER REFERENCES origins(id) ON DELETE SET NULL
    `);
    
    // Create index for origin_id if it doesn't exist
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_origin_id ON products(origin_id)
    `);
    
    MyLogger.success(action, { message: 'Origin column added to products table successfully' });
    
  } catch (error) {
    MyLogger.error(action, error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addOriginToProducts()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
