import { Pool } from 'pg';
import pool from './connection';

export async function addCustomerCreditFields(): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('Adding credit_limit and due_amount fields to customers table...');
    
    // Add credit_limit and due_amount fields to customers table
    await client.query(`
      ALTER TABLE customers 
      ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12,2) DEFAULT 0 CHECK (credit_limit >= 0),
      ADD COLUMN IF NOT EXISTS due_amount DECIMAL(12,2) DEFAULT 0 CHECK (due_amount >= 0),
      ADD COLUMN IF NOT EXISTS last_payment_date TIMESTAMP WITH TIME ZONE;
    `);
    
    console.log('Adding due_amount field to sales_orders table...');
    
    // Add due_amount field to sales_orders table
    await client.query(`
      ALTER TABLE sales_orders 
      ADD COLUMN IF NOT EXISTS due_amount DECIMAL(12,2) DEFAULT 0 CHECK (due_amount >= 0);
    `);
    
    console.log('Adding is_gift field to sales_order_line_items table...');
    
    // Add is_gift field to sales_order_line_items table
    await client.query(`
      ALTER TABLE sales_order_line_items 
      ADD COLUMN IF NOT EXISTS is_gift BOOLEAN DEFAULT FALSE;
    `);
    
    console.log('Updating existing customers to have default credit limit of 1000...');
    
    // Set default credit limit for existing customers (except walk-in)
    await client.query(`
      UPDATE customers 
      SET credit_limit = 1000.00 
      WHERE credit_limit IS NULL 
      AND customer_type != 'walk_in';
    `);
    
    await client.query('COMMIT');
    console.log('Successfully added customer credit fields!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding customer credit fields:', error);
    throw error;
  } finally {
    client.release();
  }
}



