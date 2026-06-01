import { PoolClient } from 'pg';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import { interModuleConnector } from '@/utils/InterModuleConnector';
import { eventBus, EVENT_NAMES } from '@/utils/eventBus';
import { recalcFactoryCustomerFinancials } from '../../utils/customerFinancials';
import {
  SalesInvoice,
  CreateSalesInvoiceRequest,
  UpdateSalesInvoiceRequest,
  RecordPaymentRequest,
  SalesInvoiceQueryParams,
  SalesInvoiceStats,
  SalesInvoiceStatus
} from '@/types/salesInvoice';

// Epsilon for currency comparisons. Float arithmetic on decimal-cast columns
// can leave residue like -1e-14; treat anything below 1 paisa as zero.
const CURRENCY_EPSILON = 0.005;

export class SalesInvoiceMediator {
  /**
   * Generate unique sales invoice number. Pass a shared client to share a transaction.
   */
  static async generateInvoiceNumber(sharedClient?: PoolClient): Promise<string> {
    const action = 'Generate Sales Invoice Number';
    const client = sharedClient ?? await pool.connect();
    const ownsConn = !sharedClient;

    try {
      const result = await client.query(
        "SELECT CONCAT('INV-', TO_CHAR(CURRENT_DATE, 'YYYY'), '-', LPAD(NEXTVAL('sales_invoice_number_sequence')::TEXT, 5, '0')) as invoice_number"
      );
      return result.rows[0].invoice_number;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      if (ownsConn) client.release();
    }
  }

  /**
   * Legacy entrypoint preserved for backward compatibility with the old
   * "one invoice per order" callers. New code should drive deliveries directly
   * via the deliveries mediator and let createInvoiceFromDelivery run inside
   * that transaction.
   *
   * Behaviour: ships every remaining quantity on the order in a single delivery
   * and returns that delivery's invoice. Errors if no remaining qty.
   */
  static async createInvoiceFromOrder(
    data: CreateSalesInvoiceRequest,
    userId: number
  ): Promise<SalesInvoice> {
    // Dynamic import keeps the dependency one-way: CreateDelivery imports this
    // module statically; this fallback resolves the inverse only when invoked.
    const { CreateDeliveryMediator } = await import('../deliveries/CreateDelivery.mediator');
    const result = await CreateDeliveryMediator.shipAllRemaining(
      data.customer_order_id,
      {
        notes: data.notes,
        delivery_date: data.invoice_date,
      },
      userId
    );
    return result.invoice;
  }

  /**
   * Create sales invoice for a single delivery (challan).
   *
   * The delivery row is the unit of partial fulfillment — one invoice per delivery.
   * Subtotal is derived from delivery_items, NOT from the order's total_value, so
   * each partial delivery's invoice covers only that shipment's quantity.
   *
   * Pass a shared `client` to participate in the caller's transaction (the typical
   * case: CreateDelivery.mediator runs delivery + invoice + voucher posting in one
   * atomic block). If `client` is omitted, a fresh transaction is opened here.
   */
  static async createInvoiceFromDelivery(
    deliveryId: number | string,
    userId: number,
    sharedClient?: PoolClient
  ): Promise<SalesInvoice> {
    const action = 'Create Sales Invoice From Delivery';
    const client = sharedClient ?? await pool.connect();
    const ownsTxn = !sharedClient;

    try {
      if (ownsTxn) await client.query('BEGIN');
      MyLogger.info(action, { deliveryId, userId });

      // 1. Load delivery + customer (always) + primary order (optional).
      //    FOR UPDATE OF d serialises concurrent backfill calls so two callers
      //    can't both observe invoice_id IS NULL and create duplicate invoices.
      const deliveryRes = await client.query(
        `SELECT d.*,
                fc.payment_terms AS customer_payment_terms,
                fc.name AS customer_name,
                fc.email AS customer_email,
                fc.address AS customer_address,
                co.order_number AS primary_order_number,
                co.factory_id AS primary_factory_id,
                co.tax_rate AS primary_tax_rate,
                co.payment_terms AS primary_payment_terms,
                co.billing_address AS primary_billing_address,
                co.shipping_address AS primary_shipping_address,
                pf.cost_center_id AS primary_factory_cost_center_id,
                pf.name AS primary_factory_name
           FROM factory_customer_order_deliveries d
           JOIN factory_customers fc ON fc.id = d.factory_customer_id
           LEFT JOIN factory_customer_orders co ON co.id = d.customer_order_id
           LEFT JOIN factories pf ON pf.id = co.factory_id
          WHERE d.id = $1
          FOR UPDATE OF d`,
        [deliveryId]
      );

      if (deliveryRes.rows.length === 0) {
        throw createError('Delivery not found', 404);
      }
      const delivery = deliveryRes.rows[0];

      if (delivery.invoice_id) {
        throw createError(
          `Delivery ${delivery.delivery_number} already has invoice id ${delivery.invoice_id}`,
          400
        );
      }

      const itemsRes = await client.query(
        `SELECT di.id, di.order_line_item_id, di.quantity, di.unit_price_snapshot, di.line_total,
                li.order_id
           FROM factory_customer_order_delivery_items di
           JOIN factory_customer_order_line_items li ON li.id = di.order_line_item_id
          WHERE di.delivery_id = $1`,
        [deliveryId]
      );
      const items = itemsRes.rows;
      if (items.length === 0) {
        throw createError('Delivery has no items; cannot create invoice', 400);
      }

      // 2. Determine factory_id for the invoice. Prefer the primary order's
      // factory; otherwise use whichever factory is most common across touched orders.
      let factoryId = delivery.primary_factory_id ?? null;
      let factoryCostCenterId = delivery.primary_factory_cost_center_id ?? null;
      let factoryName = delivery.primary_factory_name ?? null;
      if (!factoryId) {
        const factoryRes = await client.query<{ factory_id: string; cost_center_id: string | null; name: string | null }>(
          `SELECT co.factory_id, f.cost_center_id, f.name, COUNT(*) AS n
             FROM factory_customer_orders co
             LEFT JOIN factories f ON f.id = co.factory_id
            WHERE co.id = ANY($1::bigint[])
            GROUP BY co.factory_id, f.cost_center_id, f.name
            ORDER BY n DESC NULLS LAST
            LIMIT 1`,
          [Array.from(new Set(items.map(it => Number(it.order_id))))]
        );
        if (factoryRes.rows.length > 0) {
          factoryId = factoryRes.rows[0].factory_id ? Number(factoryRes.rows[0].factory_id) : null;
          factoryCostCenterId = factoryRes.rows[0].cost_center_id ? Number(factoryRes.rows[0].cost_center_id) : null;
          factoryName = factoryRes.rows[0].name;
        }
      }

      // 3. Compute amounts from delivery_items (NOT from any single order
      //    total). Subtotal and VAT both keep paisa precision; rounding to
      //    whole taka was a display convention that caused SUM(delivery_items)
      //    to drift from the persisted subtotal by up to 50 paisa.
      const subtotal = +items
        .reduce((sum, it) => sum + parseFloat(it.line_total), 0)
        .toFixed(2);

      // VAT is computed per touched order using each order's own tax_rate
      // so a delivery that spans orders with different rates totals correctly.
      // If only one order is touched (or all touched orders share a rate),
      // the result is equivalent to subtotal * rate / 100.
      const orderShareRes = await client.query<{
        order_id: string;
        tax_rate: string | null;
        share: string;
      }>(
        `SELECT li.order_id::text AS order_id,
                co.tax_rate::text AS tax_rate,
                SUM(di.line_total)::text AS share
           FROM factory_customer_order_delivery_items di
           JOIN factory_customer_order_line_items li ON li.id = di.order_line_item_id
           JOIN factory_customer_orders co ON co.id = li.order_id
          WHERE di.delivery_id = $1
          GROUP BY li.order_id, co.tax_rate`,
        [deliveryId],
      );

      let taxAmount = 0;
      const orderTaxBreakdown: Array<{ orderId: number; rate: number; vat: number }> = [];
      for (const row of orderShareRes.rows) {
        const rate = row.tax_rate ? parseFloat(row.tax_rate) || 0 : 0;
        const share = parseFloat(row.share);
        const vat = +((share * rate) / 100).toFixed(2);
        taxAmount = +(taxAmount + vat).toFixed(2);
        orderTaxBreakdown.push({ orderId: Number(row.order_id), rate, vat });
      }

      // taxRate stored on the invoice is the weighted-average rate (or the
      // single rate if all touched orders share one). Display only — the
      // authoritative number is taxAmount.
      const taxRate = subtotal > 0 ? +((taxAmount / subtotal) * 100).toFixed(2) : 0;

      const shippingCost = 0;
      const totalAmount = +(subtotal + taxAmount + shippingCost).toFixed(2);

      const paymentTerms = delivery.primary_payment_terms || delivery.customer_payment_terms;
      const invoiceDate = (delivery.delivery_date instanceof Date
        ? delivery.delivery_date.toISOString().split('T')[0]
        : String(delivery.delivery_date)) || new Date().toISOString().split('T')[0];
      const dueDate = this.calculateDueDate(paymentTerms);

      // Addresses: primary order's address if present, else customer's default address.
      const billingAddress =
        delivery.primary_billing_address ?? delivery.customer_address ?? null;
      const shippingAddress =
        delivery.primary_shipping_address ?? delivery.customer_address ?? null;

      const invoiceNumber = await this.generateInvoiceNumber(client);

      // 4. Insert invoice — customer_order_id is now nullable, factory_customer_id authoritative.
      // tax_rate is the snapshot at delivery time; tax_amount is computed for THIS
      // partial delivery (rate * partial subtotal), so both must be persisted.
      const insertRes = await client.query(
        `INSERT INTO factory_sales_invoices (
           invoice_number, customer_order_id, factory_customer_id, factory_id,
           invoice_date, due_date,
           subtotal, tax_rate, tax_amount, shipping_cost, total_amount, outstanding_amount,
           payment_terms, notes, billing_address, shipping_address,
           status, created_by
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
         ) RETURNING *`,
        [
          invoiceNumber,
          delivery.customer_order_id ?? null,
          delivery.factory_customer_id,
          factoryId,
          invoiceDate,
          dueDate,
          subtotal,
          taxRate,
          taxAmount,
          shippingCost,
          totalAmount,
          totalAmount,
          paymentTerms,
          `Invoice for delivery ${delivery.delivery_number}${delivery.primary_order_number ? ` (primary order ${delivery.primary_order_number})` : ''}`,
          billingAddress,
          shippingAddress,
          SalesInvoiceStatus.UNPAID,
          userId,
        ]
      );
      const invoice = insertRes.rows[0];

      // 5. Link invoice on delivery + bump invoiced_qty rollup on each line
      await client.query(
        'UPDATE factory_customer_order_deliveries SET invoice_id = $1 WHERE id = $2',
        [invoice.id, deliveryId]
      );

      for (const it of items) {
        await client.query(
          `UPDATE factory_customer_order_line_items
              SET invoiced_qty = invoiced_qty + $1
            WHERE id = $2`,
          [it.quantity, it.order_line_item_id]
        );
      }

      // Mirror legacy behaviour: each touched order's invoice_id points at the
      // FIRST invoice created for that order so legacy reads still resolve.
      const touchedOrderIds = Array.from(new Set(items.map(it => Number(it.order_id))));
      await client.query(
        `UPDATE factory_customer_orders
            SET invoice_id = COALESCE(invoice_id, $1)
          WHERE id = ANY($2::bigint[])`,
        [invoice.id, touchedOrderIds]
      );

      if (ownsTxn) await client.query('COMMIT');

      // 6. Post one shipment voucher with aggregated COGS across touched orders
      // (best-effort — outside the txn).
      //
      // ONLY when we own the transaction. When a sharedClient is passed (the
      // CreateDelivery path), the caller's txn is still open and holds FOR
      // UPDATE locks on the touched factory_customer_orders rows. Posting the
      // voucher here would issue an UPDATE on those rows from a *separate* pool
      // connection, which blocks on the lock the caller holds — a self-deadlock
      // Postgres can't break (the caller is idle-in-transaction, not waiting on
      // a DB lock). CreateDelivery posts its own shipment voucher after commit,
      // so this would also be a duplicate.
      if (ownsTxn) {
      try {
        // For each touched order: subtotal contributed by that order in this delivery
        const perOrderSubtotal = new Map<number, number>();
        for (const it of items) {
          const oid = Number(it.order_id);
          perOrderSubtotal.set(oid, (perOrderSubtotal.get(oid) ?? 0) + parseFloat(it.line_total));
        }

        // Look up each touched order's total_value and full COGS, then sum
        // proportional contributions.
        const aggRes = await pool.query<{
          order_id: string;
          total_value: string;
          cogs: string;
        }>(
          `SELECT co.id AS order_id,
                  co.total_value,
                  COALESCE((SELECT SUM(wo.total_wip_cost)
                              FROM work_orders wo
                             WHERE wo.customer_order_id = co.id
                               AND wo.status = 'completed'), 0) AS cogs
             FROM factory_customer_orders co
            WHERE co.id = ANY($1::bigint[])`,
          [touchedOrderIds]
        );

        let proportionalCogs = 0;
        for (const row of aggRes.rows) {
          const oid = Number(row.order_id);
          const orderTotal = parseFloat(row.total_value || '0') || 0;
          const fullCogs = parseFloat(row.cogs || '0') || 0;
          const portion = perOrderSubtotal.get(oid) ?? 0;
          if (orderTotal > 0) {
            proportionalCogs += (portion / orderTotal) * fullCogs;
          }
        }

        const voucherOrderId = delivery.customer_order_id ?? touchedOrderIds[0];
        const voucherOrderNumber =
          delivery.primary_order_number ??
          aggRes.rows.find(r => Number(r.order_id) === voucherOrderId)?.order_id ??
          String(voucherOrderId);

        const orderData = {
          orderId: String(voucherOrderId),
          orderNumber: String(voucherOrderNumber),
          customerId: String(delivery.factory_customer_id),
          customerName: delivery.customer_name,
          customerEmail: delivery.customer_email,
          // Gross amount the customer owes (subtotal + VAT). Matches what's
          // stored on factory_sales_invoices.total_amount and the printed bill.
          totalValue: totalAmount,
          // Net + tax split so downstream voucher posting can credit Sales
          // Revenue net of VAT and credit a VAT Payable line for the tax.
          subtotal,
          taxAmount,
          currency: 'BDT',
          orderDate: invoiceDate,
          factoryId,
          factoryName,
          factoryCostCenterId,
          costOfGoodsSold: proportionalCogs,
          deliveryNumber: delivery.delivery_number,
          invoiceId: invoice.id,
          invoiceNumber: invoice.invoice_number,
          touchedOrderIds,
        };
        await interModuleConnector.accModule.addFactoryOrderShipmentVoucher(orderData, userId);
      } catch (voucherErr: any) {
        MyLogger.error(`${action}.voucherFailed`, voucherErr, {
          invoiceId: invoice.id,
          message: 'Voucher posting failed but invoice creation succeeded',
        });
      }
      }

      MyLogger.success(action, {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        deliveryId,
        subtotal,
      });

      return this.formatInvoice(invoice);
    } catch (error: any) {
      if (ownsTxn) await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      if (ownsTxn) client.release();
    }
  }

  /**
   * Calculate due date based on payment terms
   */
  private static calculateDueDate(paymentTerms?: string): string {
    const today = new Date();
    let daysToAdd = 30; // Default 30 days

    if (paymentTerms) {
      const match = paymentTerms.match(/net[_\s]?(\d+)/i);
      if (match) {
        daysToAdd = parseInt(match[1]);
      } else if (paymentTerms.toLowerCase() === 'cash') {
        daysToAdd = 0;
      } else if (paymentTerms.toLowerCase().includes('advance')) {
        daysToAdd = 0;
      }
    }

    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + daysToAdd);
    return dueDate.toISOString().split('T')[0];
  }

  /**
   * Get all sales invoices with filtering and pagination
   */
  static async getSalesInvoices(
    params: SalesInvoiceQueryParams,
    userId?: number
  ): Promise<{
    invoices: SalesInvoice[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const action = 'Get Sales Invoices';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params, userId });

      const {
        page = 1,
        limit = 20,
        search,
        status,
        factory_customer_id,
        factory_id,
        date_from,
        date_to,
        overdue_only,
        sort_by = 'invoice_date',
        sort_order = 'desc'
      } = params;

      const offset = (page - 1) * limit;

      // Build WHERE clause
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (search) {
        whereClause += ` AND (
          si.invoice_number ILIKE $${paramIndex} OR
          co.order_number ILIKE $${paramIndex} OR
          fc.name ILIKE $${paramIndex}
        )`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (status) {
        whereClause += ` AND si.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      if (factory_customer_id) {
        whereClause += ` AND si.factory_customer_id = $${paramIndex}`;
        queryParams.push(factory_customer_id);
        paramIndex++;
      }

      if (factory_id) {
        whereClause += ` AND si.factory_id = $${paramIndex}`;
        queryParams.push(factory_id);
        paramIndex++;
      }

      if (date_from) {
        whereClause += ` AND si.invoice_date >= $${paramIndex}`;
        queryParams.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        whereClause += ` AND si.invoice_date <= $${paramIndex}`;
        queryParams.push(date_to);
        paramIndex++;
      }

      if (overdue_only) {
        whereClause += ` AND si.due_date < CURRENT_DATE AND si.outstanding_amount > 0`;
      }

      // Count total. customer_order_id is nullable for multi-order deliveries
      // (V145+); use LEFT JOIN so those invoices are included.
      const countQuery = `
        SELECT COUNT(*) as total
        FROM factory_sales_invoices si
        LEFT JOIN factory_customer_orders co ON si.customer_order_id = co.id
        JOIN factory_customers fc ON si.factory_customer_id = fc.id
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get invoices
      const dataQuery = `
        SELECT
          si.*,
          co.order_number as customer_order_number,
          fc.name as factory_customer_name,
          f.name as factory_name,
          v.voucher_no
        FROM factory_sales_invoices si
        LEFT JOIN factory_customer_orders co ON si.customer_order_id = co.id
        JOIN factory_customers fc ON si.factory_customer_id = fc.id
        LEFT JOIN factories f ON si.factory_id = f.id
        LEFT JOIN vouchers v ON si.voucher_id = v.id
        ${whereClause}
        ORDER BY si.${sort_by} ${sort_order.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      queryParams.push(limit, offset);

      const dataResult = await client.query(dataQuery, queryParams);
      const invoices = dataResult.rows.map(row => this.formatInvoice(row));

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, { total, page, limit });

      return {
        invoices,
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get sales invoice by ID
   */
  static async getSalesInvoiceById(invoiceId: string): Promise<SalesInvoice | null> {
    const action = 'Get Sales Invoice By ID';
    const client = await pool.connect();

    try {
      // LEFT JOIN customer_orders so multi-order delivery invoices (where
      // customer_order_id IS NULL, V145+) are still returned.
      const query = `
        SELECT
          si.*,
          co.order_number as customer_order_number,
          fc.name as factory_customer_name,
          f.name as factory_name,
          v.voucher_no
        FROM factory_sales_invoices si
        LEFT JOIN factory_customer_orders co ON si.customer_order_id = co.id
        JOIN factory_customers fc ON si.factory_customer_id = fc.id
        LEFT JOIN factories f ON si.factory_id = f.id
        LEFT JOIN vouchers v ON si.voucher_id = v.id
        WHERE si.id = $1
      `;
      const result = await client.query(query, [invoiceId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.formatInvoice(result.rows[0]);
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update sales invoice
   */
  static async updateSalesInvoice(
    invoiceId: string,
    data: UpdateSalesInvoiceRequest,
    userId: number
  ): Promise<SalesInvoice> {
    const action = 'Update Sales Invoice';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { invoiceId, data, userId });

      // Check if invoice exists
      const checkResult = await client.query(
        'SELECT id, status FROM factory_sales_invoices WHERE id = $1',
        [invoiceId]
      );

      if (checkResult.rows.length === 0) {
        throw createError('Sales invoice not found', 404);
      }

      const currentInvoice = checkResult.rows[0];

      // Build update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (data.due_date) {
        updateFields.push(`due_date = $${paramIndex}`);
        updateValues.push(data.due_date);
        paramIndex++;
      }

      if (data.payment_terms) {
        updateFields.push(`payment_terms = $${paramIndex}`);
        updateValues.push(data.payment_terms);
        paramIndex++;
      }

      if (data.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        updateValues.push(data.notes);
        paramIndex++;
      }

      if (data.status) {
        updateFields.push(`status = $${paramIndex}`);
        updateValues.push(data.status);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw createError('No fields to update', 400);
      }

      updateFields.push(`updated_by = $${paramIndex}`);
      updateValues.push(userId);
      paramIndex++;

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      updateValues.push(invoiceId);

      const updateQuery = `
        UPDATE factory_sales_invoices
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(updateQuery, updateValues);
      await client.query('COMMIT');

      MyLogger.success(action, { invoiceId });

      return this.formatInvoice(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Apply a payment portion to a single order's paid_amount/outstanding_amount,
   * with the same float-precision clamping used at invoice level. Mirrors the
   * status flip from FactoryCustomerPaymentsMediator so both paths agree.
   */
  private static async applyPaymentToOrder(
    client: PoolClient,
    orderId: number,
    portion: number,
  ): Promise<void> {
    const ordRes = await client.query<{
      paid_amount: string;
      outstanding_amount: string;
      status: string;
    }>(
      `SELECT paid_amount, outstanding_amount, status
         FROM factory_customer_orders
        WHERE id = $1
        FOR UPDATE`,
      [orderId],
    );
    if (ordRes.rows.length === 0) {
      throw createError(`Order ${orderId} not found for payment allocation`, 404);
    }
    const ord = ordRes.rows[0];
    const newPaid = parseFloat(ord.paid_amount) + portion;
    const rawOutstanding = parseFloat(ord.outstanding_amount) - portion;
    const newOutstanding =
      Math.abs(rawOutstanding) < CURRENCY_EPSILON ? 0 : Math.max(0, rawOutstanding);

    let newStatus = ord.status;
    if (newOutstanding === 0 && ord.status === 'shipped') {
      newStatus = 'completed';
    }

    await client.query(
      `UPDATE factory_customer_orders
          SET paid_amount = $1,
              outstanding_amount = $2,
              status = $3,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $4`,
      [newPaid, newOutstanding, newStatus, orderId],
    );
  }

  /**
   * Record payment against a sales invoice. Inserts into
   * factory_customer_payments (single source of truth for cash receipts),
   * updates invoice totals, and — when the invoice has a single parent order —
   * also bumps that order's totals so customer aggregates stay consistent.
   * Posts a payment voucher via the accounts integration.
   */
  static async recordPayment(
    data: RecordPaymentRequest,
    userId: number
  ): Promise<SalesInvoice> {
    const action = 'Record Payment';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { invoiceId: data.invoice_id, amount: data.payment_amount, userId });

      // Lock the invoice row to prevent concurrent payments racing to the
      // status flip.
      const invoiceResult = await client.query(
        `SELECT si.*, f.name AS factory_name, f.cost_center_id AS factory_cost_center_id,
                cc.name AS factory_cost_center_name,
                co.order_number AS customer_order_number,
                co.paid_amount AS order_paid_amount,
                co.outstanding_amount AS order_outstanding_amount,
                co.status AS order_status
           FROM factory_sales_invoices si
           LEFT JOIN factories f ON f.id = si.factory_id
           LEFT JOIN cost_centers cc ON cc.id = f.cost_center_id
           LEFT JOIN factory_customer_orders co ON co.id = si.customer_order_id
          WHERE si.id = $1
          FOR UPDATE OF si`,
        [data.invoice_id]
      );

      if (invoiceResult.rows.length === 0) {
        throw createError('Sales invoice not found', 404);
      }

      const invoice = invoiceResult.rows[0];

      if (invoice.status === SalesInvoiceStatus.CANCELLED) {
        throw createError('Cannot record payment against a cancelled invoice', 400);
      }

      const paymentAmount = Number(data.payment_amount);
      if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
        throw createError('Payment amount must be greater than 0', 400);
      }

      const outstanding = parseFloat(invoice.outstanding_amount);
      if (paymentAmount - outstanding > CURRENCY_EPSILON) {
        throw createError('Payment amount exceeds outstanding amount', 400);
      }

      // Compute new invoice totals. Clamp residual float drift to 0 so the
      // outstanding_amount >= 0 DB constraint never trips on rounding.
      const newPaidAmount = parseFloat(invoice.paid_amount) + paymentAmount;
      const rawOutstanding = parseFloat(invoice.total_amount) - newPaidAmount;
      const newOutstandingAmount = Math.abs(rawOutstanding) < CURRENCY_EPSILON ? 0 : rawOutstanding;

      const newInvoiceStatus =
        newOutstandingAmount <= 0
          ? SalesInvoiceStatus.PAID
          : SalesInvoiceStatus.PARTIAL;

      // 1. Insert payment row. factory_customer_order_id is nullable so
      //    multi-order invoices (V145+) record correctly.
      const paymentInsert = await client.query(
        `INSERT INTO factory_customer_payments (
           factory_customer_order_id,
           factory_customer_id,
           factory_id,
           factory_sales_invoice_id,
           payment_amount,
           payment_date,
           payment_method,
           payment_reference,
           notes,
           recorded_by
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id, payment_date`,
        [
          invoice.customer_order_id ?? null,
          invoice.factory_customer_id,
          invoice.factory_id,
          data.invoice_id,
          paymentAmount,
          data.payment_date ?? new Date(),
          data.payment_method ?? 'cash',
          data.reference_number ?? null,
          data.notes ?? null,
          userId,
        ],
      );
      const paymentRow = paymentInsert.rows[0];

      // 2. Update the invoice.
      await client.query(
        `UPDATE factory_sales_invoices
            SET paid_amount = $1,
                outstanding_amount = $2,
                status = $3,
                updated_by = $4,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $5`,
        [newPaidAmount, newOutstandingAmount, newInvoiceStatus, userId, data.invoice_id],
      );

      // 3. Bump the parent order(s). For single-order invoices this is direct;
      //    for multi-order delivery invoices (V145+) the payment is allocated
      //    proportionally across touched orders by each order's contribution
      //    to the invoice subtotal. This keeps customer aggregates (which sum
      //    factory_customer_orders.paid_amount) consistent with cash receipts.
      if (invoice.customer_order_id) {
        await this.applyPaymentToOrder(
          client,
          Number(invoice.customer_order_id),
          paymentAmount,
        );
      } else {
        // Discover the delivery linked to this invoice, then split the payment
        // across orders by their share of the delivery's line totals.
        const allocRes = await client.query<{ order_id: string; share: string }>(
          `SELECT li.order_id::text AS order_id,
                  SUM(di.line_total)::text AS share
             FROM factory_customer_order_deliveries d
             JOIN factory_customer_order_delivery_items di ON di.delivery_id = d.id
             JOIN factory_customer_order_line_items li ON li.id = di.order_line_item_id
            WHERE d.invoice_id = $1
            GROUP BY li.order_id`,
          [data.invoice_id],
        );
        if (allocRes.rows.length > 0) {
          const allocations = allocRes.rows.map(r => ({
            orderId: Number(r.order_id),
            share: parseFloat(r.share),
          }));
          const shareTotal = allocations.reduce((s, a) => s + a.share, 0);
          if (shareTotal > 0) {
            // Round each share to paisa; the last allocation absorbs rounding
            // residue so the sum exactly equals paymentAmount.
            let remaining = paymentAmount;
            for (let i = 0; i < allocations.length; i++) {
              const isLast = i === allocations.length - 1;
              const portion = isLast
                ? remaining
                : +((paymentAmount * allocations[i].share) / shareTotal).toFixed(2);
              remaining = +(remaining - portion).toFixed(2);
              if (portion > 0) {
                await this.applyPaymentToOrder(client, allocations[i].orderId, portion);
              }
            }
          }
        }
      }

      // 4. Refresh customer-level aggregates.
      await recalcFactoryCustomerFinancials(client, invoice.factory_customer_id);

      await client.query('COMMIT');

      // 5. Post the payment voucher and emit event. These run outside the txn
      //    intentionally so a voucher hiccup never blocks cash receipt entry.
      const paymentData = {
        orderId: invoice.customer_order_id ? Number(invoice.customer_order_id) : null,
        orderNumber: invoice.customer_order_number ?? `INV-${invoice.invoice_number}`,
        paymentId: Number(paymentRow.id),
        amount: paymentAmount,
        paymentMethod: data.payment_method ?? 'cash',
        paymentReference: data.reference_number ?? null,
        paymentDate: paymentRow.payment_date,
        factoryId: invoice.factory_id,
        factoryName: invoice.factory_name,
        factoryCostCenterId: invoice.factory_cost_center_id,
        factoryCostCenterName: invoice.factory_cost_center_name,
        customerId: Number(invoice.factory_customer_id),
        invoiceId: Number(data.invoice_id),
        invoiceNumber: invoice.invoice_number,
        userId,
        timestamp: new Date(),
      };

      eventBus.emit(EVENT_NAMES.FACTORY_PAYMENT_RECEIVED, paymentData);

      try {
        await interModuleConnector.accModule.addFactoryPaymentVoucher(paymentData, userId);
      } catch (voucherErr: any) {
        // Voucher failure is logged but does not roll back the receipt.
        MyLogger.error('addFactoryPaymentVoucher failed (payment recorded)', voucherErr, {
          paymentId: paymentRow.id,
          invoiceId: data.invoice_id,
        });
      }

      MyLogger.success(action, {
        invoiceId: data.invoice_id,
        paymentId: paymentRow.id,
        paymentAmount,
        newInvoiceStatus,
      });

      return this.getSalesInvoiceById(data.invoice_id) as Promise<SalesInvoice>;
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get sales invoice statistics
   */
  static async getSalesInvoiceStats(
    factoryId?: string,
    factoryCustomerId?: string
  ): Promise<SalesInvoiceStats> {
    const action = 'Get Sales Invoice Stats';
    const client = await pool.connect();

    try {
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (factoryId) {
        whereClause += ` AND factory_id = $${paramIndex}`;
        queryParams.push(factoryId);
        paramIndex++;
      }

      if (factoryCustomerId) {
        whereClause += ` AND factory_customer_id = $${paramIndex}`;
        queryParams.push(factoryCustomerId);
        paramIndex++;
      }

      const query = `
        SELECT 
          COUNT(*) as total_invoices,
          COALESCE(SUM(total_amount), 0) as total_amount,
          COALESCE(SUM(paid_amount), 0) as paid_amount,
          COALESCE(SUM(outstanding_amount), 0) as outstanding_amount,
          COUNT(*) FILTER (WHERE status = 'unpaid') as unpaid_count,
          COUNT(*) FILTER (WHERE status = 'partial') as partial_count,
          COUNT(*) FILTER (WHERE status = 'paid') as paid_count,
          COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND outstanding_amount > 0) as overdue_count,
          COALESCE(SUM(outstanding_amount) FILTER (WHERE due_date < CURRENT_DATE), 0) as overdue_amount
        FROM factory_sales_invoices
        ${whereClause}
      `;

      const result = await client.query(query, queryParams);
      const stats = result.rows[0];

      return {
        total_invoices: parseInt(stats.total_invoices),
        total_amount: parseFloat(stats.total_amount),
        paid_amount: parseFloat(stats.paid_amount),
        outstanding_amount: parseFloat(stats.outstanding_amount),
        unpaid_count: parseInt(stats.unpaid_count),
        partial_count: parseInt(stats.partial_count),
        paid_count: parseInt(stats.paid_count),
        overdue_count: parseInt(stats.overdue_count),
        overdue_amount: parseFloat(stats.overdue_amount)
      };
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cancel sales invoice
   */
  static async cancelInvoice(invoiceId: string, userId: number): Promise<SalesInvoice> {
    const action = 'Cancel Sales Invoice';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Check if invoice exists and can be cancelled
      const checkResult = await client.query(
        'SELECT * FROM factory_sales_invoices WHERE id = $1',
        [invoiceId]
      );

      if (checkResult.rows.length === 0) {
        throw createError('Sales invoice not found', 404);
      }

      const invoice = checkResult.rows[0];

      if (invoice.status === SalesInvoiceStatus.PAID) {
        throw createError('Cannot cancel a fully paid invoice', 400);
      }

      if (parseFloat(invoice.paid_amount) > 0) {
        throw createError('Cannot cancel an invoice with payments. Please refund payments first.', 400);
      }

      // Update invoice status
      await client.query(
        `UPDATE factory_sales_invoices
         SET status = $1,
             updated_by = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [SalesInvoiceStatus.CANCELLED, userId, invoiceId]
      );

      await client.query('COMMIT');

      MyLogger.success(action, { invoiceId });

      return this.getSalesInvoiceById(invoiceId) as Promise<SalesInvoice>;
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Format invoice row data
   */
  private static formatInvoice(row: any): SalesInvoice {
    return {
      id: row.id.toString(),
      invoice_number: row.invoice_number,
      customer_order_id: row.customer_order_id != null ? row.customer_order_id.toString() : undefined,
      customer_order_number: row.customer_order_number,
      factory_customer_id: row.factory_customer_id.toString(),
      factory_customer_name: row.factory_customer_name,
      factory_id: row.factory_id ? row.factory_id.toString() : undefined,
      factory_name: row.factory_name,
      invoice_date: row.invoice_date,
      due_date: row.due_date,
      subtotal: parseFloat(row.subtotal),
      tax_rate: row.tax_rate ? parseFloat(row.tax_rate) : undefined,
      tax_amount: row.tax_amount ? parseFloat(row.tax_amount) : undefined,
      shipping_cost: row.shipping_cost ? parseFloat(row.shipping_cost) : undefined,
      total_amount: parseFloat(row.total_amount),
      paid_amount: parseFloat(row.paid_amount),
      outstanding_amount: parseFloat(row.outstanding_amount),
      status: row.status as SalesInvoiceStatus,
      payment_terms: row.payment_terms,
      notes: row.notes,
      billing_address: row.billing_address,
      shipping_address: row.shipping_address,
      voucher_id: row.voucher_id,
      voucher_no: row.voucher_no,
      created_by: row.created_by.toString(),
      created_at: row.created_at,
      updated_by: row.updated_by ? row.updated_by.toString() : undefined,
      updated_at: row.updated_at
    };
  }
}

