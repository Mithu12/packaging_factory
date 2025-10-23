import { MediatorInterface } from '@/types';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

class DeleteCustomerMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error('Not Implemented');
  }

  // Delete customer
  async deleteCustomer(id: number): Promise<void> {
    let action = 'Delete Customer';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { customerId: id });

      // Check if customer exists
      const existingCustomer = await this.getCustomer(id);
      if (!existingCustomer) {
        throw new Error('Customer not found');
      }

      // Check if customer has any orders
      const ordersQuery = 'SELECT COUNT(*) as order_count FROM sales_rep_orders WHERE customer_id = $1';
      const ordersResult = await client.query(ordersQuery, [id]);

      if (parseInt(ordersResult.rows[0].order_count) > 0) {
        throw new Error('Cannot delete customer with existing orders');
      }

      // Delete customer
      const deleteQuery = 'DELETE FROM sales_rep_customers WHERE id = $1';
      await client.query(deleteQuery, [id]);

      await client.query('COMMIT');
      MyLogger.success(action, {
        customerId: id,
        customerName: existingCustomer.name,
        deleted: true
      });

    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { customerId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get single customer by ID (helper method)
  private async getCustomer(id: number): Promise<any | null> {
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

export default new DeleteCustomerMediator();
