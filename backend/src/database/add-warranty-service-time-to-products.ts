import pool from '../database/connection';
import { MyLogger } from '@/utils/new-logger';

export const addWarrantyServiceTimeToProducts = async () => {
  const client = await pool.connect();
  try {
    MyLogger.info('Add Warranty Period and Service Time to Products Table');
    
    // Add warranty_period column (integer, months)
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS warranty_period INTEGER DEFAULT NULL
    `);
    
    // Add service_time column (integer, months)
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS service_time INTEGER DEFAULT NULL
    `);
    
    // Add comments to the columns
    await client.query(`
      COMMENT ON COLUMN products.warranty_period IS 'Warranty period in months';
    `);
    
    await client.query(`
      COMMENT ON COLUMN products.service_time IS 'Service reminder interval in months';
    `);
    
    MyLogger.success('Add Warranty Period and Service Time to Products Table');
  } catch (error) {
    MyLogger.error('Add Warranty Period and Service Time to Products Table', error);
    throw error;
  } finally {
    client.release();
  }
};
