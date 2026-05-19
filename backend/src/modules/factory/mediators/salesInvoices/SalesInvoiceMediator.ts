import { PoolClient } from 'pg';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import { interModuleConnector } from '@/utils/InterModuleConnector';
import {
  SalesInvoice,
  CreateSalesInvoiceRequest,
  UpdateSalesInvoiceRequest,
  RecordPaymentRequest,
  SalesInvoiceQueryParams,
  SalesInvoiceStats,
  SalesInvoiceStatus
} from '@/types/salesInvoice';

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
          WHERE d.id = $1`,
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

      // 3. Compute amounts from delivery_items (NOT from any single order total).
      //    Goods subtotal is rounded to whole taka so the persisted figures match
      //    the BILL/INVOICE PDF (which never prints paisa on the goods total).
      //    VAT is then computed on the rounded base, mirroring the PDF.
      const subtotalRaw = items.reduce((sum, it) => sum + parseFloat(it.line_total), 0);
      const subtotal = Math.round(subtotalRaw);
      // Tax rate from the primary order; if the delivery has no primary order
      // (multi-order with customer_order_id null), fall back to any touched
      // order's rate. BD VAT is flat across the customer so this is consistent.
      let taxRate = delivery.primary_tax_rate != null
        ? parseFloat(String(delivery.primary_tax_rate)) || 0
        : 0;
      if (!taxRate) {
        const rateRes = await client.query<{ tax_rate: string | null }>(
          `SELECT tax_rate
             FROM factory_customer_orders
            WHERE id = ANY($1::bigint[]) AND tax_rate IS NOT NULL AND tax_rate > 0
            ORDER BY id ASC
            LIMIT 1`,
          [Array.from(new Set(items.map(it => Number(it.order_id))))]
        );
        if (rateRes.rows.length > 0) {
          taxRate = parseFloat(rateRes.rows[0].tax_rate ?? '0') || 0;
        }
      }
      const taxAmount = (subtotal * taxRate) / 100;
      const shippingCost = 0;
      const totalAmount = subtotal + taxAmount + shippingCost;

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
      const insertRes = await client.query(
        `INSERT INTO factory_sales_invoices (
           invoice_number, customer_order_id, factory_customer_id, factory_id,
           invoice_date, due_date,
           subtotal, tax_amount, shipping_cost, total_amount, outstanding_amount,
           payment_terms, notes, billing_address, shipping_address,
           status, created_by
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
         ) RETURNING *`,
        [
          invoiceNumber,
          delivery.customer_order_id ?? null,
          delivery.factory_customer_id,
          factoryId,
          invoiceDate,
          dueDate,
          subtotal,
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

      // Count total
      const countQuery = `
        SELECT COUNT(*) as total
        FROM factory_sales_invoices si
        JOIN factory_customer_orders co ON si.customer_order_id = co.id
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
        JOIN factory_customer_orders co ON si.customer_order_id = co.id
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
      const query = `
        SELECT 
          si.*,
          co.order_number as customer_order_number,
          fc.name as factory_customer_name,
          f.name as factory_name,
          v.voucher_no
        FROM factory_sales_invoices si
        JOIN factory_customer_orders co ON si.customer_order_id = co.id
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
   * Record payment against invoice
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

      // Get current invoice
      const invoiceResult = await client.query(
        'SELECT * FROM factory_sales_invoices WHERE id = $1',
        [data.invoice_id]
      );

      if (invoiceResult.rows.length === 0) {
        throw createError('Sales invoice not found', 404);
      }

      const invoice = invoiceResult.rows[0];

      // Validate payment amount
      if (data.payment_amount <= 0) {
        throw createError('Payment amount must be greater than 0', 400);
      }

      if (data.payment_amount > parseFloat(invoice.outstanding_amount)) {
        throw createError('Payment amount exceeds outstanding amount', 400);
      }

      // Calculate new amounts
      const newPaidAmount = parseFloat(invoice.paid_amount) + data.payment_amount;
      const newOutstandingAmount = parseFloat(invoice.total_amount) - newPaidAmount;

      // Determine new status
      let newStatus = invoice.status;
      if (newOutstandingAmount <= 0) {
        newStatus = SalesInvoiceStatus.PAID;
      } else if (newPaidAmount > 0) {
        newStatus = SalesInvoiceStatus.PARTIAL;
      }

      // Update invoice
      await client.query(
        `UPDATE factory_sales_invoices
         SET paid_amount = $1,
             outstanding_amount = $2,
             status = $3,
             updated_by = $4,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5`,
        [newPaidAmount, newOutstandingAmount, newStatus, userId, data.invoice_id]
      );

      // TODO: Record payment in a payments table (to be implemented)
      // TODO: Create accounting voucher for payment (cash/bank account integration)

      await client.query('COMMIT');

      MyLogger.success(action, {
        invoiceId: data.invoice_id,
        paymentAmount: data.payment_amount,
        newStatus
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

