import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

export async function addOriginsTable() {
  const action = 'Add Origins Table';
  const client = await pool.connect();
  
  try {
    MyLogger.info(action);
    
    // Create origins table
    await client.query(`
      CREATE TABLE IF NOT EXISTS origins (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create index on name for faster lookups
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_origins_name ON origins(name)
    `);
    
    // Create index on status for filtering
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_origins_status ON origins(status)
    `);
    
    // Add trigger to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_origins_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_origins_updated_at ON origins;
      CREATE TRIGGER trigger_update_origins_updated_at
        BEFORE UPDATE ON origins
        FOR EACH ROW
        EXECUTE FUNCTION update_origins_updated_at()
    `);
    
    MyLogger.success(action, { message: 'Origins table created successfully' });
    
  } catch (error) {
    MyLogger.error(action, error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addOriginsTable()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}
