import pool from '@/database/connection';
import { Customer, CustomerQueryParams, CustomerStats } from '@/types/pos';
import { MyLogger } from '@/utils/new-logger';

export class GetCustomerInfoMediator {
    static async getAllCustomers(params: CustomerQueryParams): Promise<{
        customers: Customer[];
        total: number;
        page: number;
        limit: number;
    }> {
        let action = 'GetCustomerInfoMediator.getAllCustomers';
        try {
            MyLogger.info(action, { params });

            const {
                page = 1,
                limit = 10,
                search,
                customer_type,
                status,
                sortBy = 'created_at',
                sortOrder = 'desc'
            } = params;

            const offset = (page - 1) * limit;
            let whereConditions = ['1=1'];
            let queryParams: any[] = [];
            let paramIndex = 1;

            // Build WHERE conditions
            if (search) {
                whereConditions.push(`(c.name ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR c.phone ILIKE $${paramIndex} OR c.customer_code ILIKE $${paramIndex})`);
                queryParams.push(`%${search}%`);
                paramIndex++;
            }

            if (customer_type) {
                whereConditions.push(`c.customer_type = $${paramIndex}`);
                queryParams.push(customer_type);
                paramIndex++;
            }

            if (status) {
                whereConditions.push(`c.status = $${paramIndex}`);
                queryParams.push(status);
                paramIndex++;
            }

            const whereClause = whereConditions.join(' AND ');

            // Get total count
            const countQuery = `
                SELECT COUNT(*) as total
                FROM customers c
                WHERE ${whereClause}
            `;
            const countResult = await pool.query(countQuery, queryParams);
            const total = parseInt(countResult.rows[0].total);

            // Get customers with pagination
            const customersQuery = `
                SELECT 
                    c.id,
                    c.customer_code,
                    c.name,
                    c.email,
                    c.phone,
                    c.address,
                    c.city,
                    c.state,
                    c.zip_code,
                    c.country,
                    c.date_of_birth,
                    c.gender,
                    c.customer_type,
                    c.status,
                    c.total_purchases,
                    c.loyalty_points,
                    c.credit_limit,
                    c.due_amount,
                    c.last_purchase_date,
                    c.last_payment_date,
                    c.notes,
                    c.created_at,
                    c.updated_at
                FROM customers c
                WHERE ${whereClause}
                ORDER BY c.${sortBy} ${sortOrder.toUpperCase()}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            queryParams.push(limit, offset);
            const customersResult = await pool.query(customersQuery, queryParams);

            MyLogger.success(action, { total, page, limit, customersCount: customersResult.rows.length });

            return {
                customers: customersResult.rows,
                total,
                page,
                limit
            };
        } catch (error: any) {
            MyLogger.error(action, error, { params });
            throw error;
        }
    }

    static async getCustomerById(id: number): Promise<Customer> {
        let action = 'GetCustomerInfoMediator.getCustomerById';
        try {
            MyLogger.info(action, { customerId: id });

            const query = `
                SELECT 
                    c.id,
                    c.customer_code,
                    c.name,
                    c.email,
                    c.phone,
                    c.address,
                    c.city,
                    c.state,
                    c.zip_code,
                    c.country,
                    c.date_of_birth,
                    c.gender,
                    c.customer_type,
                    c.status,
                    c.total_purchases,
                    c.loyalty_points,
                    c.credit_limit,
                    c.due_amount,
                    c.last_purchase_date,
                    c.last_payment_date,
                    c.notes,
                    c.created_at,
                    c.updated_at
                FROM customers c
                WHERE c.id = $1
            `;

            const result = await pool.query(query, [id]);

            if (result.rows.length === 0) {
                throw new Error(`Customer with ID ${id} not found`);
            }

            const customer = result.rows[0];
            MyLogger.success(action, { customerId: id, customerName: customer.name });

            return customer;
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: id });
            throw error;
        }
    }

    static async searchCustomers(query: string, limit = 10): Promise<Customer[]> {
        let action = 'GetCustomerInfoMediator.searchCustomers';
        try {
            MyLogger.info(action, { query, limit });

            const searchQuery = `
                SELECT 
                    c.id,
                    c.customer_code,
                    c.name,
                    c.email,
                    c.phone,
                    c.customer_type,
                    c.status,
                    c.total_purchases,
                    c.loyalty_points
                FROM customers c
                WHERE (c.name ILIKE $1 OR c.email ILIKE $1 OR c.phone ILIKE $1 OR c.customer_code ILIKE $1)
                AND c.status = 'active'
                ORDER BY c.name
                LIMIT $2
            `;

            const result = await pool.query(searchQuery, [`%${query}%`, limit]);
            MyLogger.success(action, { query, resultsCount: result.rows.length });

            return result.rows;
        } catch (error: any) {
            MyLogger.error(action, error, { query });
            throw error;
        }
    }

    static async getCustomerStats(): Promise<CustomerStats> {
        let action = 'GetCustomerInfoMediator.getCustomerStats';
        try {
            MyLogger.info(action);

            const statsQuery = `
                SELECT 
                    COUNT(*) as total_customers,
                    COUNT(CASE WHEN status = 'active' THEN 1 END) as active_customers,
                    COUNT(CASE WHEN DATE(created_at) = CURRENT_DATE THEN 1 END) as new_customers_today,
                    COUNT(CASE WHEN DATE(created_at) >= DATE_TRUNC('month', CURRENT_DATE) THEN 1 END) as new_customers_this_month
                FROM customers
            `;

            const customerTypesQuery = `
                SELECT 
                    customer_type,
                    COUNT(*) as count
                FROM customers
                WHERE status = 'active'
                GROUP BY customer_type
                ORDER BY count DESC
            `;

            const topCustomersQuery = `
                SELECT 
                    c.id as customer_id,
                    c.name as customer_name,
                    c.total_purchases,
                    COUNT(so.id) as total_orders
                FROM customers c
                LEFT JOIN sales_orders so ON c.id = so.customer_id
                WHERE c.status = 'active'
                GROUP BY c.id, c.name, c.total_purchases
                ORDER BY c.total_purchases DESC
                LIMIT 10
            `;

            const [statsResult, customerTypesResult, topCustomersResult] = await Promise.all([
                pool.query(statsQuery),
                pool.query(customerTypesQuery),
                pool.query(topCustomersQuery)
            ]);

            const stats = statsResult.rows[0];
            const customerTypes = customerTypesResult.rows;
            const topCustomers = topCustomersResult.rows;

            const customerStats: CustomerStats = {
                total_customers: parseInt(stats.total_customers),
                active_customers: parseInt(stats.active_customers),
                new_customers_today: parseInt(stats.new_customers_today),
                new_customers_this_month: parseInt(stats.new_customers_this_month),
                customer_types: customerTypes,
                top_customers: topCustomers
            };

            MyLogger.success(action, { stats: customerStats });

            return customerStats;
        } catch (error: any) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    static async getCustomersByType(customerType: string): Promise<Customer[]> {
        let action = 'GetCustomerInfoMediator.getCustomersByType';
        try {
            MyLogger.info(action, { customerType });

            const query = `
                SELECT 
                    c.id,
                    c.customer_code,
                    c.name,
                    c.email,
                    c.phone,
                    c.customer_type,
                    c.status,
                    c.total_purchases,
                    c.loyalty_points
                FROM customers c
                WHERE c.customer_type = $1 AND c.status = 'active'
                ORDER BY c.name
            `;

            const result = await pool.query(query, [customerType]);
            MyLogger.success(action, { customerType, customersCount: result.rows.length });

            return result.rows;
        } catch (error: any) {
            MyLogger.error(action, error, { customerType });
            throw error;
        }
    }
}
