import pool from './connection';
import { MyLogger } from '@/utils/new-logger';

export const addSupplierCategoriesTable = async () => {
  let action = 'Add Supplier Categories Table'
  const client = await pool.connect();
  
  try {
    MyLogger.info(action)
    
    // Create supplier_categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS supplier_categories (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        color VARCHAR(7) DEFAULT '#3B82F6', -- Default blue color for UI
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    MyLogger.success('Create Supplier Categories Table')

    // Create index for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_categories_name ON supplier_categories(name);
    `);
    MyLogger.success('Create Supplier Categories Index')

    // Create trigger to automatically update updated_at
    await client.query(`
      DROP TRIGGER IF EXISTS update_supplier_categories_updated_at ON supplier_categories;
      CREATE TRIGGER update_supplier_categories_updated_at
        BEFORE UPDATE ON supplier_categories
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    MyLogger.success('Create Supplier Categories Update Trigger')

    // Insert default categories if table is empty
    const countResult = await client.query('SELECT COUNT(*) FROM supplier_categories');
    const count = parseInt(countResult.rows[0].count);
    
    if (count === 0) {
      const defaultCategories = [
        { name: 'Electronics', description: 'Electronic components and devices', color: '#3B82F6' },
        { name: 'Raw Materials', description: 'Basic materials used in production', color: '#10B981' },
        { name: 'Furniture', description: 'Office and industrial furniture', color: '#F59E0B' },
        { name: 'Components', description: 'Mechanical and electrical components', color: '#EF4444' },
        { name: 'Textiles', description: 'Fabric and textile materials', color: '#8B5CF6' },
        { name: 'Food & Beverage', description: 'Food and beverage products', color: '#06B6D4' },
        { name: 'Industrial Equipment', description: 'Heavy machinery and equipment', color: '#84CC16' },
        { name: 'Office Supplies', description: 'Office and stationery supplies', color: '#F97316' }
      ];

      for (const category of defaultCategories) {
        await client.query(
          'INSERT INTO supplier_categories (name, description, color) VALUES ($1, $2, $3)',
          [category.name, category.description, category.color]
        );
      }
      MyLogger.success('Insert Default Supplier Categories', { count: defaultCategories.length })
    }

    MyLogger.success(action)
  } catch (error: any) {
    MyLogger.error(action, error)
    throw error;
  } finally {
    client.release();
  }
};
