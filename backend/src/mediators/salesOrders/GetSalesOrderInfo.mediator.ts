import pool from '@/database/connection';
import { SalesOrder, SalesOrderWithDetails, SalesOrderQueryParams, POSStats } from '@/types/pos';
import { MyLogger } from '@/utils/new-logger';

export class GetSalesOrderInfoMediator {
    static async getAllSalesOrders(params: SalesOrderQueryParams): Promise<{
        sales_orders: SalesOrder[];
        total: number;
        page: number;
        limit: number;
    }> {
        let action = 'GetSalesOrderInfoMediator.getAllSalesOrders';
        try {
            MyLogger.info(action, { params });

            const {
                page = 1,
                limit = 10,
                search,
                customer_id,
                status,
                payment_status,
                payment_method,
                start_date,
                end_date,
                sortBy = 'order_date',
                sortOrder = 'desc'
            } = params;

            const offset = (page - 1) * limit;
            let whereConditions = ['1=1'];
            let queryParams: any[] = [];
            let paramIndex = 1;

            // Build WHERE conditions
            if (search) {
                whereConditions.push(`(so.order_number ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`);
                queryParams.push(`%${search}%`);
                paramIndex++;
            }

            if (customer_id) {
                whereConditions.push(`so.customer_id = $${paramIndex}`);
                queryParams.push(customer_id);
                paramIndex++;
            }

            if (status) {
                whereConditions.push(`so.status = $${paramIndex}`);
                queryParams.push(status);
                paramIndex++;
            }

            if (payment_status) {
                whereConditions.push(`so.payment_status = $${paramIndex}`);
                queryParams.push(payment_status);
                paramIndex++;
            }

            if (payment_method) {
                whereConditions.push(`so.payment_method = $${paramIndex}`);
                queryParams.push(payment_method);
                paramIndex++;
            }

            if (start_date) {
                whereConditions.push(`DATE(so.order_date) >= $${paramIndex}`);
                queryParams.push(start_date);
                paramIndex++;
            }

            if (end_date) {
                whereConditions.push(`DATE(so.order_date) <= $${paramIndex}`);
                queryParams.push(end_date);
                paramIndex++;
            }

            const whereClause = whereConditions.join(' AND ');

            // Get total count
            const countQuery = `
                SELECT COUNT(*) as total
                FROM sales_orders so
                LEFT JOIN customers c ON so.customer_id = c.id
                WHERE ${whereClause}
            `;
            const countResult = await pool.query(countQuery, queryParams);
            const total = parseInt(countResult.rows[0].total);

            // Get sales orders with pagination
            const salesOrdersQuery = `
                SELECT 
                    so.id,
                    so.order_number,
                    so.customer_id,
                    so.order_date,
                    so.status,
                    so.payment_status,
                    so.payment_method,
                    so.subtotal,
                    so.discount_amount,
                    so.tax_amount,
                    so.total_amount,
                    so.cash_received,
                    so.change_given,
                    so.cashier_id,
                    so.notes,
                    so.created_at,
                    so.updated_at,
                    c.name as customer_name,
                    c.email as customer_email,
                    c.phone as customer_phone,
                    u.full_name as cashier_name,
                    COALESCE(li.product_count, 0) as product_count
                FROM sales_orders so
                LEFT JOIN customers c ON so.customer_id = c.id
                LEFT JOIN users u ON so.cashier_id = u.id
                LEFT JOIN (
                    SELECT 
                        sales_order_id,
                        COUNT(DISTINCT product_id) as product_count
                    FROM sales_order_line_items
                    GROUP BY sales_order_id
                ) li ON so.id = li.sales_order_id
                WHERE ${whereClause}
                ORDER BY so.${sortBy} ${sortOrder.toUpperCase()}
                LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `;

            queryParams.push(limit, offset);
            const salesOrdersResult = await pool.query(salesOrdersQuery, queryParams);

            MyLogger.success(action, { total, page, limit, salesOrdersCount: salesOrdersResult.rows.length });

            return {
                sales_orders: salesOrdersResult.rows,
                total,
                page,
                limit
            };
        } catch (error: any) {
            MyLogger.error(action, error, { params });
            throw error;
        }
    }

    static async getSalesOrderById(id: number): Promise<SalesOrderWithDetails> {
        let action = 'GetSalesOrderInfoMediator.getSalesOrderById';
        try {
            MyLogger.info(action, { salesOrderId: id });

            // Get sales order details
            const salesOrderQuery = `
                SELECT 
                    so.id,
                    so.order_number,
                    so.customer_id,
                    so.order_date,
                    so.status,
                    so.payment_status,
                    so.payment_method,
                    so.subtotal,
                    so.discount_amount,
                    so.tax_amount,
                    so.total_amount,
                    so.cash_received,
                    so.change_given,
                    so.cashier_id,
                    so.notes,
                    so.created_at,
                    so.updated_at,
                    c.name as customer_name,
                    c.email as customer_email,
                    c.phone as customer_phone,
                    u.full_name as cashier_name
                FROM sales_orders so
                LEFT JOIN customers c ON so.customer_id = c.id
                LEFT JOIN users u ON so.cashier_id = u.id
                WHERE so.id = $1
            `;

            const salesOrderResult = await pool.query(salesOrderQuery, [id]);

            if (salesOrderResult.rows.length === 0) {
                throw new Error(`Sales order with ID ${id} not found`);
            }

            // Get line items
            const lineItemsQuery = `
                SELECT 
                    soli.id,
                    soli.sales_order_id,
                    soli.product_id,
                    soli.product_sku,
                    soli.product_name,
                    soli.quantity,
                    soli.unit_price,
                    soli.discount_percentage,
                    soli.discount_amount,
                    soli.line_total,
                    soli.created_at,
                    p.description as product_description,
                    p.image_url as product_image_url
                FROM sales_order_line_items soli
                LEFT JOIN products p ON soli.product_id = p.id
                WHERE soli.sales_order_id = $1
                ORDER BY soli.id
            `;

            const lineItemsResult = await pool.query(lineItemsQuery, [id]);

            const salesOrder = salesOrderResult.rows[0];
            salesOrder.line_items = lineItemsResult.rows;

            MyLogger.success(action, { 
                salesOrderId: id, 
                orderNumber: salesOrder.order_number,
                lineItemsCount: lineItemsResult.rows.length
            });

            return salesOrder;
        } catch (error: any) {
            MyLogger.error(action, error, { salesOrderId: id });
            throw error;
        }
    }

    static async getPOSStats(): Promise<POSStats> {
        let action = 'GetSalesOrderInfoMediator.getPOSStats';
        try {
            MyLogger.info(action);

            const statsQuery = `
                SELECT 
                    COALESCE(SUM(total_amount), 0) as total_sales,
                    COUNT(*) as total_orders,
                    COALESCE(AVG(total_amount), 0) as average_order_value
                FROM sales_orders
                WHERE status = 'completed'
            `;

            const todayStatsQuery = `
                SELECT 
                    COALESCE(SUM(total_amount), 0) as today_sales,
                    COUNT(*) as today_orders
                FROM sales_orders
                WHERE status = 'completed' 
                AND DATE(order_date) = CURRENT_DATE
            `;

            const topProductsQuery = `
                SELECT 
                    soli.product_id,
                    soli.product_name,
                    SUM(soli.quantity) as total_quantity,
                    SUM(soli.line_total) as total_revenue
                FROM sales_order_line_items soli
                JOIN sales_orders so ON soli.sales_order_id = so.id
                WHERE so.status = 'completed'
                GROUP BY soli.product_id, soli.product_name
                ORDER BY total_revenue DESC
                LIMIT 10
            `;

            const paymentMethodsQuery = `
                SELECT 
                    payment_method,
                    COUNT(*) as count,
                    SUM(total_amount) as total_amount
                FROM sales_orders
                WHERE status = 'completed'
                GROUP BY payment_method
                ORDER BY total_amount DESC
            `;

            const totalCustomersQuery = `
                SELECT COUNT(DISTINCT customer_id) as total_customers
                FROM sales_orders
                WHERE customer_id IS NOT NULL
            `;

            const [statsResult, todayStatsResult, topProductsResult, paymentMethodsResult, totalCustomersResult] = await Promise.all([
                pool.query(statsQuery),
                pool.query(todayStatsQuery),
                pool.query(topProductsQuery),
                pool.query(paymentMethodsQuery),
                pool.query(totalCustomersQuery)
            ]);

            const stats = statsResult.rows[0];
            const todayStats = todayStatsResult.rows[0];
            const topProducts = topProductsResult.rows;
            const paymentMethods = paymentMethodsResult.rows;
            const totalCustomers = parseInt(totalCustomersResult.rows[0].total_customers);

            const posStats: POSStats = {
                total_sales: parseFloat(stats.total_sales),
                total_orders: parseInt(stats.total_orders),
                total_customers: totalCustomers,
                average_order_value: parseFloat(stats.average_order_value),
                today_sales: parseFloat(todayStats.today_sales),
                today_orders: parseInt(todayStats.today_orders),
                top_selling_products: topProducts.map(p => ({
                    product_id: p.product_id,
                    product_name: p.product_name,
                    total_quantity: parseFloat(p.total_quantity),
                    total_revenue: parseFloat(p.total_revenue)
                })),
                payment_methods: paymentMethods.map(pm => ({
                    payment_method: pm.payment_method,
                    count: parseInt(pm.count),
                    total_amount: parseFloat(pm.total_amount)
                }))
            };

            MyLogger.success(action, { stats: posStats });

            return posStats;
        } catch (error: any) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    static async searchSalesOrders(query: string, limit = 10): Promise<SalesOrder[]> {
        let action = 'GetSalesOrderInfoMediator.searchSalesOrders';
        try {
            MyLogger.info(action, { query, limit });

            const searchQuery = `
                SELECT 
                    so.id,
                    so.order_number,
                    so.order_date,
                    so.status,
                    so.payment_status,
                    so.total_amount,
                    c.name as customer_name
                FROM sales_orders so
                LEFT JOIN customers c ON so.customer_id = c.id
                WHERE (so.order_number ILIKE $1 OR c.name ILIKE $1)
                ORDER BY so.order_date DESC
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
}
