import {
  SalesRepCustomer,
  CustomerFilters,
  PaginationParams,
  PaginatedResponse,
} from '../../types';
import { MediatorInterface } from '@/types';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

class GetCustomerInfoMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error('Not Implemented');
  }

  // Get paginated list of customers with filters
  async getCustomers(filters?: CustomerFilters, pagination?: PaginationParams): Promise<PaginatedResponse<SalesRepCustomer>> {
    let action = 'Get Customers';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { filters, pagination });

      const {
        page = 1,
        limit = 10,
        search = '',
        city,
        state,
        credit_limit_min,
        credit_limit_max,
        balance_min,
        balance_max,
      } = filters || {};

      const offset = (page - 1) * limit;

      // Build WHERE conditions
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (search) {
        conditions.push(`(
          LOWER(c.name) LIKE $${paramIndex} OR
          LOWER(c.email) LIKE $${paramIndex}
        )`);
        values.push(`%${search.toLowerCase()}%`);
        paramIndex++;
      }

      if (city) {
        conditions.push(`LOWER(c.city) = $${paramIndex}`);
        values.push(city.toLowerCase());
        paramIndex++;
      }

      if (state) {
        conditions.push(`LOWER(c.state) = $${paramIndex}`);
        values.push(state.toLowerCase());
        paramIndex++;
      }

      if (credit_limit_min !== undefined) {
        conditions.push(`c.credit_limit >= $${paramIndex}`);
        values.push(credit_limit_min);
        paramIndex++;
      }

      if (credit_limit_max !== undefined) {
        conditions.push(`c.credit_limit <= $${paramIndex}`);
        values.push(credit_limit_max);
        paramIndex++;
      }

      if (balance_min !== undefined) {
        conditions.push(`c.current_balance >= $${paramIndex}`);
        values.push(balance_min);
        paramIndex++;
      }

      if (balance_max !== undefined) {
        conditions.push(`c.current_balance <= $${paramIndex}`);
        values.push(balance_max);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM sales_rep_customers c
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get customers
      const customersQuery = `
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
        ${whereClause}
        ORDER BY c.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);
      const customersResult = await client.query(customersQuery, values);

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        total,
        page,
        limit,
        totalPages,
        returnedCount: customersResult.rows.length,
        filters: Object.keys(filters || {}).length
      });

      return {
        data: customersResult.rows,
        page,
        limit,
        total,
        totalPages
      };
    } catch (error: any) {
      MyLogger.error(action, error, { filters, pagination });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get single customer by ID
  async getCustomer(id: number): Promise<SalesRepCustomer | null> {
    let action = 'Get Customer By ID';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { customerId: id });

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

      const result = await client.query(customerQuery, [id]);

      if (result.rows.length === 0) {
        MyLogger.info(action, { customerId: id, found: false });
        return null;
      }

      const customer = result.rows[0];

      MyLogger.success(action, {
        customerId: id,
        customerName: customer.name,
        found: true
      });

      return customer;
    } catch (error: any) {
      MyLogger.error(action, error, { customerId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get customer statistics
  async getCustomerStats(): Promise<any> {
    let action = 'Get Customer Statistics';
    const client = await pool.connect();

    try {
      MyLogger.info(action);

      const statsQuery = `
        SELECT
          COUNT(*) as total_customers,
          COUNT(*) FILTER (WHERE current_balance > 0) as customers_with_balance,
          COUNT(*) FILTER (WHERE current_balance > credit_limit * 0.8) as high_balance_customers,
          AVG(credit_limit) as average_credit_limit,
          AVG(current_balance) as average_balance,
          SUM(current_balance) as total_outstanding
        FROM sales_rep_customers
      `;

      const result = await client.query(statsQuery);
      const stats = result.rows[0];

      MyLogger.success(action, {
        totalCustomers: parseInt(stats.total_customers),
        customersWithBalance: parseInt(stats.customers_with_balance),
        highBalanceCustomers: parseInt(stats.high_balance_customers),
        averageCreditLimit: parseFloat(stats.average_credit_limit),
        averageBalance: parseFloat(stats.average_balance),
        totalOutstanding: parseFloat(stats.total_outstanding)
      });

      return {
        totalCustomers: parseInt(stats.total_customers),
        customersWithBalance: parseInt(stats.customers_with_balance),
        highBalanceCustomers: parseInt(stats.high_balance_customers),
        averageCreditLimit: parseFloat(stats.average_credit_limit),
        averageBalance: parseFloat(stats.average_balance),
        totalOutstanding: parseFloat(stats.total_outstanding)
      };
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new GetCustomerInfoMediator();
