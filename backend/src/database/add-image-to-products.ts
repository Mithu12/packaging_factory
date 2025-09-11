import pool from './connection';
import { MyLogger } from '@/utils/new-logger';

const addImageToProducts = async () => {
  let action = 'Add Image Column to Products Table';
  const client = await pool.connect();
  
  try {
    MyLogger.info(action);
    
    // Add image column to products table
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
    `);
    
    MyLogger.success(action, { message: 'Image column added to products table' });
    console.log('✅ Image column added to products table successfully');
  } catch (error) {
    MyLogger.error(action, error);
    console.error('❌ Error adding image column:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  let action = 'Database Migration - Add Image Column';
  MyLogger.info(action);
  addImageToProducts()
    .then(() => {
      MyLogger.success(action);
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      MyLogger.error(action, error);
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export default addImageToProducts;
