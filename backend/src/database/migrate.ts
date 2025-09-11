import pool from './connection';
import {MyLogger} from '@/utils/new-logger';

const createTables = async () => {
  let action = 'Create Database Tables'
  const client = await pool.connect();
  
  try {
    MyLogger.info(action)
    
    // Create suppliers table
    MyLogger.info('Create Suppliers Table')
    await client.query(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id SERIAL PRIMARY KEY,
        supplier_code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        contact_person VARCHAR(255),
        phone VARCHAR(50),
        email VARCHAR(255),
        website VARCHAR(255),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        zip_code VARCHAR(20),
        country VARCHAR(100),
        category VARCHAR(100),
        tax_id VARCHAR(100),
        vat_id VARCHAR(100),
        payment_terms VARCHAR(50),
        bank_name VARCHAR(255),
        bank_account VARCHAR(100),
        bank_routing VARCHAR(100),
        swift_code VARCHAR(20),
        iban VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        rating DECIMAL(3,2) DEFAULT 0.00 CHECK (rating >= 0 AND rating <= 5),
        total_orders INTEGER DEFAULT 0,
        last_order_date DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    MyLogger.success('Create Suppliers Table')

    // Create supplier performance tracking table
    MyLogger.info('Create Supplier Performance Table')
    await client.query(`
      CREATE TABLE IF NOT EXISTS supplier_performance (
        id SERIAL PRIMARY KEY,
        supplier_id INTEGER REFERENCES suppliers(id) ON DELETE CASCADE,
        delivery_time_days INTEGER,
        quality_rating DECIMAL(3,2) CHECK (quality_rating >= 0 AND quality_rating <= 5),
        price_rating DECIMAL(3,2) CHECK (price_rating >= 0 AND price_rating <= 5),
        communication_rating DECIMAL(3,2) CHECK (communication_rating >= 0 AND communication_rating <= 5),
        issues_count INTEGER DEFAULT 0,
        on_time_delivery_rate DECIMAL(5,2) DEFAULT 0.00,
        recorded_date DATE DEFAULT CURRENT_DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    MyLogger.success('Create Supplier Performance Table')

    // Create indexes for better performance
    MyLogger.info('Create Database Indexes')
    await client.query(`
      create sequence if not exists supplier_code_suppliers;
    `);
    
    await client.query(`
      create sequence if not exists product_code_sequence;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_suppliers_category ON suppliers(category);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_performance_supplier_id ON supplier_performance(supplier_id);
    `);
    MyLogger.success('Create Database Indexes')

    // Create function to update updated_at timestamp
    MyLogger.info('Create Update Timestamp Function')
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);
    MyLogger.success('Create Update Timestamp Function')

    // Create trigger to automatically update updated_at
    MyLogger.info('Create Update Timestamp Trigger')
    await client.query(`
      DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
      CREATE TRIGGER update_suppliers_updated_at
        BEFORE UPDATE ON suppliers
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    MyLogger.success('Create Update Timestamp Trigger')

    // Create categories table
    MyLogger.info('Create Categories Table')
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    MyLogger.success('Create Categories Table')

    // Create subcategories table
    MyLogger.info('Create Subcategories Table')
    await client.query(`
      CREATE TABLE IF NOT EXISTS subcategories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, category_id)
      )
    `);
    MyLogger.success('Create Subcategories Table')

    // Create additional indexes for categories
    MyLogger.info('Create Category Indexes')
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_categories_name ON categories(name);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_subcategories_name ON subcategories(name);
    `);
    MyLogger.success('Create Category Indexes')

    // Create trigger for categories updated_at
    MyLogger.info('Create Category Update Timestamp Trigger')
    await client.query(`
      DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
      CREATE TRIGGER update_categories_updated_at
        BEFORE UPDATE ON categories
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    MyLogger.success('Create Category Update Timestamp Trigger')

    // Create trigger for subcategories updated_at
    MyLogger.info('Create Subcategory Update Timestamp Trigger')
    await client.query(`
      DROP TRIGGER IF EXISTS update_subcategories_updated_at ON subcategories;
      CREATE TRIGGER update_subcategories_updated_at
        BEFORE UPDATE ON subcategories
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    MyLogger.success('Create Subcategory Update Timestamp Trigger')

    // Create products table
    MyLogger.info('Create Products Table')
    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        product_code VARCHAR(20) NOT NULL UNIQUE,
        sku VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        subcategory_id INTEGER REFERENCES subcategories(id) ON DELETE SET NULL,
        unit_of_measure VARCHAR(20) NOT NULL,
        cost_price DECIMAL(10,2) NOT NULL CHECK (cost_price >= 0),
        selling_price DECIMAL(10,2) NOT NULL CHECK (selling_price >= 0),
        current_stock DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
        min_stock_level DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (min_stock_level >= 0),
        max_stock_level DECIMAL(10,2) CHECK (max_stock_level >= 0),
        supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued', 'out_of_stock')),
        barcode VARCHAR(50) UNIQUE,
        weight DECIMAL(8,2) CHECK (weight >= 0),
        dimensions VARCHAR(100),
        tax_rate DECIMAL(5,2) CHECK (tax_rate >= 0 AND tax_rate <= 100),
        reorder_point DECIMAL(10,2) CHECK (reorder_point >= 0),
        reorder_quantity DECIMAL(10,2) CHECK (reorder_quantity >= 0),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    MyLogger.success('Create Products Table')

    // Create stock_adjustments table
    MyLogger.info('Create Stock Adjustments Table')
    await client.query(`
      CREATE TABLE IF NOT EXISTS stock_adjustments (
        id SERIAL PRIMARY KEY,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        adjustment_type VARCHAR(20) NOT NULL CHECK (adjustment_type IN ('increase', 'decrease', 'set')),
        quantity DECIMAL(10,2) NOT NULL,
        previous_stock DECIMAL(10,2) NOT NULL,
        new_stock DECIMAL(10,2) NOT NULL,
        reason VARCHAR(255) NOT NULL,
        reference VARCHAR(100),
        notes TEXT,
        adjusted_by VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    MyLogger.success('Create Stock Adjustments Table')

    // Create indexes for stock_adjustments
    MyLogger.info('Create Stock Adjustments Indexes')
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_adjustments_product_id ON stock_adjustments(product_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_adjustments_created_at ON stock_adjustments(created_at);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_adjustments_type ON stock_adjustments(adjustment_type);
    `);
    MyLogger.success('Create Stock Adjustments Indexes')

    // Create indexes for products
    MyLogger.info('Create Product Indexes')
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_subcategory_id ON products(subcategory_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_supplier_id ON products(supplier_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_stock_status ON products(current_stock, min_stock_level);
    `);
    MyLogger.success('Create Product Indexes')

    // Create trigger for products updated_at
    MyLogger.info('Create Product Update Timestamp Trigger')
    await client.query(`
      DROP TRIGGER IF EXISTS update_products_updated_at ON products;
      CREATE TRIGGER update_products_updated_at
        BEFORE UPDATE ON products
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    MyLogger.success('Create Product Update Timestamp Trigger')

    // Create purchase_orders table
    MyLogger.info('Create Purchase Orders Table')
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id SERIAL PRIMARY KEY,
        po_number VARCHAR(50) UNIQUE NOT NULL,
        supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
        order_date DATE NOT NULL DEFAULT CURRENT_DATE,
        expected_delivery_date DATE NOT NULL,
        actual_delivery_date DATE,
        status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'sent', 'partially_received', 'received', 'cancelled')),
        priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
        currency VARCHAR(3) NOT NULL DEFAULT 'USD',
        payment_terms VARCHAR(50),
        delivery_terms VARCHAR(50),
        department VARCHAR(100),
        project VARCHAR(100),
        notes TEXT,
        created_by VARCHAR(100) NOT NULL,
        approved_by VARCHAR(100),
        approved_date DATE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    MyLogger.success('Create Purchase Orders Table')

    // Create purchase_order_line_items table
    MyLogger.info('Create Purchase Order Line Items Table')
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_line_items (
        id SERIAL PRIMARY KEY,
        purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        product_sku VARCHAR(50) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        description TEXT,
        quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
        unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
        total_price DECIMAL(12,2) NOT NULL CHECK (total_price >= 0),
        received_quantity DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (received_quantity >= 0),
        pending_quantity DECIMAL(10,2) NOT NULL CHECK (pending_quantity >= 0),
        unit_of_measure VARCHAR(20) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    MyLogger.success('Create Purchase Order Line Items Table')

    // Create purchase_order_timeline table
    MyLogger.info('Create Purchase Order Timeline Table')
    await client.query(`
      CREATE TABLE IF NOT EXISTS purchase_order_timeline (
        id SERIAL PRIMARY KEY,
        purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
        event VARCHAR(100) NOT NULL,
        description TEXT,
        "user" VARCHAR(100) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'cancelled')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    MyLogger.success('Create Purchase Order Timeline Table')

    // Create sequence for PO numbers
    MyLogger.info('Create Purchase Order Number Sequence')
    await client.query(`
      create sequence if not exists po_number_sequence;
    `);
    MyLogger.success('Create Purchase Order Number Sequence')

    // Create indexes for purchase orders
    MyLogger.info('Create Purchase Order Indexes')
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier_id ON purchase_orders(supplier_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_priority ON purchase_orders(priority);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_order_date ON purchase_orders(order_date);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_expected_delivery ON purchase_orders(expected_delivery_date);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_po_number ON purchase_orders(po_number);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_order_line_items_po_id ON purchase_order_line_items(purchase_order_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_order_line_items_product_id ON purchase_order_line_items(product_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_purchase_order_timeline_po_id ON purchase_order_timeline(purchase_order_id);
    `);
    MyLogger.success('Create Purchase Order Indexes')

    // Create trigger for purchase_orders updated_at
    MyLogger.info('Create Purchase Order Update Timestamp Trigger')
    await client.query(`
      DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON purchase_orders;
      CREATE TRIGGER update_purchase_orders_updated_at
        BEFORE UPDATE ON purchase_orders
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    MyLogger.success('Create Purchase Order Update Timestamp Trigger')

    // Create trigger for purchase_order_line_items updated_at
    MyLogger.info('Create Purchase Order Line Items Update Timestamp Trigger')
    await client.query(`
      DROP TRIGGER IF EXISTS update_purchase_order_line_items_updated_at ON purchase_order_line_items;
      CREATE TRIGGER update_purchase_order_line_items_updated_at
        BEFORE UPDATE ON purchase_order_line_items
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    MyLogger.success('Create Purchase Order Line Items Update Timestamp Trigger')

    MyLogger.success(action, { tablesCreated: ['suppliers', 'supplier_performance', 'categories', 'subcategories', 'products', 'purchase_orders', 'purchase_order_line_items', 'purchase_order_timeline'] })
    console.log('✅ Database tables created successfully');
  } catch (error) {
    MyLogger.error(action, error)
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  let action = 'Database Migration'
  MyLogger.info(action)
  createTables()
    .then(() => {
      MyLogger.success(action)
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      MyLogger.error(action, error)
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export default createTables;
