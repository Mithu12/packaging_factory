import pool from './connection';
import { MyLogger } from '../utils/new-logger';

export async function addPOSTables() {
  const action = 'Add POS Tables';
  const client = await pool.connect();
  
  try {
    MyLogger.info(action);
    
    // Create customers table
    MyLogger.info('Create Customers Table');
    await client.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id SERIAL PRIMARY KEY,
        customer_code VARCHAR(20) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        city VARCHAR(100),
        state VARCHAR(100),
        zip_code VARCHAR(20),
        country VARCHAR(100),
        date_of_birth DATE,
        gender VARCHAR(10) CHECK (gender IN ('male', 'female', 'other')),
        customer_type VARCHAR(20) DEFAULT 'regular' CHECK (customer_type IN ('regular', 'vip', 'wholesale', 'walk_in')),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
        total_purchases DECIMAL(12,2) DEFAULT 0 CHECK (total_purchases >= 0),
        loyalty_points INTEGER DEFAULT 0 CHECK (loyalty_points >= 0),
        last_purchase_date DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    MyLogger.success('Create Customers Table');

    // Create sales_orders table
    MyLogger.info('Create Sales Orders Table');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_orders (
        id SERIAL PRIMARY KEY,
        order_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
        order_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'cancelled', 'refunded')),
        payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partially_paid', 'refunded')),
        payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'credit', 'check', 'bank_transfer')),
        subtotal DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
        discount_amount DECIMAL(12,2) DEFAULT 0 CHECK (discount_amount >= 0),
        tax_amount DECIMAL(12,2) DEFAULT 0 CHECK (tax_amount >= 0),
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
        cash_received DECIMAL(12,2) DEFAULT 0 CHECK (cash_received >= 0),
        change_given DECIMAL(12,2) DEFAULT 0 CHECK (change_given >= 0),
        cashier_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    MyLogger.success('Create Sales Orders Table');

    // Create sales_order_line_items table
    MyLogger.info('Create Sales Order Line Items Table');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_order_line_items (
        id SERIAL PRIMARY KEY,
        sales_order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
        product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
        product_sku VARCHAR(50) NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        quantity DECIMAL(10,2) NOT NULL CHECK (quantity > 0),
        unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
        discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
        discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
        line_total DECIMAL(12,2) NOT NULL CHECK (line_total >= 0),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    MyLogger.success('Create Sales Order Line Items Table');

    // Create sales_receipts table
    MyLogger.info('Create Sales Receipts Table');
    await client.query(`
      CREATE TABLE IF NOT EXISTS sales_receipts (
        id SERIAL PRIMARY KEY,
        receipt_number VARCHAR(50) UNIQUE NOT NULL,
        sales_order_id INTEGER NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
        receipt_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        receipt_type VARCHAR(20) DEFAULT 'sale' CHECK (receipt_type IN ('sale', 'refund', 'exchange')),
        total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
        payment_method VARCHAR(20) NOT NULL,
        cashier_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    MyLogger.success('Create Sales Receipts Table');

    // Create pricing_rules table
    MyLogger.info('Create Pricing Rules Table');
    await client.query(`
      CREATE TABLE IF NOT EXISTS pricing_rules (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        category_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
        rule_type VARCHAR(20) NOT NULL CHECK (rule_type IN ('discount', 'markup', 'fixed_price')),
        rule_value DECIMAL(10,2) NOT NULL,
        rule_percentage DECIMAL(5,2) CHECK (rule_percentage >= 0 AND rule_percentage <= 100),
        min_quantity DECIMAL(10,2) DEFAULT 1 CHECK (min_quantity > 0),
        max_quantity DECIMAL(10,2),
        start_date DATE NOT NULL,
        end_date DATE,
        customer_type VARCHAR(20) CHECK (customer_type IN ('regular', 'vip', 'wholesale', 'walk_in')),
        is_active BOOLEAN DEFAULT true,
        priority INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    MyLogger.success('Create Pricing Rules Table');

    // Create indexes for better performance
    MyLogger.info('Create Indexes');
    
    // Customer indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(customer_type)`);
    
    // Sales order indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_orders_customer_id ON sales_orders(customer_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON sales_orders(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_orders_payment_status ON sales_orders(payment_status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_orders_order_date ON sales_orders(order_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_orders_cashier_id ON sales_orders(cashier_id)`);
    
    // Sales order line items indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_order_line_items_sales_order_id ON sales_order_line_items(sales_order_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_order_line_items_product_id ON sales_order_line_items(product_id)`);
    
    // Sales receipts indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_receipts_sales_order_id ON sales_receipts(sales_order_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_receipts_receipt_date ON sales_receipts(receipt_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sales_receipts_cashier_id ON sales_receipts(cashier_id)`);
    
    // Pricing rules indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pricing_rules_product_id ON pricing_rules(product_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pricing_rules_category_id ON pricing_rules(category_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pricing_rules_is_active ON pricing_rules(is_active)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_pricing_rules_dates ON pricing_rules(start_date, end_date)`);
    
    MyLogger.success('Create Indexes');

    // Create triggers for updated_at timestamps
    MyLogger.info('Create Triggers');
    
    // Customer trigger
    await client.query(`
      CREATE OR REPLACE FUNCTION update_customers_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_customers_updated_at ON customers;
      CREATE TRIGGER trigger_update_customers_updated_at
        BEFORE UPDATE ON customers
        FOR EACH ROW
        EXECUTE FUNCTION update_customers_updated_at()
    `);

    // Sales order trigger
    await client.query(`
      CREATE OR REPLACE FUNCTION update_sales_orders_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_sales_orders_updated_at ON sales_orders;
      CREATE TRIGGER trigger_update_sales_orders_updated_at
        BEFORE UPDATE ON sales_orders
        FOR EACH ROW
        EXECUTE FUNCTION update_sales_orders_updated_at()
    `);

    // Pricing rules trigger
    await client.query(`
      CREATE OR REPLACE FUNCTION update_pricing_rules_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS trigger_update_pricing_rules_updated_at ON pricing_rules;
      CREATE TRIGGER trigger_update_pricing_rules_updated_at
        BEFORE UPDATE ON pricing_rules
        FOR EACH ROW
        EXECUTE FUNCTION update_pricing_rules_updated_at()
    `);
    
    MyLogger.success('Create Triggers');
    
    MyLogger.success(action, { 
      tablesCreated: ['customers', 'sales_orders', 'sales_order_line_items', 'sales_receipts', 'pricing_rules'] 
    });
    
  } catch (error) {
    MyLogger.error(action, error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  addPOSTables()
    .then(() => {
      console.log('✅ POS tables created successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error creating POS tables:', error);
      process.exit(1);
    });
}
