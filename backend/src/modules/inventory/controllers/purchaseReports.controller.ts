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

    /**
     * Total Supplier Due Report — outstanding payables aggregated per supplier.
     * Due = supplier opening balance + sum of outstanding on non-cancelled invoices.
     */
    async getSupplierDueReport(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/inventory/reports/supplier-due';
        try {
            const { supplier_id, as_of_date, only_with_dues } = req.query;
            MyLogger.info(action, { supplier_id, as_of_date, only_with_dues });

            const queryParams: any[] = [];
            // Invoice-side conditions live inside the LEFT JOIN so suppliers with
            // no matching invoices still appear (with their opening balance).
            const invoiceConditions = [`i.status != 'cancelled'`];
            if (as_of_date) {
                invoiceConditions.push(`DATE(i.invoice_date) <= $${queryParams.length + 1}`);
                queryParams.push(as_of_date);
            }

            const supplierConditions = [`s.status = 'active'`];
            if (supplier_id) {
                supplierConditions.push(`s.id = $${queryParams.length + 1}`);
                queryParams.push(supplier_id);
            }

            const havingClause = only_with_dues === 'true'
                ? `HAVING COALESCE(s.opening_balance, 0) + COALESCE(SUM(i.outstanding_amount), 0) > 0`
                : '';

            const query = `
                SELECT
                    s.id,
                    s.supplier_code,
                    s.name,
                    s.contact_person,
                    s.phone,
                    COALESCE(s.opening_balance, 0) as opening_balance,
                    COALESCE(SUM(i.total_amount), 0) as total_invoiced,
                    COALESCE(SUM(i.paid_amount), 0) as total_paid,
                    COALESCE(SUM(i.outstanding_amount), 0) as invoice_outstanding,
                    COALESCE(s.opening_balance, 0) + COALESCE(SUM(i.outstanding_amount), 0) as total_due,
                    COUNT(i.id) as invoice_count,
                    COUNT(i.id) FILTER (WHERE i.due_date < CURRENT_DATE AND i.status <> 'paid') as overdue_count
                FROM suppliers s
                LEFT JOIN invoices i ON s.id = i.supplier_id AND ${invoiceConditions.join(' AND ')}
                WHERE ${supplierConditions.join(' AND ')}
                GROUP BY s.id, s.supplier_code, s.name, s.contact_person, s.phone, s.opening_balance
                ${havingClause}
                ORDER BY total_due DESC, s.name ASC
            `;

            const result = await pool.query(query, queryParams);
            const suppliers = result.rows.map(row => ({
                id: row.id,
                supplier_code: row.supplier_code,
                name: row.name,
                contact_person: row.contact_person,
                phone: row.phone,
                opening_balance: parseFloat(row.opening_balance) || 0,
                total_invoiced: parseFloat(row.total_invoiced) || 0,
                total_paid: parseFloat(row.total_paid) || 0,
                invoice_outstanding: parseFloat(row.invoice_outstanding) || 0,
                total_due: parseFloat(row.total_due) || 0,
                invoice_count: parseInt(row.invoice_count) || 0,
                overdue_count: parseInt(row.overdue_count) || 0,
            }));

            const totals = suppliers.reduce(
                (acc, s) => ({
                    opening_balance: acc.opening_balance + s.opening_balance,
                    total_invoiced: acc.total_invoiced + s.total_invoiced,
                    total_paid: acc.total_paid + s.total_paid,
                    invoice_outstanding: acc.invoice_outstanding + s.invoice_outstanding,
                    total_due: acc.total_due + s.total_due,
                    supplier_count: acc.supplier_count + 1,
                    suppliers_with_dues: acc.suppliers_with_dues + (s.total_due > 0 ? 1 : 0),
                }),
                { opening_balance: 0, total_invoiced: 0, total_paid: 0, invoice_outstanding: 0, total_due: 0, supplier_count: 0, suppliers_with_dues: 0 }
            );

            MyLogger.success(action, { suppliersCount: suppliers.length, totalDue: totals.total_due });
            serializeSuccessResponse(res, { suppliers, totals }, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }
}

export default new PurchaseReportsController();
