import { PoolClient } from 'pg';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import {
  CreateDeliveryRequest,
  Delivery,
  FactoryCustomerOrderStatus,
} from '@/types/factory';
import { SalesInvoice } from '@/types/salesInvoice';
import { SalesInvoiceMediator } from '../salesInvoices/SalesInvoiceMediator';
import { GetDeliveriesMediator } from './GetDeliveries.mediator';
import { interModuleConnector } from '@/utils/InterModuleConnector';
import { debitLocationStock, resolvePrimaryDcId } from '@/utils/stockLocations';

interface OrderLineForLock {
  id: number;
  product_id: number;
  product_name: string;
  unit_price: string;
  quantity: string;
  delivered_qty: string;
  order_id: number;
  factory_customer_id: number;
  order_status: string;
}

/**
 * CreateDeliveryMediator
 *
 * Owns the partial-delivery transaction:
 *   1. Lock order line rows
 *   2. Validate requested quantities against remaining (quantity - delivered_qty)
 *   3. Insert delivery + delivery_items
 *   4. Bump line_items.delivered_qty
 *   5. Debit products.current_stock for each shipped line
 *      (mirrors creditWorkOrderProductStock — symmetric debit)
 *   6. Create the per-delivery sales invoice (in same txn)
 *   7. Recompute order status: partially_shipped vs shipped
 */
export class CreateDeliveryMediator {
  /**
   * Create a partial (or full) delivery for a customer order.
   * Auto-generates the delivery's sales invoice in the same transaction.
   */
  static async createPartialDelivery(
    primaryOrderId: number | string | null,
    request: CreateDeliveryRequest,
    userId: number
  ): Promise<{ delivery: Delivery; invoice: SalesInvoice }> {
    const action = 'Create Partial Delivery';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, {
        primaryOrderId,
        factoryCustomerId: request.factory_customer_id,
        items: request.items,
        userId,
      });

      if (!request.items || request.items.length === 0) {
        throw createError('Delivery must include at least one line item', 400);
      }

      // 1. Resolve factory_customer_id (the authoritative scope).
      let factoryCustomerId: number | null = request.factory_customer_id ?? null;

      if (primaryOrderId != null) {
        const orderRes = await client.query(
          'SELECT id, status, order_number, factory_customer_id FROM factory_customer_orders WHERE id = $1 FOR UPDATE',
          [primaryOrderId]
        );
        if (orderRes.rows.length === 0) {
          throw createError('Customer order not found', 404);
        }
        const primaryOrder = orderRes.rows[0];
        if (factoryCustomerId != null && Number(factoryCustomerId) !== Number(primaryOrder.factory_customer_id)) {
          throw createError(
            'factory_customer_id does not match the primary order\'s customer',
            400
          );
        }
        factoryCustomerId = Number(primaryOrder.factory_customer_id);
      }

      if (factoryCustomerId == null) {
        throw createError('Either primaryOrderId or factory_customer_id is required', 400);
      }

      // Resolve the source DC the shipment is picked from (default primary).
      const sourceDcId = request.distribution_center_id ?? (await resolvePrimaryDcId(client));

      // 2. Lock & validate ALL line items in one customer-scoped query.
      const lineIds = request.items.map(it => Number(it.order_line_item_id));
      const linesRes = await client.query<OrderLineForLock>(
        `SELECT li.id, li.product_id, li.product_name, li.unit_price, li.quantity,
                li.delivered_qty, li.order_id,
                co.factory_customer_id, co.status AS order_status
           FROM factory_customer_order_line_items li
           JOIN factory_customer_orders co ON co.id = li.order_id
          WHERE li.id = ANY($1::bigint[])
          FOR UPDATE OF li`,
        [lineIds]
      );
      if (linesRes.rows.length !== lineIds.length) {
        throw createError('One or more line items not found', 400);
      }

      // 'approved' is allowed so on-hand stock can be shipped without first
      // running production; the per-line stock guard caps how much can go out,
      // and the status recompute below moves the order to partially_shipped/shipped.
      const allowedStatuses = new Set<string>([
        FactoryCustomerOrderStatus.APPROVED,
        FactoryCustomerOrderStatus.IN_PRODUCTION,
        FactoryCustomerOrderStatus.COMPLETED,
        FactoryCustomerOrderStatus.PARTIALLY_SHIPPED,
      ]);
      for (const row of linesRes.rows) {
        if (Number(row.factory_customer_id) !== factoryCustomerId) {
          throw createError(
            'All items in a delivery must belong to orders for the same customer',
            400
          );
        }
        if (!allowedStatuses.has(row.order_status)) {
          throw createError(
            `Cannot ship from order in '${row.order_status}' status; must be 'approved', 'in_production', 'completed', or 'partially_shipped'.`,
            400
          );
        }
      }

      const lineById = new Map<number, OrderLineForLock>();
      linesRes.rows.forEach(r => lineById.set(Number(r.id), r));

      for (const it of request.items) {
        const line = lineById.get(Number(it.order_line_item_id));
        if (!line) {
          throw createError(`Line item ${it.order_line_item_id} not found`, 400);
        }
        if (it.quantity <= 0) {
          throw createError(`Quantity must be > 0 for ${line.product_name}`, 400);
        }
        const remaining = parseFloat(line.quantity) - parseFloat(line.delivered_qty);
        if (it.quantity > remaining + 1e-9) {
          throw createError(
            `Cannot ship ${it.quantity} of "${line.product_name}"; only ${remaining} remaining`,
            400
          );
        }
      }

      // 3. Generate delivery number
      const deliveryNumberRes = await client.query(
        "SELECT CONCAT('DLV-', TO_CHAR(CURRENT_DATE, 'YYYY'), '-', LPAD(NEXTVAL('delivery_number_sequence')::TEXT, 5, '0')) AS delivery_number"
      );
      const deliveryNumber: string = deliveryNumberRes.rows[0].delivery_number;

      // 4. Insert delivery header (factory_customer_id always; customer_order_id optional).
      const deliveryDate = request.delivery_date || new Date().toISOString().split('T')[0];
      const deliveryRes = await client.query(
        `INSERT INTO factory_customer_order_deliveries (
           delivery_number, factory_customer_id, customer_order_id, delivery_date,
           tracking_number, carrier, estimated_delivery_date,
           delivery_status, notes, shipped_by, vat_number,
           master_carton_for, master_carton_sub_label, distribution_center_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'shipped', $8, $9, $10, $11, $12, $13)
         RETURNING *`,
        [
          deliveryNumber,
          factoryCustomerId,
          primaryOrderId ?? null,
          deliveryDate,
          request.tracking_number || null,
          request.carrier || null,
          request.estimated_delivery_date || null,
          request.notes || null,
          userId,
          request.vat_number || null,
          request.master_carton_for?.trim() || null,
          request.master_carton_sub_label?.trim() || null,
          sourceDcId,
        ]
      );
      const delivery = deliveryRes.rows[0];

      // 5. Insert delivery items + bump rollups + debit stock.
      // Accumulate cost of goods sold for the per-delivery COGS voucher posted
      // after commit. Computed from products.cost_price × shipped qty.
      let deliveryCogs = 0;
      for (const it of request.items) {
        const line = lineById.get(Number(it.order_line_item_id))!;
        const unitPrice = parseFloat(line.unit_price);
        const lineTotal = +(unitPrice * it.quantity).toFixed(2);
        // bundles is now free text (e.g. "20 x 50"); preserve user formatting.
        const bundles =
          it.bundles != null && String(it.bundles).trim() !== ''
            ? String(it.bundles).trim()
            : null;
        const itemCode =
          it.item_code != null && String(it.item_code).trim() !== ''
            ? String(it.item_code).trim()
            : null;

        await client.query(
          `INSERT INTO factory_customer_order_delivery_items
             (delivery_id, order_line_item_id, quantity, unit_price_snapshot, line_total, bundles, item_code)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [delivery.id, line.id, it.quantity, unitPrice, lineTotal, bundles, itemCode]
        );

        await client.query(
          `UPDATE factory_customer_order_line_items
              SET delivered_qty = delivered_qty + $1,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $2`,
          [it.quantity, line.id]
        );

        const unitCost = await this.debitProductStock(client, line.product_id, it.quantity, line.product_name, sourceDcId);
        deliveryCogs += +(unitCost * it.quantity).toFixed(2);
      }
      deliveryCogs = +deliveryCogs.toFixed(2);

      // 6. Recompute status for EVERY touched order in one CTE.
      const touchedOrderIds = Array.from(
        new Set(linesRes.rows.map(r => Number(r.order_id)))
      );
      await client.query(
        `WITH totals AS (
           SELECT li.order_id,
                  COALESCE(SUM(li.quantity - li.delivered_qty), 0) AS pending,
                  COALESCE(SUM(li.delivered_qty), 0) AS shipped
             FROM factory_customer_order_line_items li
            WHERE li.order_id = ANY($1::bigint[])
            GROUP BY li.order_id
         )
         UPDATE factory_customer_orders co
            SET status = CASE
                           WHEN t.pending <= 0 THEN 'shipped'
                           WHEN t.shipped > 0 THEN 'partially_shipped'
                           ELSE co.status
                         END,
                shipped_at = CASE
                               WHEN t.pending <= 0 AND co.shipped_at IS NULL
                               THEN CURRENT_TIMESTAMP
                               ELSE co.shipped_at
                             END,
                shipped_by = CASE
                               WHEN t.pending <= 0 AND co.shipped_by IS NULL
                               THEN $2
                               ELSE co.shipped_by
                             END,
                updated_at = CURRENT_TIMESTAMP
           FROM totals t
          WHERE co.id = t.order_id`,
        [touchedOrderIds, userId]
      );

      // 7. Create the per-delivery invoice in the same transaction.
      const invoice = await SalesInvoiceMediator.createInvoiceFromDelivery(
        delivery.id,
        userId,
        client
      );

      await client.query('COMMIT');

      MyLogger.success(action, {
        deliveryId: delivery.id,
        deliveryNumber: delivery.delivery_number,
        factoryCustomerId,
        touchedOrderIds,
        invoiceId: invoice.id,
        deliveryCogs,
      });

      // Post per-delivery revenue recognition + COGS vouchers. Voucher creation
      // runs on its own DB connection (independent of this mediator's
      // transaction), so we fire it AFTER the commit. Failures are caught and
      // logged to the failed voucher queue without rolling back the delivery.
      const recognitionOrderId =
        primaryOrderId != null
          ? Number(primaryOrderId)
          : touchedOrderIds.length === 1
            ? touchedOrderIds[0]
            : null;

      if (recognitionOrderId != null && touchedOrderIds.length === 1) {
        try {
          const orderRes = await pool.query<{
            id: string;
            order_number: string;
            factory_customer_name: string;
            factory_customer_email: string | null;
            currency: string;
            order_date: Date;
            factory_id: number;
            factory_name: string | null;
            factory_cost_center_id: number | null;
          }>(
            `SELECT o.id, o.order_number, o.factory_customer_name, o.factory_customer_email,
                    o.currency, o.order_date, o.factory_id,
                    f.name AS factory_name,
                    f.cost_center_id AS factory_cost_center_id
               FROM factory_customer_orders o
               LEFT JOIN factories f ON f.id = o.factory_id
              WHERE o.id = $1`,
            [recognitionOrderId]
          );
          if (orderRes.rows.length > 0) {
            const o = orderRes.rows[0];
            const subtotal = Number(invoice.subtotal) || 0;
            const taxAmount = Number(invoice.tax_amount) || 0;
            const totalAmount = Number(invoice.total_amount) || subtotal + taxAmount;
            const orderData = {
              orderId: String(o.id),
              orderNumber: o.order_number,
              customerId: String(factoryCustomerId),
              customerName: o.factory_customer_name,
              customerEmail: o.factory_customer_email ?? undefined,
              totalValue: totalAmount,
              subtotal,
              taxAmount,
              currency: o.currency || 'BDT',
              orderDate:
                o.order_date instanceof Date
                  ? o.order_date.toISOString()
                  : String(o.order_date),
              factoryId: o.factory_id,
              factoryName: o.factory_name ?? undefined,
              factoryCostCenterId: o.factory_cost_center_id ?? undefined,
              deliveryId: Number(delivery.id),
              deliveryNumber: delivery.delivery_number,
              costOfGoodsSold: deliveryCogs,
            };
            await interModuleConnector.accModule.addFactoryOrderShipmentVoucher(
              orderData,
              userId
            );
          } else {
            MyLogger.warn(action, {
              message: 'Order not found for recognition; shipment vouchers skipped',
              recognitionOrderId,
            });
          }
        } catch (vErr: any) {
          MyLogger.warn(action, {
            message: 'Shipment voucher posting failed (delivery still committed)',
            error: vErr?.message,
            deliveryId: delivery.id,
            recognitionOrderId,
          });
        }
      } else if (touchedOrderIds.length > 1) {
        MyLogger.info(action, {
          message:
            'Multi-order delivery: per-order recognition not yet supported; shipment vouchers skipped',
          touchedOrderIds,
        });
      }

      const fullDelivery = await GetDeliveriesMediator.getDeliveryById(delivery.id);
      if (!fullDelivery) {
        throw createError('Failed to load created delivery', 500);
      }
      return { delivery: fullDelivery, invoice };
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { primaryOrderId });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Convenience: ship every remaining quantity in a single delivery. Used by
   * the legacy POST /:id/ship and POST /:id/generate-invoice endpoints.
   */
  static async shipAllRemaining(
    orderId: number | string,
    extras: Omit<CreateDeliveryRequest, 'items'>,
    userId: number
  ): Promise<{ delivery: Delivery; invoice: SalesInvoice }> {
    const remainingRes = await pool.query<{
      id: string;
      quantity: string;
      delivered_qty: string;
    }>(
      `SELECT id, quantity, delivered_qty
         FROM factory_customer_order_line_items
        WHERE order_id = $1`,
      [orderId]
    );

    const items = remainingRes.rows
      .map(r => ({
        order_line_item_id: Number(r.id),
        quantity: parseFloat(r.quantity) - parseFloat(r.delivered_qty),
      }))
      .filter(it => it.quantity > 1e-9);

    if (items.length === 0) {
      throw createError('No remaining quantity to ship on this order', 400);
    }

    return this.createPartialDelivery(orderId, { ...extras, items }, userId);
  }

  /**
   * Debit FG stock from the shipment's source DC. products.current_stock is
   * derived from product_locations by trigger, so we move the per-DC row (with
   * a friendly insufficient-stock guard) and return the product's cost_price
   * for the COGS voucher.
   */
  private static async debitProductStock(
    client: PoolClient,
    productId: number,
    quantity: number,
    productName: string,
    distributionCenterId: number
  ): Promise<number> {
    const costRes = await client.query<{ cost_price: string | null }>(
      'SELECT cost_price FROM products WHERE id = $1',
      [productId]
    );
    if (costRes.rows.length === 0) {
      throw createError(`Product ${productId} not found while debiting stock`, 404);
    }
    await debitLocationStock(client, productId, distributionCenterId, quantity, productName);
    return parseFloat(costRes.rows[0].cost_price || '0');
  }
}
