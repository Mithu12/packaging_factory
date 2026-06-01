import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import {
  Delivery,
  FactoryCustomerOrderStatus,
} from '@/types/factory';
import { GetDeliveriesMediator } from './GetDeliveries.mediator';
import { interModuleConnector } from '@/utils/InterModuleConnector';
import { creditLocationStock, resolvePrimaryDcId } from '@/utils/stockLocations';

/**
 * Cancels a delivery: reverses qty rollups, returns stock, cancels the linked
 * invoice, clears the order's invoice pointer, recomputes status for every
 * order the delivery touched (multi-order shipments), and posts a balanced
 * reversing journal for the original shipment voucher.
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
        `SELECT id, customer_order_id, delivery_status, invoice_id, distribution_center_id
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

      // 1. Reverse rollups + return stock to the DC the shipment was picked from
      //    (products.current_stock follows via the product_locations trigger).
      const restoreDcId = delivery.distribution_center_id
        ? Number(delivery.distribution_center_id)
        : await resolvePrimaryDcId(client);
      for (const it of itemsRes.rows) {
        await client.query(
          `UPDATE factory_customer_order_line_items
              SET delivered_qty = delivered_qty - $1,
                  invoiced_qty  = GREATEST(invoiced_qty - $1, 0),
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $2`,
          [it.quantity, it.order_line_item_id]
        );
        await creditLocationStock(client, Number(it.product_id), restoreDcId, Number(it.quantity));
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

      // 3. Identify every order the delivery touched so we can clear invoice
      //    pointers and recompute statuses for all of them (multi-order V145+).
      const lineItemIds = Array.from(
        new Set(itemsRes.rows.map(r => Number(r.order_line_item_id))),
      );
      const touchedOrdersRes = await client.query<{ order_id: string }>(
        `SELECT DISTINCT li.order_id
           FROM factory_customer_order_line_items li
          WHERE li.id = ANY($1::bigint[])`,
        [lineItemIds],
      );
      const orderIds = touchedOrdersRes.rows.map(r => Number(r.order_id));

      // 4. Cancel the linked invoice if any (only when no payments were taken).
      let voucherIdToReverse: number | null = null;
      if (delivery.invoice_id) {
        const invRes = await client.query<{
          paid_amount: string;
          status: string;
          voucher_id: string | null;
        }>(
          'SELECT paid_amount, status, voucher_id FROM factory_sales_invoices WHERE id = $1 FOR UPDATE',
          [delivery.invoice_id],
        );
        if (invRes.rows.length > 0) {
          const inv = invRes.rows[0];
          if (parseFloat(inv.paid_amount) > 0) {
            throw createError(
              'Cannot cancel delivery: linked invoice has recorded payments. Refund payments first.',
              400,
            );
          }
          await client.query(
            `UPDATE factory_sales_invoices
                SET status = 'cancelled',
                    updated_by = $1,
                    updated_at = CURRENT_TIMESTAMP
              WHERE id = $2`,
            [userId, delivery.invoice_id],
          );
          voucherIdToReverse = inv.voucher_id ? Number(inv.voucher_id) : null;

          // Clear the invoice pointer on every touched order that pointed at
          // this now-cancelled invoice. CreateDelivery sets this via COALESCE
          // so orders may still hold the reference even after invoice cancel.
          if (orderIds.length > 0) {
            await client.query(
              `UPDATE factory_customer_orders
                  SET invoice_id = NULL,
                      updated_at = CURRENT_TIMESTAMP
                WHERE id = ANY($1::bigint[])
                  AND invoice_id = $2`,
              [orderIds, delivery.invoice_id],
            );
          }
        }
      }

      // 5. Recompute order status for every touched order. A delivery that
      //    spans multiple orders must update each one individually.
      const orderStatuses: Array<{ orderId: number; status: string }> = [];
      for (const orderId of orderIds) {
        const statRes = await client.query<{ pending: string; shipped_total: string }>(
          `SELECT COALESCE(SUM(quantity - delivered_qty), 0) AS pending,
                  COALESCE(SUM(delivered_qty), 0) AS shipped_total
             FROM factory_customer_order_line_items
            WHERE order_id = $1`,
          [orderId],
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
          [newStatus, orderId],
        );
        orderStatuses.push({ orderId, status: newStatus });
      }

      await client.query('COMMIT');

      // 6. Post a balanced reversing journal for the original shipment voucher.
      //    Runs post-commit so a voucher posting hiccup never blocks the user's
      //    cancellation; on failure the helper logs to voucher_failures.
      let reversalVoucher: { voucherId: number; voucherNo: string } | null = null;
      if (voucherIdToReverse) {
        reversalVoucher = await interModuleConnector.accModule.reverseVoucherById(
          voucherIdToReverse,
          reason ?? `Delivery ${deliveryId} cancelled`,
          userId,
        );
      }

      MyLogger.success(action, {
        deliveryId,
        invoiceId: delivery.invoice_id,
        reversalVoucher,
        orderStatuses,
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
