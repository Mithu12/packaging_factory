import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import {
  MonthlyBill,
  MonthlyBillWithLines,
  MonthlyBillLineItem,
  CreateMonthlyBillRequest,
  MonthlyBillQueryParams,
  RecordMonthlyBillPaymentRequest,
} from '@/types/monthlyBill';
import { recalcFactoryCustomerFinancials } from '../../utils/customerFinancials';
import { interModuleConnector } from '@/utils/InterModuleConnector';
import { eventBus, EVENT_NAMES } from '@/utils/eventBus';
import { SalesInvoiceStatus } from '@/types/salesInvoice';
import type { PoolClient } from 'pg';

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

// VAT-bearing vs without-VAT split for separate bills. Classification is by the
// (return-netted) invoice VAT amount on each challan row.
export type MonthlyBillVatFilter = 'with' | 'without';

export class MonthlyBillMediator {
  /**
   * Build the read-only data set for a per-customer, per-period bill.
   * Aggregates challans (deliveries) + their per-delivery invoices in the
   * given date range. No persistence: callers turn this into a PDF.
   *
   * When `vatFilter` is given, rows are split into VAT-bearing (tax > 0) or
   * without-VAT (tax = 0) so the two can be billed separately.
   */
  static async getMonthlyBillData(
    customerId: number | string,
    fromDate: string,
    toDate: string,
    vatFilter?: MonthlyBillVatFilter,
  ): Promise<MonthlyBillData> {
    const action = 'MonthlyBillMediator.getMonthlyBillData';
    try {
      MyLogger.info(action, { customerId, fromDate, toDate, vatFilter });

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

      let rows: MonthlyBillRow[] = rowsRes.rows
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

      // Split into VAT-bearing vs without-VAT challans for separate bills.
      if (vatFilter === 'with') rows = rows.filter(row => row.tax_amount > 0.005);
      else if (vatFilter === 'without') rows = rows.filter(row => row.tax_amount <= 0.005);

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
      // A -V / -NV suffix keeps the VAT and without-VAT bills distinct.
      const vatSuffix = vatFilter === 'with' ? '-V' : vatFilter === 'without' ? '-NV' : '';
      const invoiceNo = `INV-${toDate.slice(0, 7).replace('-', '')}-${String(c.id).padStart(4, '0')}${vatSuffix}`;

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

  /**
   * Generate and persist a monthly bill. Aggregates the same challan data as
   * getMonthlyBillData, then saves header + line items to the database.
   * Returns the saved bill with its generated bill_number.
   */
  static async createMonthlyBill(
    data: CreateMonthlyBillRequest,
    createdBy: string,
  ): Promise<MonthlyBillWithLines> {
    const action = 'MonthlyBillMediator.createMonthlyBill';
    const client = await pool.connect();
    try {
      MyLogger.info(action, { customerId: data.customer_id, fromDate: data.from_date, toDate: data.to_date, vatFilter: data.vat_filter });

      const billData = await MonthlyBillMediator.getMonthlyBillData(
        data.customer_id, data.from_date, data.to_date,
        data.vat_filter ?? undefined,
      );

      if (billData.rows.length === 0) {
        throw createError('No challans found in the selected period' + (data.vat_filter ? ` (vat_filter=${data.vat_filter})` : ''), 400);
      }

      await client.query('BEGIN');

      const headerResult = await client.query(
        `INSERT INTO monthly_bills (
          customer_id, customer_name, customer_vat_number, customer_address,
          from_date, to_date, vat_filter,
          subtotal, tax_amount, total_amount, total_qty,
          paid_amount, outstanding_amount, line_count, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          billData.customer.id,
          billData.customer.name,
          billData.customer.vat_number,
          billData.customer.address_line || null,
          data.from_date,
          data.to_date,
          data.vat_filter ?? null,
          billData.totals.subtotal,
          billData.totals.tax_amount,
          billData.totals.total_amount,
          billData.totals.total_qty,
          billData.payments.paid_in_period,
          billData.outstanding_now,
          billData.rows.length,
          createdBy,
        ],
      );
      const header = headerResult.rows[0];

      const savedLines: MonthlyBillLineItem[] = [];
      for (const row of billData.rows) {
        const lineResult = await client.query(
          `INSERT INTO monthly_bill_line_items (
            monthly_bill_id, delivery_id, delivery_number, delivery_date,
            invoice_id, invoice_number,
            subtotal, tax_amount, total_amount, total_qty
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *`,
          [
            header.id,
            row.delivery_id,
            row.delivery_number,
            row.delivery_date,
            row.invoice_id,
            row.invoice_number,
            row.subtotal,
            row.tax_amount,
            row.total_amount,
            row.total_qty,
          ],
        );
        savedLines.push(lineResult.rows[0]);
      }

      await client.query('COMMIT');

      MyLogger.success(action, { billId: header.id, billNumber: header.bill_number, lineCount: savedLines.length });

      return { ...header, line_items: savedLines };
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { customerId: data.customer_id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * List saved monthly bills with optional filtering.
   */
  static async getMonthlyBills(params: MonthlyBillQueryParams): Promise<MonthlyBill[]> {
    const action = 'MonthlyBillMediator.getMonthlyBills';
    try {
      let query = 'SELECT * FROM monthly_bills WHERE 1=1';
      const queryParams: any[] = [];
      let idx = 1;

      if (params.customer_id) {
        query += ` AND customer_id = $${idx++}`;
        queryParams.push(params.customer_id);
      }
      if (params.start_date) {
        query += ` AND created_at >= $${idx++}`;
        queryParams.push(params.start_date);
      }
      if (params.end_date) {
        query += ` AND created_at <= $${idx++}`;
        queryParams.push(params.end_date);
      }

      query += ' ORDER BY created_at DESC';

      if (params.limit) {
        query += ` LIMIT $${idx++}`;
        queryParams.push(params.limit);
      }
      if (params.offset) {
        query += ` OFFSET $${idx++}`;
        queryParams.push(params.offset);
      }

      const result = await pool.query(query, queryParams);
      return result.rows;
    } catch (error) {
      MyLogger.error(action, error, { params });
      throw error;
    }
  }

  /**
   * Get a saved monthly bill by ID with its line items.
   */
  static async getMonthlyBillById(id: number): Promise<MonthlyBillWithLines> {
    const action = 'MonthlyBillMediator.getMonthlyBillById';
    try {
      const headerResult = await pool.query(
        'SELECT * FROM monthly_bills WHERE id = $1',
        [id],
      );
      if (headerResult.rows.length === 0) {
        throw createError('Monthly bill not found', 404);
      }

      const linesResult = await pool.query(
        'SELECT * FROM monthly_bill_line_items WHERE monthly_bill_id = $1 ORDER BY id',
        [id],
      );

      return { ...headerResult.rows[0], line_items: linesResult.rows };
    } catch (error) {
      MyLogger.error(action, error, { billId: id });
      throw error;
    }
  }

  /**
   * Delete a saved monthly bill (cascades to line items).
   */
  static async deleteMonthlyBill(id: number): Promise<void> {
    const action = 'MonthlyBillMediator.deleteMonthlyBill';
    try {
      const result = await pool.query(
        'DELETE FROM monthly_bills WHERE id = $1 RETURNING id',
        [id],
      );
      if (result.rows.length === 0) {
        throw createError('Monthly bill not found', 404);
      }
      MyLogger.success(action, { billId: id });
    } catch (error) {
      MyLogger.error(action, error, { billId: id });
      throw error;
    }
  }

  /**
   * Record a consolidated payment against a monthly bill. Distributes the
   * payment across the underlying per-delivery invoices proportionally by
   * each invoice's share of the bill total, then inserts one payment record
   * per invoice (all sharing the same monthly_bill_id) so accounting stays
   * consistent at every level.
   */
  static async recordPayment(
    billId: number,
    data: RecordMonthlyBillPaymentRequest,
    userId: number,
  ): Promise<{ bill: MonthlyBill; paymentIds: number[] }> {
    const action = 'MonthlyBillMediator.recordPayment';
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { billId, amount: data.payment_amount, userId });

      // 1. Lock the monthly bill
      const billRes = await client.query(
        `SELECT * FROM monthly_bills WHERE id = $1 FOR UPDATE`,
        [billId],
      );
      if (billRes.rows.length === 0) {
        throw createError('Monthly bill not found', 404);
      }
      const bill = billRes.rows[0];

      const paymentAmount = Number(data.payment_amount);
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        throw createError('Payment amount must be greater than 0', 400);
      }

      const aitAmount = Number(data.ait_amount) || 0;
      if (!Number.isFinite(aitAmount) || aitAmount < 0) {
        throw createError('AIT amount cannot be negative', 400);
      }
      const settledAmount = +(paymentAmount + aitAmount).toFixed(2);

      const billOutstanding = parseFloat(bill.outstanding_amount);
      if (settledAmount - billOutstanding > 0.005) {
        throw createError('Payment amount plus AIT exceeds monthly bill outstanding', 400);
      }

      // 2. Load line items with invoice details
      const linesRes = await client.query(
        `SELECT li.*, inv.total_amount, inv.paid_amount, inv.outstanding_amount, inv.status,
                inv.factory_customer_id, inv.factory_id, inv.customer_order_id
           FROM monthly_bill_line_items li
           JOIN factory_sales_invoices inv ON inv.id = li.invoice_id
          WHERE li.monthly_bill_id = $1 AND li.invoice_id IS NOT NULL`,
        [billId],
      );

      if (linesRes.rows.length === 0) {
        throw createError('Monthly bill has no invoice line items to allocate payment to', 400);
      }

      const billTotal = parseFloat(bill.total_amount);

      // 3. Distribute payment proportionally across invoices
      let remaining = settledAmount;
      const paymentIds: number[] = [];

      for (let i = 0; i < linesRes.rows.length; i++) {
        const li = linesRes.rows[i];
        const invoiceTotal = parseFloat(li.total_amount);

        const isLast = i === linesRes.rows.length - 1;
        const portion = isLast
          ? remaining
          : +((settledAmount * invoiceTotal) / billTotal).toFixed(2);
        remaining = +(remaining - portion).toFixed(2);

        if (portion <= 0 && !isLast) continue;

        // Lock and update the invoice
        const invRes = await client.query(
          `SELECT total_amount, paid_amount, outstanding_amount, status
             FROM factory_sales_invoices WHERE id = $1 FOR UPDATE`,
          [li.invoice_id],
        );
        if (invRes.rows.length === 0) continue;
        const inv = invRes.rows[0];
        const invTotal = parseFloat(inv.total_amount);
        const rawPaid = parseFloat(inv.paid_amount) + portion;
        const invNewPaid = Math.min(rawPaid, invTotal);
        const rawOutstanding = invTotal - invNewPaid;
        const invNewOutstanding = Math.abs(rawOutstanding) < 0.005 ? 0 : Math.max(0, rawOutstanding);
        const invNewStatus =
          invNewOutstanding <= 0 ? SalesInvoiceStatus.PAID : SalesInvoiceStatus.PARTIAL;

        await client.query(
          `UPDATE factory_sales_invoices
              SET paid_amount = $1, outstanding_amount = $2, status = $3,
                  updated_by = $4, updated_at = CURRENT_TIMESTAMP
            WHERE id = $5`,
          [invNewPaid, invNewOutstanding, invNewStatus, userId, li.invoice_id],
        );

        // Update parent order(s) — same allocation logic as SalesInvoiceMediator
        if (li.customer_order_id) {
          await this.applyPaymentToOrder(client, Number(li.customer_order_id), portion);
        } else {
          const allocRes = await client.query(
            `SELECT li.order_id::text AS order_id,
                    SUM(di.line_total)::text AS share
               FROM factory_customer_order_deliveries d
               JOIN factory_customer_order_delivery_items di ON di.delivery_id = d.id
               JOIN factory_customer_order_line_items li ON li.id = di.order_line_item_id
              WHERE d.invoice_id = $1
              GROUP BY li.order_id`,
            [li.invoice_id],
          );
          if (allocRes.rows.length > 0) {
            const allocations = allocRes.rows.map((r: any) => ({
              orderId: Number(r.order_id),
              share: parseFloat(r.share),
            }));
            const shareTotal = allocations.reduce((s: number, a: any) => s + a.share, 0);
            if (shareTotal > 0) {
              let allocRemaining = portion;
              for (let j = 0; j < allocations.length; j++) {
                const isLastAlloc = j === allocations.length - 1;
                const allocPortion = isLastAlloc
                  ? allocRemaining
                  : +((portion * allocations[j].share) / shareTotal).toFixed(2);
                allocRemaining = +(allocRemaining - allocPortion).toFixed(2);
                if (allocPortion > 0) {
                  await this.applyPaymentToOrder(client, allocations[j].orderId, allocPortion);
                }
              }
            }
          }
        }

        // Insert payment record for this invoice
        const payRes = await client.query(
          `INSERT INTO factory_customer_payments (
             factory_customer_order_id, factory_customer_id, factory_id,
             factory_sales_invoice_id, monthly_bill_id,
             payment_amount, payment_date, payment_method,
             payment_reference, notes, bank_name, ait_amount, cheque_date, recorded_by
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
           RETURNING id`,
          [
            li.customer_order_id ?? null,
            li.factory_customer_id,
            li.factory_id ?? null,
            li.invoice_id,
            billId,
            portion,
            data.payment_date ?? new Date(),
            data.payment_method ?? 'cash',
            data.reference_number ?? null,
            data.notes ?? null,
            data.bank_name ?? null,
            0,
            data.cheque_date ?? null,
            userId,
          ],
        );
        paymentIds.push(Number(payRes.rows[0].id));
      }

      // 4. Update the monthly bill header
      const newPaid = +(parseFloat(bill.paid_amount) + settledAmount).toFixed(2);
      const newOutstanding = Math.max(0, +(billOutstanding - settledAmount).toFixed(2));

      await client.query(
        `UPDATE monthly_bills
            SET paid_amount = $1, outstanding_amount = $2, updated_at = CURRENT_TIMESTAMP
          WHERE id = $3`,
        [newPaid, newOutstanding, billId],
      );

      // 5. Refresh customer-level aggregates
      await recalcFactoryCustomerFinancials(client, bill.customer_id);

      await client.query('COMMIT');

      // 6. Post voucher (best-effort, outside txn)
      const paymentData = {
        orderId: null,
        orderNumber: bill.bill_number,
        paymentId: paymentIds[0],
        amount: paymentAmount,
        paymentMethod: data.payment_method ?? 'cash',
        paymentReference: data.reference_number ?? null,
        paymentDate: data.payment_date ?? new Date(),
        factoryId: null,
        factoryName: null,
        factoryCostCenterId: null,
        factoryCostCenterName: null,
        customerId: Number(bill.customer_id),
        invoiceId: null,
        invoiceNumber: bill.bill_number,
        userId,
        timestamp: new Date(),
      };

      eventBus.emit(EVENT_NAMES.FACTORY_PAYMENT_RECEIVED, paymentData);

      try {
        await interModuleConnector.accModule.addFactoryPaymentVoucher(paymentData, userId);
      } catch (voucherErr: any) {
        MyLogger.error('addFactoryPaymentVoucher failed (monthly bill payment recorded)', voucherErr, {
          billId,
          paymentIds,
        });
      }

      MyLogger.success(action, { billId, paymentAmount, paymentIds, newOutstanding });

      return {
        bill: billRes.rows[0] as MonthlyBill,
        paymentIds,
      };
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { billId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Apply a payment portion to an order (same allocation logic as
   * SalesInvoiceMediator.applyPaymentToOrder).
   */
  private static async applyPaymentToOrder(
    client: PoolClient,
    orderId: number,
    portion: number,
  ): Promise<void> {
    const ordRes = await client.query<{
      total_value: string;
      paid_amount: string;
      outstanding_amount: string;
      status: string;
    }>(
      `SELECT total_value, paid_amount, outstanding_amount, status
         FROM factory_customer_orders WHERE id = $1 FOR UPDATE`,
      [orderId],
    );
    if (ordRes.rows.length === 0) {
      throw createError(`Order ${orderId} not found for payment allocation`, 404);
    }
    const ord = ordRes.rows[0];
    const totalValue = parseFloat(ord.total_value);
    const rawPaid = parseFloat(ord.paid_amount) + portion;
    const newPaid = rawPaid > totalValue - 0.005 ? totalValue : rawPaid;
    const rawOutstanding = totalValue - newPaid;
    const newOutstanding =
      Math.abs(rawOutstanding) < 0.005 ? 0 : Math.max(0, rawOutstanding);

    let newStatus = ord.status;
    if (newOutstanding === 0 && ord.status === 'shipped') {
      newStatus = 'completed';
    }

    await client.query(
      `UPDATE factory_customer_orders
          SET paid_amount = $1, outstanding_amount = $2, status = $3,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $4`,
      [newPaid, newOutstanding, newStatus, orderId],
    );
  }
}