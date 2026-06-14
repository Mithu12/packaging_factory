import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';

export interface MonthlyBillCustomer {
  id: number;
  name: string;
  company: string | null;
  vat_number: string | null;
  address_line: string;
}

export interface MonthlyBillRow {
  delivery_id: number;
  delivery_number: string;
  delivery_date: string;
  invoice_id: number | null;
  invoice_number: string | null;
  vat_number: string | null;
  po_numbers: string;
  total_qty: number;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: string | null;
}

export interface MonthlyBillData {
  customer: MonthlyBillCustomer;
  // Document-level invoice number for the consolidated bill (this doc aggregates
  // many per-delivery invoices, so it carries its own derived number).
  invoice_no: string;
  period: { from_date: string; to_date: string; generated_at: string };
  rows: MonthlyBillRow[];
  totals: { subtotal: number; tax_amount: number; total_amount: number; total_qty: number };
  payments: { paid_in_period: number; last_payment_date: string | null; payment_count: number };
  outstanding_now: number;
}

export class MonthlyBillMediator {
  /**
   * Build the read-only data set for a per-customer, per-period bill.
   * Aggregates challans (deliveries) + their per-delivery invoices in the
   * given date range. No persistence: callers turn this into a PDF.
   */
  static async getMonthlyBillData(
    customerId: number | string,
    fromDate: string,
    toDate: string,
  ): Promise<MonthlyBillData> {
    const action = 'MonthlyBillMediator.getMonthlyBillData';
    try {
      MyLogger.info(action, { customerId, fromDate, toDate });

      const customerRes = await pool.query(
        `SELECT id, name, company, vat_number, address, total_outstanding_amount
           FROM factory_customers
          WHERE id = $1`,
        [customerId],
      );
      if (customerRes.rows.length === 0) {
        throw createError('Customer not found', 404);
      }
      const c = customerRes.rows[0];
      const addr = c.address || {};
      const addressLine = [
        addr.billing_line || addr.street,
        addr.city,
        addr.state,
        addr.postal_code,
        addr.country,
      ]
        .filter(Boolean)
        .join(', ');

      const rowsRes = await pool.query(
        `SELECT d.id                                              AS delivery_id,
                d.delivery_number,
                d.delivery_date,
                d.vat_number,
                inv.id                                            AS invoice_id,
                inv.invoice_number,
                inv.subtotal,
                inv.tax_amount,
                inv.total_amount,
                inv.tax_rate,
                inv.paid_amount,
                inv.outstanding_amount,
                inv.status,
                (SELECT COALESCE(SUM(di.quantity), 0)
                   FROM factory_customer_order_delivery_items di
                  WHERE di.delivery_id = d.id)                    AS total_qty,
                -- Approved returns against this challan (partial or full). The
                -- returned goods value is pre-tax (unit_price * qty); VAT is
                -- netted proportionally at the invoice tax_rate below.
                (SELECT COALESCE(SUM(dr.total_return_value), 0)
                   FROM factory_delivery_returns dr
                  WHERE dr.delivery_id = d.id AND dr.status = 'approved') AS returned_subtotal,
                (SELECT COALESCE(SUM(ri.returned_quantity), 0)
                   FROM factory_delivery_returns dr
                   JOIN factory_delivery_return_items ri ON ri.return_id = dr.id
                  WHERE dr.delivery_id = d.id AND dr.status = 'approved') AS returned_qty,
                (SELECT COALESCE(string_agg(DISTINCT co.po_number, ', '), '')
                   FROM factory_customer_order_delivery_items di
                   JOIN factory_customer_order_line_items li ON li.id = di.order_line_item_id
                   JOIN factory_customer_orders co ON co.id = li.order_id
                  WHERE di.delivery_id = d.id AND co.po_number IS NOT NULL) AS po_numbers
           FROM factory_customer_order_deliveries d
      LEFT JOIN factory_sales_invoices inv ON inv.id = d.invoice_id
          WHERE d.factory_customer_id = $1
            AND d.delivery_date::date BETWEEN $2::date AND $3::date
            AND d.delivery_status <> 'cancelled'
          ORDER BY d.delivery_date ASC, d.id ASC`,
        [customerId, fromDate, toDate],
      );

      const rows: MonthlyBillRow[] = rowsRes.rows
        .map(r => {
          // Net approved returns out of the billed figures. The returned value is
          // pre-tax; VAT is removed proportionally at the invoice's tax_rate.
          const subtotal = r.subtotal != null ? parseFloat(r.subtotal) : 0;
          const taxAmount = r.tax_amount != null ? parseFloat(r.tax_amount) : 0;
          const totalAmount = r.total_amount != null ? parseFloat(r.total_amount) : 0;
          const taxRate = r.tax_rate != null ? parseFloat(r.tax_rate) : 0;
          const returnedSubtotal = parseFloat(r.returned_subtotal ?? '0') || 0;
          const returnedQty = parseFloat(r.returned_qty ?? '0') || 0;
          const returnedTax = +(returnedSubtotal * (taxRate / 100)).toFixed(2);

          return {
            delivery_id: Number(r.delivery_id),
            delivery_number: r.delivery_number,
            delivery_date: r.delivery_date,
            invoice_id: r.invoice_id != null ? Number(r.invoice_id) : null,
            invoice_number: r.invoice_number,
            vat_number: r.vat_number ?? null,
            po_numbers: r.po_numbers || '',
            total_qty: Math.max(0, Number(r.total_qty || 0) - returnedQty),
            subtotal: Math.max(0, +(subtotal - returnedSubtotal).toFixed(2)),
            tax_amount: Math.max(0, +(taxAmount - returnedTax).toFixed(2)),
            total_amount: Math.max(0, +(totalAmount - returnedSubtotal - returnedTax).toFixed(2)),
            paid_amount: r.paid_amount != null ? parseFloat(r.paid_amount) : 0,
            outstanding_amount: r.outstanding_amount != null ? parseFloat(r.outstanding_amount) : 0,
            status: r.status ?? null,
          };
        })
        // Drop fully-returned challans: nothing left to bill.
        .filter(row => row.total_qty > 1e-9 || row.total_amount > 0.005);

      const totals = rows.reduce(
        (acc, row) => ({
          subtotal: +(acc.subtotal + row.subtotal).toFixed(2),
          tax_amount: +(acc.tax_amount + row.tax_amount).toFixed(2),
          total_amount: +(acc.total_amount + row.total_amount).toFixed(2),
          total_qty: acc.total_qty + row.total_qty,
        }),
        { subtotal: 0, tax_amount: 0, total_amount: 0, total_qty: 0 },
      );

      const paymentsRes = await pool.query(
        `SELECT COALESCE(SUM(payment_amount), 0) AS paid_in_period,
                MAX(payment_date)                AS last_payment_date,
                COUNT(*)                         AS payment_count
           FROM factory_customer_payments
          WHERE factory_customer_id = $1
            AND payment_date::date BETWEEN $2::date AND $3::date`,
        [customerId, fromDate, toDate],
      );
      const p = paymentsRes.rows[0];

      // Derive a stable invoice number from the bill period + customer:
      // INV-YYYYMM-<4-digit customer id> (period month taken from the end date).
      const invoiceNo = `INV-${toDate.slice(0, 7).replace('-', '')}-${String(c.id).padStart(4, '0')}`;

      return {
        customer: {
          id: Number(c.id),
          name: c.name,
          company: c.company ?? null,
          vat_number: c.vat_number ?? null,
          address_line: addressLine,
        },
        invoice_no: invoiceNo,
        period: { from_date: fromDate, to_date: toDate, generated_at: new Date().toISOString() },
        rows,
        totals,
        payments: {
          paid_in_period: parseFloat(p.paid_in_period) || 0,
          last_payment_date: p.last_payment_date ?? null,
          payment_count: Number(p.payment_count || 0),
        },
        outstanding_now: c.total_outstanding_amount != null
          ? parseFloat(c.total_outstanding_amount)
          : 0,
      };
    } catch (error) {
      MyLogger.error(action, error, { customerId, fromDate, toDate });
      throw error;
    }
  }
}
