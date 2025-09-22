import pool from './connection';

async function addApprovalSystem(): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Adding Accounts role to users table check constraint...');
    
    // Update users table role constraint to include 'accounts'
    await client.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS users_role_check;
    `);
    
    await client.query(`
      ALTER TABLE users 
      ADD CONSTRAINT users_role_check 
      CHECK (role IN ('admin', 'manager', 'accounts', 'employee', 'viewer'));
    `);
    
    console.log('Adding approval fields to purchase_orders table...');
    
    // Add approval fields to purchase_orders
    await client.query(`
      ALTER TABLE purchase_orders 
      ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS submitted_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'draft' 
        CHECK (approval_status IN ('draft', 'submitted', 'approved', 'rejected')),
      ADD COLUMN IF NOT EXISTS approval_notes TEXT;
    `);
    
    console.log('Adding approval fields to payments table...');
    
    // Add approval fields to payments (assuming payments table exists)
    await client.query(`
      ALTER TABLE payments 
      ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS submitted_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'draft' 
        CHECK (approval_status IN ('draft', 'submitted', 'approved', 'rejected')),
      ADD COLUMN IF NOT EXISTS approval_notes TEXT;
    `);
    
    console.log('Adding approval fields to expenses table...');
    
    // Add approval fields to expenses
    await client.query(`
      ALTER TABLE expenses 
      ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS submitted_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id),
      ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20) DEFAULT 'draft' 
        CHECK (approval_status IN ('draft', 'submitted', 'approved', 'rejected')),
      ADD COLUMN IF NOT EXISTS approval_notes TEXT;
    `);
    
    console.log('Creating approval_history table for audit trail...');
    
    // Create approval history table for audit trail
    await client.query(`
      CREATE TABLE IF NOT EXISTS approval_history (
        id BIGSERIAL PRIMARY KEY,
        entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('purchase_order', 'payment', 'expense')),
        entity_id INTEGER NOT NULL,
        action VARCHAR(20) NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected', 'revised')),
        performed_by INTEGER NOT NULL REFERENCES users(id),
        performed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        notes TEXT,
        previous_status VARCHAR(20),
        new_status VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    console.log('Creating indexes for approval system...');
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_approval_history_entity ON approval_history(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_approval_history_performed_by ON approval_history(performed_by);
      CREATE INDEX IF NOT EXISTS idx_purchase_orders_approval_status ON purchase_orders(approval_status);
      CREATE INDEX IF NOT EXISTS idx_payments_approval_status ON payments(approval_status);
      CREATE INDEX IF NOT EXISTS idx_expenses_approval_status ON expenses(approval_status);
    `);
    
    console.log('Updating existing records to have draft status...');
    
    // Update existing records to have draft status
    await client.query(`
      UPDATE purchase_orders SET approval_status = 'draft' WHERE approval_status IS NULL;
      UPDATE payments SET approval_status = 'draft' WHERE approval_status IS NULL;
      UPDATE expenses SET approval_status = 'draft' WHERE approval_status IS NULL;
    `);
    
    await client.query('COMMIT');
    console.log('Successfully added approval system!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding approval system:', error);
    throw error;
  } finally {
    client.release();
  }
}

export { addApprovalSystem };
