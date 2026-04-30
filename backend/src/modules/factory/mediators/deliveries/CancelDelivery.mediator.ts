import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import {
  Delivery,
  FactoryCustomerOrderStatus,
} from '@/types/factory';
import { GetDeliveriesMediator } from './GetDeliveries.mediator';

/**
 * Cancels a delivery: reverses qty rollups, returns stock, and cancels the
 * linked invoice. Voucher reversal is best-effort outside the txn.
 */
export class CancelDeliveryMediator {
  static async cancelDelivery(
    deliveryId: number | string,
    userId: number,
    reason?: string
  ): Promise<Delivery> {
    const action = 'Cancel Delivery';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { deliveryId, userId, reason });

      const deliveryRes = await client.query(
        `SELECT id, customer_order_id, delivery_status, invoice_id
           FROM factory_customer_order_deliveries
          WHERE id = $1
          FOR UPDATE`,
        [deliveryId]
      );
      if (deliveryRes.rows.length === 0) {
        throw createError('Delivery not found', 404);
      }
      const delivery = deliveryRes.rows[0];
      if (delivery.delivery_status === 'cancelled') {
        throw createError('Delivery is already cancelled', 400);
      }

      const itemsRes = await client.query(
        `SELECT di.order_line_item_id, di.quantity, li.product_id
           FROM factory_customer_order_delivery_items di
           JOIN factory_customer_order_line_items li ON li.id = di.order_line_item_id
          WHERE di.delivery_id = $1`,
        [deliveryId]
      );

      // 1. Reverse rollups + return stock
      for (const it of itemsRes.rows) {
        await client.query(
          `UPDATE factory_customer_order_line_items
              SET delivered_qty = delivered_qty - $1,
                  invoiced_qty  = GREATEST(invoiced_qty - $1, 0),
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $2`,
          [it.quantity, it.order_line_item_id]
        );
        await client.query(
          `UPDATE products
              SET current_stock = current_stock + $1,
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $2`,
          [it.quantity, it.product_id]
        );
      }

      // 2. Mark delivery cancelled (preserve audit history rather than delete)
      await client.query(
        `UPDATE factory_customer_order_deliveries
            SET delivery_status = 'cancelled',
                notes = CASE
                  WHEN $1::text IS NULL THEN notes
                  WHEN notes IS NULL THEN $1
                  ELSE notes || E'\nCancelled: ' || $1
                END,
                updated_at = CURRENT_TIMESTAMP
          WHERE id = $2`,
        [reason ?? null, deliveryId]
      );

      // 3. Cancel the linked invoice if any (only when no payments were taken)
      if (delivery.invoice_id) {
        const invRes = await client.query(
          'SELECT paid_amount, status FROM factory_sales_invoices WHERE id = $1 FOR UPDATE',
          [delivery.invoice_id]
        );
        if (invRes.rows.length > 0) {
          const inv = invRes.rows[0];
          if (parseFloat(inv.paid_amount) > 0) {
            throw createError(
              'Cannot cancel delivery: linked invoice has recorded payments. Refund payments first.',
              400
            );
          }
          await client.query(
            `UPDATE factory_sales_invoices
                SET status = 'cancelled',
                    updated_by = $1,
                    updated_at = CURRENT_TIMESTAMP
              WHERE id = $2`,
            [userId, delivery.invoice_id]
          );
        }
      }

      // 4. Recompute order status: if any line still has delivered_qty>0 -> partially_shipped, else completed
      const statRes = await client.query<{ pending: string; shipped_total: string }>(
        `SELECT COALESCE(SUM(quantity - delivered_qty), 0) AS pending,
                COALESCE(SUM(delivered_qty), 0) AS shipped_total
           FROM factory_customer_order_line_items
          WHERE order_id = $1`,
        [delivery.customer_order_id]
      );
      const pending = parseFloat(statRes.rows[0].pending);
      const shippedTotal = parseFloat(statRes.rows[0].shipped_total);
      const newStatus =
        pending <= 1e-9
          ? FactoryCustomerOrderStatus.SHIPPED
          : shippedTotal > 1e-9
            ? FactoryCustomerOrderStatus.PARTIALLY_SHIPPED
            : FactoryCustomerOrderStatus.COMPLETED;
      await client.query(
        'UPDATE factory_customer_orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [newStatus, delivery.customer_order_id]
      );

      await client.query('COMMIT');

      MyLogger.success(action, {
        deliveryId,
        invoiceId: delivery.invoice_id,
        newOrderStatus: newStatus,
      });

      const fullDelivery = await GetDeliveriesMediator.getDeliveryById(deliveryId);
      if (!fullDelivery) {
        throw createError('Failed to load cancelled delivery', 500);
      }
      return fullDelivery;
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { deliveryId });
      throw error;
    } finally {
      client.release();
    }
  }
}
