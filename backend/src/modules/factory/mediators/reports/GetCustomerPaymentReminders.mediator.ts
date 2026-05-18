import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";

export interface CustomerPaymentReminderRow {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    currency: string;
    opening_balance: number;
    total_outstanding_amount: number;
    open_invoice_count: number;
    not_yet_due: number;
    bucket_0_30: number;
    bucket_31_60: number;
    bucket_61_90: number;
    bucket_90_plus: number;
    max_days_overdue: number;
}

export interface CustomerPaymentReminderSummary {
    customers_count: number;
    total_outstanding: number;
    total_over_60: number;
    total_over_90: number;
}

export interface CustomerPaymentReminderListResponse {
    rows: CustomerPaymentReminderRow[];
    summary: CustomerPaymentReminderSummary;
}

export interface CustomerPaymentReminderListParams {
    search?: string;
}

export interface CustomerPaymentReminderInvoice {
    invoice_id: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    total_amount: number;
    paid_amount: number;
    outstanding_amount: number;
    status: string;
    days_overdue: number;
}

export interface CustomerPaymentReminderDetail {
    customer: {
        id: string;
        name: string;
        company: string | null;
        email: string | null;
        phone: string | null;
        address: Record<string, any> | null;
        vat_number: string | null;
        payment_terms: string | null;
        credit_limit: number | null;
        opening_balance: number;
        total_outstanding_amount: number;
        currency: string;
    };
    invoices: CustomerPaymentReminderInvoice[];
    aging: {
        not_yet_due: number;
        bucket_0_30: number;
        bucket_31_60: number;
        bucket_61_90: number;
        bucket_90_plus: number;
        total_outstanding: number;
        max_days_overdue: number;
    };
    latest_payment_date: string | null;
}

export class GetCustomerPaymentRemindersMediator {
    static async getCustomerSummary(
        params: CustomerPaymentReminderListParams,
        userId?: number
    ): Promise<CustomerPaymentReminderListResponse> {
        const action = "GetCustomerPaymentRemindersMediator.getCustomerSummary";
        MyLogger.info(action, { params, userId });

        const { search } = params;
        const userFactoryIds = await getUserAccessibleFactoryIds(userId);

        const queryParams: any[] = [];
        let p = 1;

        let factoryClause = "";
        if (userFactoryIds !== null) {
            queryParams.push(userFactoryIds);
            // si.factory_id may be NULL — keep those rows out for non-admins
            factoryClause = `AND si.factory_id = ANY($${p++}::bigint[])`;
        }

        let searchClause = "";
        if (search && search.trim() !== "") {
            queryParams.push(`%${search.trim()}%`);
            searchClause = `AND (fc.name ILIKE $${p} OR fc.company ILIKE $${p} OR fc.email ILIKE $${p} OR fc.phone ILIKE $${p})`;
            p++;
        }

        const sql = `
            WITH invoice_agg AS (
                SELECT
                    si.factory_customer_id,
                    SUM(si.outstanding_amount) FILTER (WHERE CURRENT_DATE - si.due_date <= 0)                  AS not_yet_due,
                    SUM(si.outstanding_amount) FILTER (WHERE CURRENT_DATE - si.due_date BETWEEN 1  AND 30)     AS bucket_0_30,
                    SUM(si.outstanding_amount) FILTER (WHERE CURRENT_DATE - si.due_date BETWEEN 31 AND 60)     AS bucket_31_60,
                    SUM(si.outstanding_amount) FILTER (WHERE CURRENT_DATE - si.due_date BETWEEN 61 AND 90)     AS bucket_61_90,
                    SUM(si.outstanding_amount) FILTER (WHERE CURRENT_DATE - si.due_date > 90)                  AS bucket_90_plus,
                    MAX(CURRENT_DATE - si.due_date)                                                            AS max_days_overdue,
                    COUNT(*)                                                                                    AS open_invoice_count,
                    SUM(si.outstanding_amount)                                                                 AS invoiced_outstanding
                FROM factory_sales_invoices si
                WHERE si.status <> 'cancelled'
                  AND si.outstanding_amount > 0
                  ${factoryClause}
                GROUP BY si.factory_customer_id
            ),
            latest_currency AS (
                SELECT DISTINCT ON (co.factory_customer_id)
                    co.factory_customer_id,
                    co.currency
                FROM factory_customer_orders co
                ORDER BY co.factory_customer_id, co.order_date DESC
            )
            SELECT
                fc.id,
                fc.name,
                fc.company,
                fc.email,
                fc.phone,
                COALESCE(lc.currency, 'USD')                  AS currency,
                COALESCE(fc.opening_balance, 0)               AS opening_balance,
                COALESCE(fc.total_outstanding_amount, 0)      AS total_outstanding_amount,
                COALESCE(ia.open_invoice_count, 0)            AS open_invoice_count,
                COALESCE(ia.not_yet_due, 0)                   AS not_yet_due,
                COALESCE(ia.bucket_0_30, 0)                   AS bucket_0_30,
                COALESCE(ia.bucket_31_60, 0)                  AS bucket_31_60,
                COALESCE(ia.bucket_61_90, 0)                  AS bucket_61_90,
                COALESCE(ia.bucket_90_plus, 0)                AS bucket_90_plus,
                COALESCE(ia.max_days_overdue, 0)              AS max_days_overdue
            FROM factory_customers fc
            LEFT JOIN invoice_agg ia ON ia.factory_customer_id = fc.id
            LEFT JOIN latest_currency lc ON lc.factory_customer_id = fc.id
            WHERE (
                COALESCE(fc.total_outstanding_amount, 0) > 0
                OR COALESCE(fc.opening_balance, 0) > 0
                OR COALESCE(ia.invoiced_outstanding, 0) > 0
            )
            ${searchClause}
            ORDER BY COALESCE(ia.max_days_overdue, 0) DESC, fc.total_outstanding_amount DESC, fc.name ASC
        `;

        const result = await pool.query(sql, queryParams);

        const rows: CustomerPaymentReminderRow[] = result.rows.map((r: any) => ({
            id: String(r.id),
            name: r.name,
            company: r.company,
            email: r.email,
            phone: r.phone,
            currency: r.currency || "USD",
            opening_balance: Number(r.opening_balance) || 0,
            total_outstanding_amount: Number(r.total_outstanding_amount) || 0,
            open_invoice_count: Number(r.open_invoice_count) || 0,
            not_yet_due: Number(r.not_yet_due) || 0,
            bucket_0_30: Number(r.bucket_0_30) || 0,
            bucket_31_60: Number(r.bucket_31_60) || 0,
            bucket_61_90: Number(r.bucket_61_90) || 0,
            bucket_90_plus: Number(r.bucket_90_plus) || 0,
            max_days_overdue: Number(r.max_days_overdue) || 0,
        }));

        const summary: CustomerPaymentReminderSummary = {
            customers_count: rows.length,
            total_outstanding: rows.reduce((acc, r) => acc + r.total_outstanding_amount, 0),
            total_over_60: rows.reduce((acc, r) => acc + r.bucket_61_90 + r.bucket_90_plus, 0),
            total_over_90: rows.reduce((acc, r) => acc + r.bucket_90_plus, 0),
        };

        MyLogger.success(action, { rowCount: rows.length });
        return { rows, summary };
    }

    static async getCustomerDetail(
        customerId: string,
        userId?: number
    ): Promise<CustomerPaymentReminderDetail> {
        const action = "GetCustomerPaymentRemindersMediator.getCustomerDetail";
        MyLogger.info(action, { customerId, userId });

        if (!customerId) {
            throw new Error("customerId is required");
        }

        const userFactoryIds = await getUserAccessibleFactoryIds(userId);

        const customerRes = await pool.query(
            `SELECT id, name, company, email, phone, address, vat_number, payment_terms,
                    credit_limit, COALESCE(opening_balance, 0) AS opening_balance,
                    COALESCE(total_outstanding_amount, 0) AS total_outstanding_amount
             FROM factory_customers
             WHERE id = $1`,
            [customerId]
        );

        if (customerRes.rows.length === 0) {
            throw new Error(`Customer ${customerId} not found`);
        }
        const c = customerRes.rows[0];

        const invoiceParams: any[] = [customerId];
        let p = 2;
        let factoryClause = "";
        if (userFactoryIds !== null) {
            invoiceParams.push(userFactoryIds);
            factoryClause = `AND si.factory_id = ANY($${p++}::bigint[])`;
        }

        const invoicesRes = await pool.query(
            `SELECT si.id, si.invoice_number, si.invoice_date, si.due_date,
                    si.total_amount, si.paid_amount, si.outstanding_amount, si.status,
                    GREATEST(0, (CURRENT_DATE - si.due_date)::int) AS days_overdue
             FROM factory_sales_invoices si
             WHERE si.factory_customer_id = $1
               AND si.status <> 'cancelled'
               AND si.outstanding_amount > 0
               ${factoryClause}
             ORDER BY si.due_date ASC, si.invoice_date ASC`,
            invoiceParams
        );

        const invoices: CustomerPaymentReminderInvoice[] = invoicesRes.rows.map((r: any) => ({
            invoice_id: String(r.id),
            invoice_number: r.invoice_number,
            invoice_date: typeof r.invoice_date === "string" ? r.invoice_date : r.invoice_date.toISOString().slice(0, 10),
            due_date: typeof r.due_date === "string" ? r.due_date : r.due_date.toISOString().slice(0, 10),
            total_amount: Number(r.total_amount) || 0,
            paid_amount: Number(r.paid_amount) || 0,
            outstanding_amount: Number(r.outstanding_amount) || 0,
            status: r.status,
            days_overdue: Number(r.days_overdue) || 0,
        }));

        const aging = invoices.reduce(
            (acc, inv) => {
                const d = inv.days_overdue;
                const amt = inv.outstanding_amount;
                if (d <= 0) acc.not_yet_due += amt;
                else if (d <= 30) acc.bucket_0_30 += amt;
                else if (d <= 60) acc.bucket_31_60 += amt;
                else if (d <= 90) acc.bucket_61_90 += amt;
                else acc.bucket_90_plus += amt;
                acc.total_outstanding += amt;
                if (d > acc.max_days_overdue) acc.max_days_overdue = d;
                return acc;
            },
            {
                not_yet_due: 0,
                bucket_0_30: 0,
                bucket_31_60: 0,
                bucket_61_90: 0,
                bucket_90_plus: 0,
                total_outstanding: 0,
                max_days_overdue: 0,
            }
        );

        const currencyRes = await pool.query(
            `SELECT currency FROM factory_customer_orders
             WHERE factory_customer_id = $1
             ORDER BY order_date DESC
             LIMIT 1`,
            [customerId]
        );
        const currency = currencyRes.rows[0]?.currency || "USD";

        const paymentRes = await pool.query(
            `SELECT MAX(payment_date) AS latest_payment_date
             FROM factory_customer_payments
             WHERE factory_customer_id = $1`,
            [customerId]
        );
        const latestRaw = paymentRes.rows[0]?.latest_payment_date ?? null;
        const latest_payment_date = latestRaw
            ? (typeof latestRaw === "string" ? latestRaw : latestRaw.toISOString().slice(0, 10))
            : null;

        const detail: CustomerPaymentReminderDetail = {
            customer: {
                id: String(c.id),
                name: c.name,
                company: c.company,
                email: c.email,
                phone: c.phone,
                address: c.address ?? null,
                vat_number: c.vat_number ?? null,
                payment_terms: c.payment_terms ?? null,
                credit_limit: c.credit_limit !== null ? Number(c.credit_limit) : null,
                opening_balance: Number(c.opening_balance) || 0,
                total_outstanding_amount: Number(c.total_outstanding_amount) || 0,
                currency,
            },
            invoices,
            aging,
            latest_payment_date,
        };

        MyLogger.success(action, {
            customerId,
            invoiceCount: invoices.length,
            totalOutstanding: aging.total_outstanding,
        });

        return detail;
    }
}

// Returns null when the user is admin (no factory restriction), otherwise the
// list of factory ids accessible to the user. Mirrors the helper in
// GetStockVsOrderDemand.mediator.ts — kept local to avoid cross-mediator churn.
async function getUserAccessibleFactoryIds(userId?: number): Promise<string[] | null> {
    if (!userId) return null;

    const roleResult = await pool.query(
        "SELECT role_id FROM users WHERE id = $1",
        [userId]
    );
    if (roleResult.rows.length === 0) return null;
    if (roleResult.rows[0].role_id === 1) return null;

    const factoriesResult = await pool.query(
        "SELECT factory_id FROM get_user_factories($1)",
        [userId]
    );
    return factoriesResult.rows.map((r: any) => String(r.factory_id));
}
