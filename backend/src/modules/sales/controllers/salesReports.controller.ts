import { NextFunction, Request, Response } from "express";
import pool from "@/database/connection";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";

class SalesReportsController {
    async getSalesSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/sales/reports/sales-summary";
        try {
            const { start_date, end_date } = req.query;
            MyLogger.info(action, { start_date, end_date });

            const conditions: string[] = [];
            const queryParams: any[] = [];

            if (start_date) {
                conditions.push(`DATE(fco.order_date) >= $${queryParams.length + 1}`);
                queryParams.push(start_date);
            }
            if (end_date) {
                conditions.push(`DATE(fco.order_date) <= $${queryParams.length + 1}`);
                queryParams.push(end_date);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

            const query = `
                SELECT
                    COUNT(*) as total_orders,
                    COALESCE(SUM(fco.total_value), 0) as total_revenue,
                    COALESCE(AVG(fco.total_value), 0) as avg_order_value,
                    COUNT(DISTINCT fco.factory_customer_id) as unique_customers,
                    SUM(CASE WHEN fco.status IN ('delivered','completed') THEN 1 ELSE 0 END) as completed_orders,
                    SUM(CASE WHEN fsi.paid_amount >= fsi.total_amount THEN 1 ELSE 0 END) as paid_orders
                FROM factory_customer_orders fco
                LEFT JOIN factory_sales_invoices fsi ON fsi.customer_order_id = fco.id
                ${whereClause}
            `;

            const result = await pool.query(query, queryParams);
            const s = result.rows[0];

            const totalOrders = parseInt(s.total_orders) || 0;
            const paidOrders = parseInt(s.paid_orders) || 0;
            const completedOrders = parseInt(s.completed_orders) || 0;
            const summary = {
                total_orders: totalOrders,
                total_revenue: parseFloat(s.total_revenue) || 0,
                avg_order_value: parseFloat(s.avg_order_value) || 0,
                unique_customers: parseInt(s.unique_customers) || 0,
                paid_orders: paidOrders,
                completed_orders: completedOrders,
                payment_rate: totalOrders > 0 ? (paidOrders / totalOrders * 100) : 0,
                completion_rate: totalOrders > 0 ? (completedOrders / totalOrders * 100) : 0,
            };

            MyLogger.success(action, { summary });
            serializeSuccessResponse(res, summary, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error);
            next(error);
        }
    }

    async getCustomerPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/sales/reports/customer-performance";
        try {
            const { start_date, end_date, limit = 20 } = req.query;
            MyLogger.info(action, { start_date, end_date, limit });

            const conditions: string[] = [];
            const queryParams: any[] = [];

            if (start_date) {
                conditions.push(`DATE(fco.order_date) >= $${queryParams.length + 1}`);
                queryParams.push(start_date);
            }
            if (end_date) {
                conditions.push(`DATE(fco.order_date) <= $${queryParams.length + 1}`);
                queryParams.push(end_date);
            }

            const dateFilter = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

            const query = `
                SELECT
                    fc.id,
                    fc.name,
                    fc.email,
                    fc.phone,
                    fc.company,
                    COUNT(fco.id) as total_orders,
                    COALESCE(SUM(fco.total_value), 0) as total_revenue,
                    COALESCE(AVG(fco.total_value), 0) as avg_order_value,
                    MAX(fco.order_date) as last_order_date
                FROM factory_customers fc
                LEFT JOIN factory_customer_orders fco ON fc.id = fco.factory_customer_id ${dateFilter}
                WHERE fc.is_active = true
                GROUP BY fc.id, fc.name, fc.email, fc.phone, fc.company
                ORDER BY total_revenue DESC
                LIMIT $${queryParams.length + 1}
            `;

            queryParams.push(limit);
            const result = await pool.query(query, queryParams);
            const customers = result.rows.map((row) => ({
                id: row.id,
                customer_code: row.company || row.name,
                name: row.name,
                email: row.email,
                phone: row.phone,
                total_orders: parseInt(row.total_orders) || 0,
                total_revenue: parseFloat(row.total_revenue) || 0,
                avg_order_value: parseFloat(row.avg_order_value) || 0,
                last_order_date: row.last_order_date,
            }));

            MyLogger.success(action, { count: customers.length });
            serializeSuccessResponse(res, customers, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error);
            next(error);
        }
    }

    async getPaymentAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/sales/reports/payment-analysis";
        try {
            const { start_date, end_date } = req.query;
            MyLogger.info(action, { start_date, end_date });

            const conditions: string[] = [];
            const queryParams: any[] = [];

            if (start_date) {
                conditions.push(`DATE(fco.order_date) >= $${queryParams.length + 1}`);
                queryParams.push(start_date);
            }
            if (end_date) {
                conditions.push(`DATE(fco.order_date) <= $${queryParams.length + 1}`);
                queryParams.push(end_date);
            }

            const dateFilter = conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : "";

            const methodsQuery = `
                SELECT
                    COALESCE(fco.payment_terms, 'net_30') as method,
                    COUNT(*) as order_count,
                    COALESCE(SUM(fco.total_value), 0) as total_amount
                FROM factory_customer_orders fco
                WHERE 1=1 ${dateFilter}
                GROUP BY fco.payment_terms
                ORDER BY total_amount DESC
            `;

            const invoiceConditions: string[] = [];
            const invoiceParams: any[] = [];
            if (start_date) {
                invoiceConditions.push(`DATE(fco.order_date) >= $${invoiceParams.length + 1}`);
                invoiceParams.push(start_date);
            }
            if (end_date) {
                invoiceConditions.push(`DATE(fco.order_date) <= $${invoiceParams.length + 1}`);
                invoiceParams.push(end_date);
            }
            const invoiceDateFilter = invoiceConditions.length > 0 ? `AND ${invoiceConditions.join(" AND ")}` : "";

            const outstandingQuery = `
                SELECT
                    COALESCE(SUM(fsi.outstanding_amount), 0) as total_outstanding,
                    COUNT(*) FILTER (WHERE fsi.outstanding_amount > 0) as outstanding_orders
                FROM factory_sales_invoices fsi
                JOIN factory_customer_orders fco ON fsi.customer_order_id = fco.id
                WHERE 1=1 ${invoiceDateFilter}
            `;

            const [methodsResult, outstandingResult] = await Promise.all([
                pool.query(methodsQuery, queryParams),
                pool.query(outstandingQuery, invoiceParams),
            ]);

            const payment_methods = methodsResult.rows.map((row) => ({
                method: row.method,
                order_count: parseInt(row.order_count) || 0,
                total_amount: parseFloat(row.total_amount) || 0,
            }));

            const o = outstandingResult.rows[0];
            const analysis = {
                payment_methods,
                outstanding_payments: {
                    total_outstanding: parseFloat(o.total_outstanding) || 0,
                    outstanding_orders: parseInt(o.outstanding_orders) || 0,
                },
            };

            MyLogger.success(action, { methodsCount: payment_methods.length });
            serializeSuccessResponse(res, analysis, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error);
            next(error);
        }
    }

    async getOrderFulfillment(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/sales/reports/order-fulfillment";
        try {
            const { start_date, end_date } = req.query;
            MyLogger.info(action, { start_date, end_date });

            const conditions: string[] = [];
            const queryParams: any[] = [];

            if (start_date) {
                conditions.push(`DATE(fco.order_date) >= $${queryParams.length + 1}`);
                queryParams.push(start_date);
            }
            if (end_date) {
                conditions.push(`DATE(fco.order_date) <= $${queryParams.length + 1}`);
                queryParams.push(end_date);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

            const statusQuery = `
                SELECT
                    fco.status,
                    COUNT(*) as order_count,
                    COALESCE(SUM(fco.total_value), 0) as total_amount
                FROM factory_customer_orders fco
                ${whereClause}
                GROUP BY fco.status
                ORDER BY order_count DESC
            `;

            const metricsQuery = `
                SELECT
                    COUNT(*) as total_orders,
                    SUM(CASE WHEN fco.status IN ('delivered','completed') THEN 1 ELSE 0 END) as completed_orders,
                    COALESCE(AVG(CASE WHEN fco.status IN ('delivered','completed')
                        THEN EXTRACT(EPOCH FROM (fco.updated_at - fco.order_date)) / 86400
                    END), 0) as avg_fulfillment_days
                FROM factory_customer_orders fco
                ${whereClause}
            `;

            const [statusResult, metricsResult] = await Promise.all([
                pool.query(statusQuery, queryParams),
                pool.query(metricsQuery, queryParams),
            ]);

            const status_distribution = statusResult.rows.map((row) => ({
                status: row.status,
                order_count: parseInt(row.order_count) || 0,
                total_amount: parseFloat(row.total_amount) || 0,
            }));

            const m = metricsResult.rows[0];
            const totalOrders = parseInt(m.total_orders) || 0;
            const completedOrders = parseInt(m.completed_orders) || 0;

            const result = {
                status_distribution,
                fulfillment_metrics: {
                    avg_fulfillment_days: parseFloat(m.avg_fulfillment_days) || 0,
                    total_orders: totalOrders,
                    completed_orders: completedOrders,
                    fulfillment_rate: totalOrders > 0 ? (completedOrders / totalOrders * 100) : 0,
                },
            };

            MyLogger.success(action, { totalOrders });
            serializeSuccessResponse(res, result, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error);
            next(error);
        }
    }

    async getReturnsAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/sales/reports/returns-analysis";
        try {
            MyLogger.info(action, {});

            const result = {
                summary: {
                    total_returns: 0,
                    total_refund_amount: 0,
                    avg_refund_amount: 0,
                    return_rate: 0,
                },
                reasons_distribution: [] as Array<{ reason: string; return_count: number; total_amount: number }>,
            };

            serializeSuccessResponse(res, result, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error);
            next(error);
        }
    }

    async getCustomerDueReport(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/sales/reports/customer-due";
        try {
            const { customer_id, only_with_dues } = req.query;
            MyLogger.info(action, { customer_id, only_with_dues });

            const conditions: string[] = ["fc.is_active = true"];
            const queryParams: any[] = [];

            if (customer_id) {
                conditions.push(`fc.id = $${queryParams.length + 1}`);
                queryParams.push(customer_id);
            }

            const whereClause = `WHERE ${conditions.join(" AND ")}`;

            const havingClause = only_with_dues === "true"
                ? `HAVING COALESCE(SUM(fco.total_value), 0) - COALESCE(SUM(COALESCE(fsi_paid.paid, 0)), 0) > 0`
                : "";

            const query = `
                SELECT
                    fc.id,
                    COALESCE(fc.company, fc.name) as customer_code,
                    fc.name,
                    fc.phone,
                    fc.email,
                    COALESCE(fc.opening_balance, 0) as opening_balance,
                    COALESCE(fc.total_order_value, 0) as total_purchased,
                    COALESCE(fc.total_paid_amount, 0) as total_paid,
                    COALESCE(fc.total_outstanding_amount, 0) as total_due,
                    COALESCE(fc.order_count, 0) as order_count,
                    (SELECT COUNT(*) FROM factory_customer_orders fco2
                     WHERE fco2.factory_customer_id = fc.id AND fco2.status NOT IN ('cancelled','draft')
                    ) as due_order_count,
                    (SELECT MAX(fco3.order_date) FROM factory_customer_orders fco3
                     WHERE fco3.factory_customer_id = fc.id
                    ) as last_order_date
                FROM factory_customers fc
                ${whereClause}
                ORDER BY COALESCE(fc.total_outstanding_amount, 0) DESC, fc.name ASC
            `;

            const result = await pool.query(query, queryParams);
            const customers = result.rows.map((row) => ({
                id: row.id,
                customer_code: row.customer_code,
                name: row.name,
                phone: row.phone,
                email: row.email,
                opening_balance: parseFloat(row.opening_balance) || 0,
                total_purchased: parseFloat(row.total_purchased) || 0,
                total_paid: parseFloat(row.total_paid) || 0,
                total_due: parseFloat(row.total_due) || 0,
                order_count: parseInt(row.order_count) || 0,
                due_order_count: parseInt(row.due_order_count) || 0,
                last_order_date: row.last_order_date,
            }));

            let filteredCustomers = customers;
            if (havingClause) {
                filteredCustomers = customers.filter(c => c.total_due > 0);
            }

            const totals = filteredCustomers.reduce(
                (acc, c) => ({
                    total_purchased: acc.total_purchased + c.total_purchased,
                    total_paid: acc.total_paid + c.total_paid,
                    total_due: acc.total_due + c.total_due,
                    customer_count: acc.customer_count + 1,
                    customers_with_dues: acc.customers_with_dues + (c.total_due > 0 ? 1 : 0),
                }),
                { total_purchased: 0, total_paid: 0, total_due: 0, customer_count: 0, customers_with_dues: 0 }
            );

            MyLogger.success(action, { customerCount: filteredCustomers.length, totalDue: totals.total_due });
            serializeSuccessResponse(res, { customers: filteredCustomers, totals }, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error);
            next(error);
        }
    }
}

export default new SalesReportsController();
