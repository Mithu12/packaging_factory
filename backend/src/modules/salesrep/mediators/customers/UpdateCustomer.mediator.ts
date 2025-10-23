import {
  SalesRepCustomer,
  UpdateCustomerRequest,
} from '../../types';
import { MediatorInterface } from '@/types';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

class UpdateCustomerMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error('Not Implemented');
  }

  // Update customer
  async updateCustomer(id: number, data: UpdateCustomerRequest): Promise<SalesRepCustomer | null> {
    let action = 'Update Customer';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { customerId: id, updateData: data });

      // Check if customer exists
      const existingCustomer = await this.getCustomer(id);
      if (!existingCustomer) {
        throw new Error('Customer not found');
      }

      const updateQuery = `
        UPDATE sales_rep_customers SET
          name = $1,
          email = $2,
          phone = $3,
          address = $4,
          city = $5,
          state = $6,
          postal_code = $7,
          credit_limit = $8,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
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

      const result = await client.query(updateQuery, [
        data.name,
        data.email || null,
        data.phone || null,
        data.address || null,
        data.city || null,
        data.state || null,
        data.postal_code || null,
        data.credit_limit || existingCustomer.credit_limit,
        id
      ]);

      const customer = result.rows[0];

      await client.query('COMMIT');
      MyLogger.success(action, {
        customerId: id,
        customerName: customer.name,
        updatedFields: Object.keys(data)
      });

      return customer;
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { customerId: id, updateData: data });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get single customer by ID (helper method)
  private async getCustomer(id: number): Promise<SalesRepCustomer | null> {
    const customerQuery = `
      SELECT
        c.id,
        c.name,
        c.email,
        c.phone,
        c.address,
        c.city,
        c.state,
        c.postal_code,
        c.credit_limit,
        c.current_balance,
        c.sales_rep_id,
        c.created_at,
        c.updated_at
      FROM sales_rep_customers c
      WHERE c.id = $1
    `;

    const result = await pool.query(customerQuery, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }
}

export default new UpdateCustomerMediator();
