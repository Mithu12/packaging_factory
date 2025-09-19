import pool from './connection';
import {MyLogger} from '@/utils/new-logger';
import { addSequences } from './add-sequences';

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

    // Create brands table
    MyLogger.info('Create Brands Table')
    await client.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    MyLogger.success('Create Brands Table')

    // Create brands indexes
    MyLogger.info('Create Brand Indexes')
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_brands_name ON brands(name);
      CREATE INDEX IF NOT EXISTS idx_brands_is_active ON brands(is_active);
      CREATE INDEX IF NOT EXISTS idx_brands_created_at ON brands(created_at);
    `);
    MyLogger.success('Create Brand Indexes')

    // Create brand update timestamp trigger
    MyLogger.info('Create Brand Update Timestamp Trigger')
    await client.query(`
      DROP TRIGGER IF EXISTS update_brands_updated_at ON brands;
      CREATE TRIGGER update_brands_updated_at
        BEFORE UPDATE ON brands
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    MyLogger.success('Create Brand Update Timestamp Trigger')

    // Create origins table
    MyLogger.info('Create Origins Table')
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
    MyLogger.success('Create Origins Table')

    // Create indexes for origins
    MyLogger.info('Create Origin Indexes')
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_origins_name ON origins(name);
      CREATE INDEX IF NOT EXISTS idx_origins_status ON origins(status);
      CREATE INDEX IF NOT EXISTS idx_origins_created_at ON origins(created_at);
    `);
    MyLogger.success('Create Origin Indexes')

    // Create origin update timestamp trigger
    MyLogger.info('Create Origin Update Timestamp Trigger')
    await client.query(`
      DROP TRIGGER IF EXISTS update_origins_updated_at ON origins;
      CREATE TRIGGER update_origins_updated_at
        BEFORE UPDATE ON origins
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    MyLogger.success('Create Origin Update Timestamp Trigger')

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
        brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
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
      CREATE INDEX IF NOT EXISTS idx_products_brand_id ON products(brand_id);
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

    // Create invoices table
    MyLogger.info('Create Invoices Table')
    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        invoice_number VARCHAR(50) UNIQUE NOT NULL,
        purchase_order_id INTEGER REFERENCES purchase_orders(id) ON DELETE SET NULL,
        supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
        invoice_date DATE NOT NULL,
        due_date DATE NOT NULL,
        total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
        paid_amount DECIMAL(12,2) DEFAULT 0 CHECK (paid_amount >= 0),
        outstanding_amount DECIMAL(12,2) NOT NULL CHECK (outstanding_amount >= 0),
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'partial', 'paid', 'overdue', 'cancelled')),
        terms VARCHAR(50),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    MyLogger.success('Create Invoices Table')

    // Create payments table
    MyLogger.info('Create Payments Table')
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        payment_number VARCHAR(50) UNIQUE NOT NULL,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        supplier_id INTEGER NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
        amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
        payment_date DATE NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        reference VARCHAR(100),
        status VARCHAR(20) NOT NULL DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
        notes TEXT,
        created_by VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    MyLogger.success('Create Payments Table')

    // Create payment_history table for audit trail
    MyLogger.info('Create Payment History Table')
    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_history (
        id SERIAL PRIMARY KEY,
        payment_id INTEGER REFERENCES payments(id) ON DELETE CASCADE,
        invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
        event VARCHAR(100) NOT NULL,
        description TEXT,
        old_value TEXT,
        new_value TEXT,
        user_name VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    MyLogger.success('Create Payment History Table')

    // Create indexes for payment tables
    MyLogger.info('Create Payment Indexes')
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_supplier_id ON invoices(supplier_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_purchase_order_id ON invoices(purchase_order_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_invoice_id ON payments(invoice_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_supplier_id ON payments(supplier_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_history_payment_id ON payment_history(payment_id);
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_history_invoice_id ON payment_history(invoice_id);
    `);
    MyLogger.success('Create Payment Indexes')

    // Create triggers for payment tables
    MyLogger.info('Create Payment Triggers')
    await client.query(`
      DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
      CREATE TRIGGER update_invoices_updated_at
        BEFORE UPDATE ON invoices
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    
    await client.query(`
      DROP TRIGGER IF EXISTS update_payments_updated_at ON payments;
      CREATE TRIGGER update_payments_updated_at
        BEFORE UPDATE ON payments
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);
    MyLogger.success('Create Payment Triggers')

    // Create sequence for invoice and payment numbers
    MyLogger.info('Create Payment Number Sequences')
    await client.query(`
      create sequence if not exists invoice_number_sequence;
    `);
    
    await client.query(`
      create sequence if not exists payment_number_sequence;
    `);
    MyLogger.success('Create Payment Number Sequences')

    // Create users table
    MyLogger.info('Create Users Table')
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255) NOT NULL,
        mobile_number VARCHAR(20),
        departments TEXT[], -- Array of department values
        role VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'manager', 'employee', 'viewer')),
        is_active BOOLEAN DEFAULT true,
        last_login TIMESTAMP WITH TIME ZONE,
        password_reset_token VARCHAR(255),
        password_reset_expires TIMESTAMP WITH TIME ZONE,
        email_verification_token VARCHAR(255),
        email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add new columns to users table if they don't exist
    MyLogger.info('Add new columns to users table')
    await client.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(20),
      ADD COLUMN IF NOT EXISTS departments TEXT[];
    `);


    // Create indexes for users
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
    `);
    MyLogger.success('Create Users Table')

    // Create settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        category VARCHAR(50) NOT NULL,
        key VARCHAR(100) NOT NULL,
        value TEXT,
        data_type VARCHAR(20) NOT NULL DEFAULT 'string',
        description TEXT,
        is_public BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(category, key)
      )
    `);

    // Create indexes for settings
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
    `);
    MyLogger.success('Create Settings Table')

    MyLogger.success(action, { tablesCreated: ['suppliers', 'supplier_performance', 'categories', 'subcategories', 'brands', 'products', 'purchase_orders', 'purchase_order_line_items', 'purchase_order_timeline', 'invoices', 'payments', 'payment_history', 'users', 'settings'] })
    console.log('✅ Database tables created successfully');
    
    // Add POS tables and sequences
    MyLogger.info('Adding POS tables and sequences');
    const { addPOSTables } = await import('./add-pos-tables');
    await addPOSTables();
    await addSequences();
    MyLogger.success('POS tables and sequences added');

    // Add WhatsApp field to suppliers
    MyLogger.info('Adding WhatsApp field to suppliers');
    const { addWhatsAppToSuppliers } = await import('./add-whatsapp-to-suppliers');
    await addWhatsAppToSuppliers();
    MyLogger.success('WhatsApp field added to suppliers');

    // Add supplier categories table
    MyLogger.info('Adding supplier categories table');
    const { addSupplierCategoriesTable } = await import('./add-supplier-categories-table');
    await addSupplierCategoriesTable();
    MyLogger.success('Supplier categories table added');

    // Add warranty period and service time to products
    MyLogger.info('Adding warranty period and service time to products');
    const { addWarrantyServiceTimeToProducts } = await import('./add-warranty-service-time-to-products');
    await addWarrantyServiceTimeToProducts();
    MyLogger.success('Warranty period and service time added to products');

    // Add expense tables
    MyLogger.info('Adding expense tables');
    const { addExpenseTables } = await import('./add-expense-tables');
    await addExpenseTables();
    MyLogger.success('Expense tables added');

      // Create settings table
      await client.query(`
      -- Only need to add gift flag to track gift items
ALTER TABLE sales_order_line_items 
ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT false;

-- Optional: Add gift count to sales_orders for quick reporting
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS gift_count INTEGER DEFAULT 0;
    `);

      // Create settings table
      await client.query(`
      ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS due_amount DECIMAL(12,2) DEFAULT 0 CHECK (due_amount >= 0),
ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12,2) DEFAULT 0 CHECK (credit_limit >= 0),
ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE;

-- Add due amount to sales orders
ALTER TABLE sales_orders 
ADD COLUMN IF NOT EXISTS due_amount DECIMAL(12,2) DEFAULT 0 CHECK (due_amount >= 0);

-- Create customer due transactions table for audit trail
CREATE TABLE IF NOT EXISTS customer_due_transactions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  sales_order_id INTEGER REFERENCES sales_orders(id) ON DELETE SET NULL,
  transaction_type VARCHAR(20) NOT NULL CHECK (transaction_type IN ('charge', 'payment', 'adjustment')),
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  balance_before DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_after DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method VARCHAR(20) CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'check')),
  notes TEXT,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

    `);


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

    // Add origin_id column to products table if it doesn't exist
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS origin_id INTEGER REFERENCES origins(id) ON DELETE SET NULL
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
    
    // Add image column to products table
    await client.query(`
      ALTER TABLE products 
      ADD COLUMN IF NOT EXISTS image_url VARCHAR(500);
    `);




    



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

// Create default admin user
export const createDefaultAdminUser = async () => {
  const action = 'Create Default Admin User';
  const client = await pool.connect();
  
  try {
    MyLogger.info(action);
    
    // Check if admin user already exists
    const existingAdmin = await client.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      ['admin', 'admin@erp.com']
    );
    
    if (existingAdmin.rows.length > 0) {
      MyLogger.info('Default admin user already exists');
      return;
    }
    
    // Create default admin user
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    await client.query(`
      INSERT INTO users (username, email, password_hash, full_name, role, is_active, email_verified)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [
      'admin',
      'admin@erp.com',
      hashedPassword,
      'System Administrator',
      'admin',
      true,
      true
    ]);
    
    MyLogger.success(action, { 
      username: 'admin',
      email: 'admin@erp.com',
      password: 'admin123',
      role: 'admin'
    });
    
    console.log('✅ Default admin user created successfully');
    console.log('📧 Username: admin');
    console.log('📧 Email: admin@erp.com');
    console.log('🔑 Password: admin123');
    console.log('⚠️  Please change the default password after first login!');
    
  } catch (error) {
    MyLogger.error(action, error);
    console.error('❌ Error creating default admin user:', error);
    throw error;
  } finally {
    client.release();
  }
};

export default createTables;
