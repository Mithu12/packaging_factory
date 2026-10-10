import { NextFunction, Request, Response } from "express";
import pool from '@/database/connection';
import { createError, serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import { SUPPLIER_DUE_SQL, supplierPayablesLateralSql } from "@/utils/supplierPayablesSql";

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
     * Due = opening balance + invoiced - paid (incl. discount) - approved returns;
     * see supplierPayablesLateralSql. Matches the Supplier Ledger closing balance.
     */
    async getSupplierDueReport(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/inventory/reports/supplier-due';
        try {
            const { supplier_id, as_of_date, only_with_dues } = req.query;
            MyLogger.info(action, { supplier_id, as_of_date, only_with_dues });

            if (as_of_date && !(typeof as_of_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(as_of_date))) {
                throw createError('as_of_date must be in YYYY-MM-DD format', 400);
            }

            const queryParams: any[] = [];
            let asOfParam: string | undefined;
            if (as_of_date) {
                queryParams.push(as_of_date);
                asOfParam = `$${queryParams.length}`;
            }

            const supplierConditions = [`s.status = 'active'`];
            if (supplier_id) {
                supplierConditions.push(`s.id = $${queryParams.length + 1}`);
                queryParams.push(supplier_id);
            }
            if (only_with_dues === 'true') {
                supplierConditions.push(`${SUPPLIER_DUE_SQL} > 0`);
            }

            const query = `
                SELECT
                    s.id,
                    s.supplier_code,
                    s.name,
                    s.contact_person,
                    s.phone,
                    COALESCE(s.opening_balance, 0) as opening_balance,
                    inv.total_invoiced,
                    pay.total_paid,
                    ret.total_returned,
                    inv.invoice_outstanding,
                    ${SUPPLIER_DUE_SQL} as total_due,
                    inv.invoice_count,
                    inv.overdue_count
                FROM suppliers s
                ${supplierPayablesLateralSql(asOfParam)}
                WHERE ${supplierConditions.join(' AND ')}
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
                total_returned: parseFloat(row.total_returned) || 0,
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
                    total_returned: acc.total_returned + s.total_returned,
                    invoice_outstanding: acc.invoice_outstanding + s.invoice_outstanding,
                    total_due: acc.total_due + s.total_due,
                    supplier_count: acc.supplier_count + 1,
                    suppliers_with_dues: acc.suppliers_with_dues + (s.total_due > 0 ? 1 : 0),
                }),
                { opening_balance: 0, total_invoiced: 0, total_paid: 0, total_returned: 0, invoice_outstanding: 0, total_due: 0, supplier_count: 0, suppliers_with_dues: 0 }
            );

            MyLogger.success(action, { suppliersCount: suppliers.length, totalDue: totals.total_due });
            serializeSuccessResponse(res, { suppliers, totals }, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }
    /**
     * Supplier Ledger — chronological statement of account for one supplier with a
     * running payable balance. Credits (increase payable): purchase invoices.
     * Debits (decrease payable): approved payments, the discount taken on them,
     * and approved purchase returns (debit notes).
     *
     * The opening balance comes from suppliers.opening_balance; the matching
     * OB-INV-* invoice created at onboarding is skipped so it isn't counted twice.
     */
    async getSupplierLedger(req: Request, res: Response, next: NextFunction): Promise<void> {
        let action = 'GET /api/inventory/reports/supplier-ledger';
        try {
            const { supplier_id, start_date, end_date } = req.query;
            MyLogger.info(action, { supplier_id, start_date, end_date });

            const supplierId = Number(supplier_id);
            if (!Number.isInteger(supplierId) || supplierId <= 0) {
                throw createError('supplier_id is required', 400);
            }
            const isDate = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
            if ((start_date && !isDate(start_date)) || (end_date && !isDate(end_date))) {
                throw createError('Dates must be in YYYY-MM-DD format', 400);
            }
            const startDate = isDate(start_date) ? start_date : null;
            const endDate = isDate(end_date) ? end_date : null;

            const supplierResult = await pool.query(
                `SELECT id, supplier_code, name, contact_person, phone, email, address,
                        COALESCE(opening_balance, 0) as opening_balance
                 FROM suppliers WHERE id = $1`,
                [supplierId]
            );
            if (supplierResult.rows.length === 0) {
                throw createError('Supplier not found', 404);
            }
            const supplierRow = supplierResult.rows[0];

            // $1 = supplier id. Ordered within a day by created_at so a payment
            // never lands before the invoice it settles.
            const entriesCte = `
                WITH entries AS (
                    SELECT i.invoice_date AS entry_date, 'invoice' AS entry_type, i.id AS source_id,
                           i.invoice_number AS reference,
                           CASE WHEN po.po_number IS NOT NULL THEN 'Purchase invoice (PO ' || po.po_number || ')'
                                ELSE 'Purchase invoice' END AS description,
                           0::numeric AS debit, i.total_amount AS credit, i.created_at
                    FROM invoices i
                    LEFT JOIN purchase_orders po ON po.id = i.purchase_order_id
                    WHERE i.supplier_id = $1
                      AND i.status <> 'cancelled'
                      AND i.invoice_number NOT LIKE 'OB-INV-%'
                    UNION ALL
                    SELECT p.payment_date, 'payment', p.id, p.payment_number,
                           'Payment - ' || REPLACE(p.payment_method, '_', ' ')
                             || COALESCE(' (' || NULLIF(p.reference, '') || ')', ''),
                           p.amount, 0::numeric, p.created_at
                    FROM payments p
                    WHERE p.supplier_id = $1
                      AND p.approval_status = 'approved'
                      AND p.status NOT IN ('cancelled', 'failed')
                    UNION ALL
                    SELECT p.payment_date, 'discount', p.id, p.payment_number,
                           'Discount received',
                           p.discount_amount, 0::numeric, p.created_at
                    FROM payments p
                    WHERE p.supplier_id = $1
                      AND p.approval_status = 'approved'
                      AND p.status NOT IN ('cancelled', 'failed')
                      AND p.discount_amount > 0
                    UNION ALL
                    SELECT pr.return_date, 'return', pr.id, pr.return_number,
                           'Purchase return',
                           pr.total_amount, 0::numeric, pr.created_at
                    FROM purchase_returns pr
                    WHERE pr.supplier_id = $1
                      AND pr.status = 'approved'
                )
            `;

            // Activity before the period rolls into the opening balance.
            let priorNet = 0;
            if (startDate) {
                const priorResult = await pool.query(
                    `${entriesCte}
                     SELECT COALESCE(SUM(credit - debit), 0) AS net FROM entries WHERE entry_date < $2`,
                    [supplierId, startDate]
                );
                priorNet = parseFloat(priorResult.rows[0].net) || 0;
            }

            const rangeParams: (number | string)[] = [supplierId];
            const rangeConditions: string[] = [];
            if (startDate) {
                rangeParams.push(startDate);
                rangeConditions.push(`entry_date >= $${rangeParams.length}`);
            }
            if (endDate) {
                rangeParams.push(endDate);
                rangeConditions.push(`entry_date <= $${rangeParams.length}`);
            }
            const entriesResult = await pool.query(
                `${entriesCte}
                 SELECT TO_CHAR(entry_date, 'YYYY-MM-DD') AS entry_date, entry_type, source_id,
                        reference, description, debit, credit
                 FROM entries
                 ${rangeConditions.length ? `WHERE ${rangeConditions.join(' AND ')}` : ''}
                 ORDER BY entry_date ASC, created_at ASC, entry_type ASC`,
                rangeParams
            );

            // Money is NUMERIC(…,2) in the DB; round running sums so float drift doesn't leak out.
            const round2 = (n: number) => Math.round(n * 100) / 100;
            const openingBalance = round2((parseFloat(supplierRow.opening_balance) || 0) + priorNet);
            let balance = openingBalance;
            let totalDebit = 0;
            let totalCredit = 0;
            const entries = entriesResult.rows.map(row => {
                const debit = parseFloat(row.debit) || 0;
                const credit = parseFloat(row.credit) || 0;
                balance = round2(balance + credit - debit);
                totalDebit = round2(totalDebit + debit);
                totalCredit = round2(totalCredit + credit);
                return {
                    entry_date: row.entry_date,
                    entry_type: row.entry_type as 'invoice' | 'payment' | 'discount' | 'return',
                    source_id: Number(row.source_id),
                    reference: row.reference,
                    description: row.description,
                    debit,
                    credit,
                    balance,
                };
            });

            const ledger = {
                supplier: {
                    id: Number(supplierRow.id),
                    supplier_code: supplierRow.supplier_code,
                    name: supplierRow.name,
                    contact_person: supplierRow.contact_person,
                    phone: supplierRow.phone,
                    email: supplierRow.email,
                    address: supplierRow.address,
                },
                period: { start_date: startDate, end_date: endDate },
                opening_balance: openingBalance,
                entries,
                totals: {
                    total_debit: totalDebit,
                    total_credit: totalCredit,
                    closing_balance: balance,
                },
            };

            MyLogger.success(action, { supplierId, entriesCount: entries.length, closingBalance: balance });
            serializeSuccessResponse(res, ledger, 'SUCCESS');
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            throw error;
        }
    }
}

export default new PurchaseReportsController();
