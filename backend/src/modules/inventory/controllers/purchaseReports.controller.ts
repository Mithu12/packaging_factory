import { NextFunction, Request, Response } from "express";
import pool from '@/database/connection';
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";

class PurchaseReportsController {
    async getPurchaseSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/inventory/reports/purchase-summary';
        try {
            const { start_date, end_date } = req.query;
            MyLogger.info(action, { start_date, end_date });

            let whereClause = '';
            let queryParams: any[] = [];
            const conditions = [];

            if (start_date) {
                conditions.push(`DATE(po.order_date) >= $${queryParams.length + 1}`);
                queryParams.push(start_date);
            }
            if (end_date) {
                conditions.push(`DATE(po.order_date) <= $${queryParams.length + 1}`);
                queryParams.push(end_date);
            }

            if (conditions.length > 0) {
                whereClause = 'WHERE ' + conditions.join(' AND ');
            }

            const query = `
                SELECT
                    COUNT(*) as total_orders,
                    COALESCE(SUM(po.total_amount), 0) as total_value,
                    AVG(po.total_amount) as avg_order_value,
                    COUNT(DISTINCT po.supplier_id) as unique_suppliers,
                    SUM(CASE WHEN po.status = 'received' THEN 1 ELSE 0 END) as received_orders,
                    SUM(CASE WHEN po.status = 'pending' THEN 1 ELSE 0 END) as pending_orders,
                    SUM(CASE WHEN po.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders
                FROM purchase_orders po
                ${whereClause}
            `;

            const result = await pool.query(query, queryParams);
            const data = result.rows[0];

            const summary = {
                total_orders: parseInt(data.total_orders) || 0,
                total_value: parseFloat(data.total_value) || 0,
                avg_order_value: parseFloat(data.avg_order_value) || 0,
                unique_suppliers: parseInt(data.unique_suppliers) || 0,
                received_orders: parseInt(data.received_orders) || 0,
                pending_orders: parseInt(data.pending_orders) || 0,
                cancelled_orders: parseInt(data.cancelled_orders) || 0,
                received_rate: data.total_orders > 0 ? ((parseInt(data.received_orders) || 0) / parseInt(data.total_orders) * 100) : 0
            };

            MyLogger.success(action, { summary });
            serializeSuccessResponse(res, summary, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }

    async getSupplierPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/inventory/reports/supplier-performance';
        try {
            const { limit = 10, start_date, end_date } = req.query;
            MyLogger.info(action, { limit, start_date, end_date });

            let whereClause = '';
            let queryParams: any[] = [];
            const conditions = [];

            if (start_date) {
                conditions.push(`DATE(po.order_date) >= $${queryParams.length + 1}`);
                queryParams.push(start_date);
            }
            if (end_date) {
                conditions.push(`DATE(po.order_date) <= $${queryParams.length + 1}`);
                queryParams.push(end_date);
            }

            if (conditions.length > 0) {
                whereClause = 'AND ' + conditions.join(' AND ');
            }

            const query = `
                SELECT
                    s.id,
                    s.supplier_code,
                    s.name,
                    s.contact_person,
                    s.phone,
                    COUNT(po.id) as total_orders,
                    COALESCE(SUM(po.total_amount), 0) as total_purchase_value,
                    COALESCE(AVG(po.total_amount), 0) as avg_purchase_value,
                    MAX(po.order_date) as last_purchase_date
                FROM suppliers s
                LEFT JOIN purchase_orders po ON s.id = po.supplier_id ${whereClause}
                WHERE s.status = 'active'
                GROUP BY s.id, s.supplier_code, s.name, s.contact_person, s.phone
                ORDER BY total_purchase_value DESC NULLS LAST
                LIMIT $${queryParams.length + 1}
            `;

            queryParams.push(limit);

            const result = await pool.query(query, queryParams);
            const suppliers = result.rows.map(row => ({
                id: row.id,
                supplier_code: row.supplier_code,
                name: row.name,
                contact_person: row.contact_person,
                phone: row.phone,
                total_orders: parseInt(row.total_orders) || 0,
                total_purchase_value: parseFloat(row.total_purchase_value) || 0,
                avg_purchase_value: parseFloat(row.avg_purchase_value) || 0,
                last_purchase_date: row.last_purchase_date
            }));

            MyLogger.success(action, { suppliersCount: suppliers.length });
            serializeSuccessResponse(res, suppliers, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }

    async getPurchasePayments(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/inventory/reports/purchase-payments';
        try {
            const { start_date, end_date } = req.query;
            MyLogger.info(action, { start_date, end_date });

            let whereClause = '';
            let queryParams: any[] = [];
            const conditions = [];

            if (start_date) {
                conditions.push(`DATE(i.invoice_date) >= $${queryParams.length + 1}`);
                queryParams.push(start_date);
            }
            if (end_date) {
                conditions.push(`DATE(i.invoice_date) <= $${queryParams.length + 1}`);
                queryParams.push(end_date);
            }

            if (conditions.length > 0) {
                whereClause = 'WHERE ' + conditions.join(' AND ');
            }

            const query = `
                SELECT
                    status,
                    COUNT(*) as invoice_count,
                    COALESCE(SUM(total_amount), 0) as total_amount,
                    COALESCE(SUM(paid_amount), 0) as paid_amount,
                    COALESCE(SUM(outstanding_amount), 0) as outstanding_amount
                FROM invoices i
                ${whereClause}
                GROUP BY status
                ORDER BY total_amount DESC
            `;

            const result = await pool.query(query, queryParams);
            const data = result.rows;

            const summary = {
                status_distribution: data.map(row => ({
                    status: row.status,
                    count: parseInt(row.invoice_count),
                    total_amount: parseFloat(row.total_amount),
                    paid_amount: parseFloat(row.paid_amount),
                    outstanding_amount: parseFloat(row.outstanding_amount)
                })),
                totals: {
                    total_invoices: data.reduce((acc, row) => acc + parseInt(row.invoice_count), 0),
                    total_amount: data.reduce((acc, row) => acc + parseFloat(row.total_amount), 0),
                    total_paid: data.reduce((acc, row) => acc + parseFloat(row.paid_amount), 0),
                    total_outstanding: data.reduce((acc, row) => acc + parseFloat(row.outstanding_amount), 0)
                }
            };

            MyLogger.success(action, { summary });
            serializeSuccessResponse(res, summary, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }
}

export default new PurchaseReportsController();
