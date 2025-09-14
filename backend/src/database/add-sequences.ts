import pool from './connection';
import { MyLogger } from '../utils/new-logger';

export async function addSequences() {
  const action = 'Add Sequences';
  const client = await pool.connect();
  
  try {
    MyLogger.info(action);
    
    // Create customer code sequence
    MyLogger.info('Create Customer Code Sequence');
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS customer_code_seq
      START WITH 1
      INCREMENT BY 1
      MINVALUE 1
      NO MAXVALUE
      CACHE 1
    `);
    MyLogger.success('Create Customer Code Sequence');

    // Create sales order number sequence
    MyLogger.info('Create Sales Order Number Sequence');
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS sales_order_number_seq
      START WITH 1
      INCREMENT BY 1
      MINVALUE 1
      NO MAXVALUE
      CACHE 1
    `);
    MyLogger.success('Create Sales Order Number Sequence');

    // Create sales receipt number sequence
    MyLogger.info('Create Sales Receipt Number Sequence');
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS sales_receipt_number_seq
      START WITH 1
      INCREMENT BY 1
      MINVALUE 1
      NO MAXVALUE
      CACHE 1
    `);
    MyLogger.success('Create Sales Receipt Number Sequence');

    // Create pricing rule code sequence
    MyLogger.info('Create Pricing Rule Code Sequence');
    await client.query(`
      CREATE SEQUENCE IF NOT EXISTS pricing_rule_code_seq
      START WITH 1
      INCREMENT BY 1
      MINVALUE 1
      NO MAXVALUE
      CACHE 1
    `);
    MyLogger.success('Create Pricing Rule Code Sequence');

    // Set initial values for sequences based on existing data
    await setInitialSequenceValues(client);

    MyLogger.success(action);
  } catch (error: any) {
    MyLogger.error(action, error);
    throw error;
  } finally {
    client.release();
  }
}

async function setInitialSequenceValues(client: any) {
  const action = 'Set Initial Sequence Values';
  
  try {
    MyLogger.info(action);

    // Set customer code sequence to next available number
    const customerResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 4) AS INTEGER)), 0) as max_number
      FROM customers
      WHERE customer_code ~ '^CUS-[0-9]+$'
    `);
    
    if (customerResult.rows.length > 0) {
      const maxNumber = customerResult.rows[0].max_number;
      if (maxNumber > 0) {
        await client.query(`SELECT setval('customer_code_seq', $1, false)`, [maxNumber]);
        MyLogger.info('Set customer_code_seq to', { value: maxNumber });
      }
    }

    // Set sales order number sequence to next available number
    const orderResult = await client.query(`
      SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 4) AS INTEGER)), 0) as max_number
      FROM sales_orders
      WHERE order_number ~ '^SO-[0-9]+$'
    `);
    
    if (orderResult.rows.length > 0) {
      const maxNumber = orderResult.rows[0].max_number;
      if (maxNumber > 0) {
        await client.query(`SELECT setval('sales_order_number_seq', $1, false)`, [maxNumber]);
        MyLogger.info('Set sales_order_number_seq to', { value: maxNumber });
      }
    }

    // Set sales receipt number sequence to next available number (if table exists)
    try {
      const receiptResult = await client.query(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 4) AS INTEGER)), 0) as max_number
        FROM sales_receipts
        WHERE receipt_number ~ '^RCP-[0-9]+$'
      `);
      
      if (receiptResult.rows.length > 0) {
        const maxNumber = receiptResult.rows[0].max_number;
        if (maxNumber > 0) {
          await client.query(`SELECT setval('sales_receipt_number_seq', $1, false)`, [maxNumber]);
          MyLogger.info('Set sales_receipt_number_seq to', { value: maxNumber });
        }
      }
    } catch (error) {
      MyLogger.info('Sales receipts table does not exist yet, skipping sequence initialization');
    }

    // Set pricing rule code sequence to next available number (if table exists)
    try {
      const pricingResult = await client.query(`
        SELECT COALESCE(MAX(CAST(SUBSTRING(rule_code FROM 4) AS INTEGER)), 0) as max_number
        FROM pricing_rules
        WHERE rule_code ~ '^PRC-[0-9]+$'
      `);
      
      if (pricingResult.rows.length > 0) {
        const maxNumber = pricingResult.rows[0].max_number;
        if (maxNumber > 0) {
          await client.query(`SELECT setval('pricing_rule_code_seq', $1, false)`, [maxNumber]);
          MyLogger.info('Set pricing_rule_code_seq to', { value: maxNumber });
        }
      }
    } catch (error) {
      MyLogger.info('Pricing rules table does not exist yet, skipping sequence initialization');
    }

    MyLogger.success(action);
  } catch (error: any) {
    MyLogger.error(action, error);
    throw error;
  }
}

// Helper functions to get next sequence values for future use
export class SequenceHelper {
  static async getNextSalesReceiptNumber(client: any): Promise<string> {
    const result = await client.query('SELECT nextval(\'sales_receipt_number_seq\') as next_number');
    const nextNumber = result.rows[0].next_number;
    return `RCP-${nextNumber.toString().padStart(4, '0')}`;
  }

  static async getNextPricingRuleCode(client: any): Promise<string> {
    const result = await client.query('SELECT nextval(\'pricing_rule_code_seq\') as next_number');
    const nextNumber = result.rows[0].next_number;
    return `PRC-${nextNumber.toString().padStart(4, '0')}`;
  }
}