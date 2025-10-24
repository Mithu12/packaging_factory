import { NextFunction, Request, Response } from "express";
import pool from '@/database/connection';
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";

class SalesReportsController {

    async getSalesSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/sales/reports/sales-summary';
        try {
            const { start_date, end_date } = req.query;

            MyLogger.info(action, { start_date, end_date });

            let whereClause = '';
            let queryParams: any[] = [];

            if (start_date || end_date) {
                const conditions = [];
                if (start_date) {
                    conditions.push('DATE(so.order_date) >= $1');
                    queryParams.push(start_date);
                }
                if (end_date) {
                    conditions.push(`DATE(so.order_date) <= $${queryParams.length + 1}`);
                    queryParams.push(end_date);
                }
                whereClause = 'WHERE ' + conditions.join(' AND ');
            }

            const query = `
                SELECT
                    COUNT(*) as total_orders,
                    SUM(so.total_amount) as total_revenue,
                    AVG(so.total_amount) as avg_order_value,
                    COUNT(DISTINCT so.customer_id) as unique_customers,
                    SUM(CASE WHEN so.payment_status = 'paid' THEN 1 ELSE 0 END) as paid_orders,
                    SUM(CASE WHEN so.status = 'completed' THEN 1 ELSE 0 END) as completed_orders
                FROM sales_orders so
                ${whereClause}
            `;

            const result = await pool.query(query, queryParams);
            const data = result.rows[0];

            const summary = {
                total_orders: parseInt(data.total_orders) || 0,
                total_revenue: parseFloat(data.total_revenue) || 0,
                avg_order_value: parseFloat(data.avg_order_value) || 0,
                unique_customers: parseInt(data.unique_customers) || 0,
                paid_orders: parseInt(data.paid_orders) || 0,
                completed_orders: parseInt(data.completed_orders) || 0,
                payment_rate: data.total_orders > 0 ? (data.paid_orders / data.total_orders * 100) : 0,
                completion_rate: data.total_orders > 0 ? (data.completed_orders / data.total_orders * 100) : 0
            };

            MyLogger.success(action, { summary });
            serializeSuccessResponse(res, summary, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }

    async getCustomerPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/sales/reports/customer-performance';
        try {
            const { limit = 10, start_date, end_date } = req.query;

            MyLogger.info(action, { limit, start_date, end_date });

            let whereClause = '';
            let queryParams: any[] = [];

            if (start_date || end_date) {
                const conditions = [];
                if (start_date) {
                    conditions.push('DATE(so.order_date) >= $1');
                    queryParams.push(start_date);
                }
                if (end_date) {
                    conditions.push(`DATE(so.order_date) <= $${queryParams.length + 1}`);
                    queryParams.push(end_date);
                }
                whereClause = 'AND ' + conditions.join(' AND ');
            }

            const query = `
                SELECT
                    c.id,
                    c.customer_code,
                    c.name,
                    c.email,
                    c.phone,
                    COUNT(so.id) as total_orders,
                    SUM(so.total_amount) as total_revenue,
                    AVG(so.total_amount) as avg_order_value,
                    MAX(so.order_date) as last_order_date
                FROM customers c
                LEFT JOIN sales_orders so ON c.id = so.customer_id ${whereClause}
                WHERE c.status = 'active'
                GROUP BY c.id, c.customer_code, c.name, c.email, c.phone
                ORDER BY total_revenue DESC NULLS LAST
                LIMIT $${queryParams.length + 1}
            `;

            queryParams.push(limit);

            const result = await pool.query(query, queryParams);
            const customers = result.rows.map(row => ({
                id: row.id,
                customer_code: row.customer_code,
                name: row.name,
                email: row.email,
                phone: row.phone,
                total_orders: parseInt(row.total_orders) || 0,
                total_revenue: parseFloat(row.total_revenue) || 0,
                avg_order_value: parseFloat(row.avg_order_value) || 0,
                last_order_date: row.last_order_date
            }));

            MyLogger.success(action, { customersCount: customers.length });
            serializeSuccessResponse(res, customers, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }

    async getPaymentAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/sales/reports/payment-analysis';
        try {
            const { start_date, end_date } = req.query;

            MyLogger.info(action, { start_date, end_date });

            let whereClause = '';
            let queryParams: any[] = [];

            if (start_date || end_date) {
                const conditions = [];
                if (start_date) {
                    conditions.push('DATE(so.order_date) >= $1');
                    queryParams.push(start_date);
                }
                if (end_date) {
                    conditions.push(`DATE(so.order_date) <= $${queryParams.length + 1}`);
                    queryParams.push(end_date);
                }
                whereClause = 'WHERE ' + conditions.join(' AND ');
            }

            const paymentMethodsQuery = `
                SELECT
                    payment_method,
                    COUNT(*) as order_count,
                    SUM(total_amount) as total_amount
                FROM sales_orders
                ${whereClause}
                AND payment_method IS NOT NULL
                GROUP BY payment_method
                ORDER BY total_amount DESC
            `;

            const outstandingQuery = `
                SELECT
                    SUM(total_amount - cash_received) as total_outstanding,
                    COUNT(*) as outstanding_orders
                FROM sales_orders
                ${whereClause ? whereClause + ' AND payment_status != \'paid\'' : 'WHERE payment_status != \'paid\''}
            `;

            const [paymentMethodsResult, outstandingResult] = await Promise.all([
                pool.query(paymentMethodsQuery, queryParams),
                pool.query(outstandingQuery, queryParams)
            ]);

            const paymentMethods = paymentMethodsResult.rows.map(row => ({
                method: row.payment_method,
                order_count: parseInt(row.order_count),
                total_amount: parseFloat(row.total_amount)
            }));

            const outstanding = outstandingResult.rows[0];

            const analysis = {
                payment_methods: paymentMethods,
                outstanding_payments: {
                    total_outstanding: parseFloat(outstanding.total_outstanding) || 0,
                    outstanding_orders: parseInt(outstanding.outstanding_orders) || 0
                }
            };

            MyLogger.success(action, { paymentMethodsCount: paymentMethods.length });
            serializeSuccessResponse(res, analysis, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }

    async getOrderFulfillment(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/sales/reports/order-fulfillment';
        try {
            const { start_date, end_date } = req.query;

            MyLogger.info(action, { start_date, end_date });

            let whereClause = '';
            let queryParams: any[] = [];

            if (start_date || end_date) {
                const conditions = [];
                if (start_date) {
                    conditions.push('DATE(order_date) >= $1');
                    queryParams.push(start_date);
                }
                if (end_date) {
                    conditions.push(`DATE(order_date) <= $${queryParams.length + 1}`);
                    queryParams.push(end_date);
                }
                whereClause = 'WHERE ' + conditions.join(' AND ');
            }

            const statusQuery = `
                SELECT
                    status,
                    COUNT(*) as order_count,
                    SUM(total_amount) as total_amount
                FROM sales_orders
                ${whereClause}
                GROUP BY status
                ORDER BY order_count DESC
            `;

            const fulfillmentQuery = `
                SELECT
                    AVG(EXTRACT(EPOCH FROM (updated_at - order_date))/86400) as avg_fulfillment_days,
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_orders
                FROM sales_orders
                ${whereClause}
                AND status IN ('completed', 'cancelled')
            `;

            const [statusResult, fulfillmentResult] = await Promise.all([
                pool.query(statusQuery, queryParams),
                pool.query(fulfillmentQuery, queryParams)
            ]);

            const statusDistribution = statusResult.rows.map(row => ({
                status: row.status,
                order_count: parseInt(row.order_count),
                total_amount: parseFloat(row.total_amount)
            }));

            const fulfillment = fulfillmentResult.rows[0];

            const report = {
                status_distribution: statusDistribution,
                fulfillment_metrics: {
                    avg_fulfillment_days: parseFloat(fulfillment.avg_fulfillment_days) || 0,
                    total_orders: parseInt(fulfillment.total_orders) || 0,
                    completed_orders: parseInt(fulfillment.completed_orders) || 0,
                    fulfillment_rate: fulfillment.total_orders > 0 ? (fulfillment.completed_orders / fulfillment.total_orders * 100) : 0
                }
            };

            MyLogger.success(action, { statusCount: statusDistribution.length });
            serializeSuccessResponse(res, report, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }

    async getReturnsAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/sales/reports/returns-analysis';
        try {
            const { start_date, end_date } = req.query;

            MyLogger.info(action, { start_date, end_date });

            let whereClause = '';
            let queryParams: any[] = [];

            if (start_date || end_date) {
                const conditions = [];
                if (start_date) {
                    conditions.push('DATE(sr.return_date) >= $1');
                    queryParams.push(start_date);
                }
                if (end_date) {
                    conditions.push(`DATE(sr.return_date) <= $${queryParams.length + 1}`);
                    queryParams.push(end_date);
                }
                whereClause = 'WHERE ' + conditions.join(' AND ');
            }

            const returnsQuery = `
                SELECT
                    COUNT(*) as total_returns,
                    SUM(sr.final_refund_amount) as total_refund_amount,
                    AVG(sr.final_refund_amount) as avg_refund_amount
                FROM sales_returns sr
                ${whereClause}
            `;

            const reasonsQuery = `
                SELECT
                    reason,
                    COUNT(*) as return_count,
                    SUM(final_refund_amount) as total_amount
                FROM sales_returns
                ${whereClause}
                GROUP BY reason
                ORDER BY return_count DESC
            `;

            const ratesQuery = `
                SELECT
                    COUNT(DISTINCT sr.original_order_id) as orders_with_returns,
                    COUNT(DISTINCT so.id) as total_orders,
                    (COUNT(DISTINCT sr.original_order_id)::float / NULLIF(COUNT(DISTINCT so.id), 0)) * 100 as return_rate
                FROM sales_orders so
                LEFT JOIN sales_returns sr ON so.id = sr.original_order_id
                ${whereClause.replace('sr.return_date', 'so.order_date')}
            `;

            const [returnsResult, reasonsResult, ratesResult] = await Promise.all([
                pool.query(returnsQuery, queryParams),
                pool.query(reasonsQuery, queryParams),
                pool.query(ratesQuery, queryParams)
            ]);

            const returns = returnsResult.rows[0];
            const reasons = reasonsResult.rows.map(row => ({
                reason: row.reason,
                return_count: parseInt(row.return_count),
                total_amount: parseFloat(row.total_amount)
            }));
            const rates = ratesResult.rows[0];

            const analysis = {
                summary: {
                    total_returns: parseInt(returns.total_returns) || 0,
                    total_refund_amount: parseFloat(returns.total_refund_amount) || 0,
                    avg_refund_amount: parseFloat(returns.avg_refund_amount) || 0,
                    return_rate: parseFloat(rates.return_rate) || 0
                },
                reasons_distribution: reasons
            };

            MyLogger.success(action, { returnsCount: returns.total_returns });
            serializeSuccessResponse(res, analysis, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }

    async getCustomerStatement(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/sales/reports/customer-statements/:customerId';
        try {
            const { customerId } = req.params;
            const { start_date, end_date } = req.query;

            MyLogger.info(action, { customerId, start_date, end_date });

            // Get customer info
            const customerQuery = `
                SELECT id, customer_code, name, email, phone, credit_limit, due_amount
                FROM customers
                WHERE id = $1
            `;
            const customerResult = await pool.query(customerQuery, [customerId]);
            const customer = customerResult.rows[0];

            if (!customer) {
                res.status(404).json({ error: { message: 'Customer not found' } });
                return;
            }

            // Get transaction history
            let whereClause = 'WHERE so.customer_id = $1';
            let queryParams: any[] = [customerId];

            if (start_date) {
                whereClause += ` AND DATE(so.order_date) >= $${queryParams.length + 1}`;
                queryParams.push(start_date);
            }
            if (end_date) {
                whereClause += ` AND DATE(so.order_date) <= $${queryParams.length + 1}`;
                queryParams.push(end_date);
            }

            const transactionsQuery = `
                SELECT
                    'sale' as type,
                    so.id,
                    so.order_number as reference,
                    so.order_date as date,
                    so.total_amount as amount,
                    so.payment_status,
                    so.status
                FROM sales_orders so
                ${whereClause}
                UNION ALL
                SELECT
                    'return' as type,
                    sr.id,
                    sr.return_number as reference,
                    sr.return_date as date,
                    -sr.final_refund_amount as amount,
                    'completed' as payment_status,
                    sr.return_status as status
                FROM sales_returns sr
                WHERE sr.customer_id = $1
                ${start_date ? `AND DATE(sr.return_date) >= $${queryParams.length + 1}` : ''}
                ${end_date ? `AND DATE(sr.return_date) <= $${queryParams.length + 2}` : ''}
                ORDER BY date DESC
            `;

            const transactionsResult = await pool.query(transactionsQuery, queryParams);
            const transactions = transactionsResult.rows.map(row => ({
                type: row.type,
                id: row.id,
                reference: row.reference,
                date: row.date,
                amount: parseFloat(row.amount),
                payment_status: row.payment_status,
                status: row.status
            }));

            const statement = {
                customer: customer,
                transactions: transactions,
                summary: {
                    total_transactions: transactions.length,
                    total_amount: transactions.reduce((sum, t) => sum + t.amount, 0),
                    balance_due: customer.due_amount || 0
                }
            };

            MyLogger.success(action, { customerId, transactionsCount: transactions.length });
            serializeSuccessResponse(res, statement, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: req.params.customerId, query: req.query });
            throw error;
        }
    }

    async exportReport(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'POST /api/sales/reports/export';
        try {
            const { report_type, format, filters } = req.body;

            MyLogger.info(action, { report_type, format, filters });

            // This is a placeholder for export functionality
            // In a real implementation, you would generate PDF/Excel files
            // For now, we'll return a message indicating the feature is not yet implemented

            const response = {
                message: 'Export functionality will be implemented in Phase 4',
                report_type,
                format,
                status: 'pending'
            };

            MyLogger.success(action, { report_type, format });
            serializeSuccessResponse(res, response, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { body: req.body });
            throw error;
        }
    }
}

export default new SalesReportsController();