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

interface OrderLineForLock {
  id: number;
  product_id: number;
  product_name: string;
  unit_price: string;
  quantity: string;
  delivered_qty: string;
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
    orderId: number | string,
    request: CreateDeliveryRequest,
    userId: number
  ): Promise<{ delivery: Delivery; invoice: SalesInvoice }> {
    const action = 'Create Partial Delivery';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { orderId, items: request.items, userId });

      if (!request.items || request.items.length === 0) {
        throw createError('Delivery must include at least one line item', 400);
      }

      // 1. Load + status-gate the order
      const orderRes = await client.query(
        'SELECT id, status, order_number FROM factory_customer_orders WHERE id = $1 FOR UPDATE',
        [orderId]
      );
      if (orderRes.rows.length === 0) {
        throw createError('Customer order not found', 404);
      }
      const order = orderRes.rows[0];
      const allowedStatuses = [
        FactoryCustomerOrderStatus.COMPLETED,
        FactoryCustomerOrderStatus.PARTIALLY_SHIPPED,
      ];
      if (!allowedStatuses.includes(order.status)) {
        throw createError(
          `Cannot create delivery for order in '${order.status}' status. Order must be 'completed' or 'partially_shipped'.`,
          400
        );
      }

      // 2. Lock the relevant line items and validate qty
      const lineIds = request.items.map(it => it.order_line_item_id);
      const linesRes = await client.query<OrderLineForLock>(
        `SELECT id, product_id, product_name, unit_price, quantity, delivered_qty
           FROM factory_customer_order_line_items
          WHERE order_id = $1 AND id = ANY($2::bigint[])
          FOR UPDATE`,
        [orderId, lineIds]
      );
      if (linesRes.rows.length !== lineIds.length) {
        throw createError('One or more line items do not belong to this order', 400);
      }

      const lineById = new Map<number, OrderLineForLock>();
      linesRes.rows.forEach(r => lineById.set(Number(r.id), r));

      // Validate requested qty per line
      for (const it of request.items) {
        const line = lineById.get(Number(it.order_line_item_id));
        if (!line) {
          throw createError(`Line item ${it.order_line_item_id} not found on order`, 400);
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

      // 4. Insert delivery header
      const deliveryDate = request.delivery_date || new Date().toISOString().split('T')[0];
      const deliveryRes = await client.query(
        `INSERT INTO factory_customer_order_deliveries (
           delivery_number, customer_order_id, delivery_date,
           tracking_number, carrier, estimated_delivery_date,
           delivery_status, notes, shipped_by
         ) VALUES ($1, $2, $3, $4, $5, $6, 'shipped', $7, $8)
         RETURNING *`,
        [
          deliveryNumber,
          orderId,
          deliveryDate,
          request.tracking_number || null,
          request.carrier || null,
          request.estimated_delivery_date || null,
          request.notes || null,
          userId,
        ]
      );
      const delivery = deliveryRes.rows[0];

      // 5. Insert delivery items + bump rollups + debit stock
      for (const it of request.items) {
        const line = lineById.get(Number(it.order_line_item_id))!;
        const unitPrice = parseFloat(line.unit_price);
        const lineTotal = +(unitPrice * it.quantity).toFixed(2);

        await client.query(
          `INSERT INTO factory_customer_order_delivery_items
             (delivery_id, order_line_item_id, quantity, unit_price_snapshot, line_total)
           VALUES ($1, $2, $3, $4, $5)`,
          [delivery.id, line.id, it.quantity, unitPrice, lineTotal]
        );

        await client.query(
          `UPDATE factory_customer_order_line_items
              SET delivered_qty = delivered_qty + $1,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $2`,
          [it.quantity, line.id]
        );

        await this.debitProductStock(client, line.product_id, it.quantity, line.product_name);
      }

      // 6. Recompute order status. Look at ALL lines on the order, not just the ones touched.
      const remainingRes = await client.query<{ pending: string }>(
        `SELECT COALESCE(SUM(quantity - delivered_qty), 0) AS pending
           FROM factory_customer_order_line_items
          WHERE order_id = $1`,
        [orderId]
      );
      const stillPending = parseFloat(remainingRes.rows[0].pending);

      const newStatus =
        stillPending <= 1e-9
          ? FactoryCustomerOrderStatus.SHIPPED
          : FactoryCustomerOrderStatus.PARTIALLY_SHIPPED;

      const statusUpdateFields: string[] = ['status = $1', 'updated_at = CURRENT_TIMESTAMP'];
      const statusParams: unknown[] = [newStatus];
      if (newStatus === FactoryCustomerOrderStatus.SHIPPED) {
        statusUpdateFields.push('shipped_at = CURRENT_TIMESTAMP', `shipped_by = $${statusParams.length + 1}`);
        statusParams.push(userId);
      }
      statusParams.push(orderId);
      await client.query(
        `UPDATE factory_customer_orders SET ${statusUpdateFields.join(', ')} WHERE id = $${statusParams.length}`,
        statusParams
      );

      // 7. Create the per-delivery invoice in the same transaction.
      const invoice = await SalesInvoiceMediator.createInvoiceFromDelivery(
        delivery.id,
        userId,
        client
      );

      await client.query('COMMIT');

      MyLogger.success(action, {
        orderId,
        deliveryId: delivery.id,
        deliveryNumber: delivery.delivery_number,
        invoiceId: invoice.id,
        newOrderStatus: newStatus,
      });

      const fullDelivery = await GetDeliveriesMediator.getDeliveryById(delivery.id);
      if (!fullDelivery) {
        // Should never happen since we just created it
        throw createError('Failed to load created delivery', 500);
      }
      return { delivery: fullDelivery, invoice };
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { orderId });
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
   * Debit FG stock symmetrically to creditWorkOrderProductStock. Honors the
   * existing products.current_stock >= 0 CHECK constraint via a guard query;
   * postgres will also enforce it but we want a friendlier error.
   */
  private static async debitProductStock(
    client: PoolClient,
    productId: number,
    quantity: number,
    productName: string
  ): Promise<void> {
    const stockRes = await client.query<{ current_stock: string }>(
      'SELECT current_stock FROM products WHERE id = $1 FOR UPDATE',
      [productId]
    );
    if (stockRes.rows.length === 0) {
      throw createError(`Product ${productId} not found while debiting stock`, 404);
    }
    const current = parseFloat(stockRes.rows[0].current_stock);
    if (current < quantity - 1e-9) {
      throw createError(
        `Insufficient stock for "${productName}": have ${current}, need ${quantity}`,
        400
      );
    }
    await client.query(
      `UPDATE products
          SET current_stock = current_stock - $1,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $2`,
      [quantity, productId]
    );
  }
}
