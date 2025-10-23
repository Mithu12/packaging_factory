import {
  SalesRepCustomer,
  CreateCustomerRequest,
} from '../../types';
import { MediatorInterface } from '@/types';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

class AddCustomerMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error('Not Implemented');
  }

  // Create new customer
  async createCustomer(data: CreateCustomerRequest, salesRepId?: number): Promise<SalesRepCustomer> {
    let action = 'Create Customer';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { customerData: data, salesRepId });

      const insertQuery = `
        INSERT INTO sales_rep_customers (
          name,
          email,
          phone,
          address,
          city,
          state,
          postal_code,
          credit_limit,
          current_balance,
          sales_rep_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
          id,
          name,
          email,
          phone,
          address,
          city,
          state,
          postal_code,
          credit_limit,
          current_balance,
          sales_rep_id,
          created_at,
          updated_at
      `;

      const result = await client.query(insertQuery, [
        data.name,
        data.email || null,
        data.phone || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.postal_code || null,
        data.credit_limit || 0,
        0, // Initial balance is 0
        salesRepId || null
      ]);

      const customer = result.rows[0];

      await client.query('COMMIT');
      MyLogger.success(action, {
        customerId: customer.id,
        customerName: customer.name,
        salesRepId: customer.sales_rep_id
      });

      return customer;
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { customerData: data, salesRepId });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new AddCustomerMediator();
