import pool from './connection';

const createTables = async () => {
  const client = await pool.connect();
  
  try {
    // Create suppliers table
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

    // Create supplier performance tracking table
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

    // Create indexes for better performance
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

    // Create function to update updated_at timestamp
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create trigger to automatically update updated_at
    await client.query(`
      DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
      CREATE TRIGGER update_suppliers_updated_at
        BEFORE UPDATE ON suppliers
        FOR EACH ROW
        EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Run migrations if this file is executed directly
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('🎉 Migration completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Migration failed:', error);
      process.exit(1);
    });
}

export default createTables;
