import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import { DeliveryReturn, FactoryCustomerOrderStatus } from '@/types/factory';
import { GetDeliveryReturnsMediator } from './GetDeliveryReturns.mediator';
import { interModuleConnector } from '@/utils/InterModuleConnector';

interface ReturnItemForApproval {
  delivery_item_id: number;
  order_line_item_id: number;
  product_id: number | null;
  product_name: string | null;
  returned_quantity: string;
}

/**
 * Approve / reject / cancel a delivery return.
 *
 * Approval mirrors CancelDelivery's reversal, scoped to the returned quantities:
 *   - credit products.current_stock back
 *   - reduce the touched order lines' delivered_qty / invoiced_qty rollups
 *   - bump delivery_items.returned_qty (the over-return guard)
 *   - mark the delivery 'returned' once every line is fully returned
 *   - recompute each touched order's status
 *   - post a credit-note + inventory-restoration voucher pair (post-commit)
 */
export class UpdateDeliveryReturnMediator {
  static async approve(returnId: number | string, userId: number): Promise<DeliveryReturn> {
    const action = 'Approve Delivery Return';
    const client = await pool.connect();
    let accountingPayload:
      | {
          returnId: string;
          returnNumber: string;
          deliveryId: number;
          deliveryNumber: string | null;
          customerId: string;
          customerName: string;
          customerOrderId: number | null;
          totalReturnValue: number;
          currency: string;
          returnDate: string;
          returnReason: string;
        }
      | null = null;

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { returnId, userId });

      const retRes = await client.query<{
        id: string;
        delivery_id: string;
        factory_customer_id: string;
        customer_order_id: string | null;
        distribution_center_id: string | null;
        status: string;
        return_number: string;
        return_date: string | Date;
        return_reason: string;
        total_return_value: string;
        currency: string | null;
      }>(
        `SELECT id, delivery_id, factory_customer_id, customer_order_id, distribution_center_id,
                status, return_number, return_date, return_reason, total_return_value, currency
           FROM factory_delivery_returns
          WHERE id = $1
          FOR UPDATE`,
        [returnId]
      );
      if (retRes.rows.length === 0) throw createError('Delivery return not found', 404);
      const ret = retRes.rows[0];
      if (ret.status !== 'draft') {
        throw createError(`Only draft returns can be approved (current: ${ret.status})`, 400);
      }
      const dcId = ret.distribution_center_id != null ? Number(ret.distribution_center_id) : null;

      const itemsRes = await client.query<ReturnItemForApproval>(
        `SELECT delivery_item_id, order_line_item_id, product_id, product_name, returned_quantity
           FROM factory_delivery_return_items
          WHERE return_id = $1`,
        [returnId]
      );

      // 1. Per-line reversal: re-validate, bump returned_qty, reduce rollups, credit stock.
      for (const it of itemsRes.rows) {
        const qty = parseFloat(it.returned_quantity);

        const diRes = await client.query<{ quantity: string; returned_qty: string }>(
          `SELECT quantity, returned_qty
             FROM factory_customer_order_delivery_items
            WHERE id = $1
            FOR UPDATE`,
          [it.delivery_item_id]
        );
        if (diRes.rows.length === 0) {
          throw createError(`Delivery item ${it.delivery_item_id} not found`, 400);
        }
        const remaining = parseFloat(diRes.rows[0].quantity) - parseFloat(diRes.rows[0].returned_qty);
        if (qty > remaining + 1e-9) {
          throw createError(
            `Cannot approve: "${it.product_name ?? it.product_id}" would over-return (only ${remaining} returnable)`,
            400
          );
        }

        await client.query(
          `UPDATE factory_customer_order_delivery_items
              SET returned_qty = returned_qty + $1
            WHERE id = $2`,
          [qty, it.delivery_item_id]
        );

        await client.query(
          `UPDATE factory_customer_order_line_items
              SET delivered_qty = GREATEST(delivered_qty - $1, 0),
                  invoiced_qty  = GREATEST(invoiced_qty - $1, 0),
                  updated_at = CURRENT_TIMESTAMP
            WHERE id = $2`,
          [qty, it.order_line_item_id]
        );

        if (it.product_id != null) {
          // Global aggregate stock.
          await client.query(
            `UPDATE products
                SET current_stock = current_stock + $1,
                    updated_at = CURRENT_TIMESTAMP
              WHERE id = $2`,
            [qty, it.product_id]
          );
          // Per-DC stock: upsert the destination DC's product_locations row
          // (mirrors the GRN restock pattern). Skipped if no DC is resolved.
          if (dcId != null) {
            await client.query(
              `INSERT INTO product_locations (product_id, distribution_center_id, current_stock, last_movement_date)
               VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
               ON CONFLICT (product_id, distribution_center_id)
               DO UPDATE SET current_stock = product_locations.current_stock + EXCLUDED.current_stock,
                             last_movement_date = CURRENT_TIMESTAMP,
                             updated_at = CURRENT_TIMESTAMP`,
              [it.product_id, dcId, qty]
            );
          }
        }
      }

      // 2. Mark the delivery 'returned' once every line on it is fully returned.
      const fullyReturnedRes = await client.query<{ pending: string }>(
        `SELECT COALESCE(SUM(quantity - returned_qty), 0) AS pending
           FROM factory_customer_order_delivery_items
          WHERE delivery_id = $1`,
        [ret.delivery_id]
      );
      if (parseFloat(fullyReturnedRes.rows[0].pending) <= 1e-9) {
        await client.query(
          `UPDATE factory_customer_order_deliveries
              SET delivery_status = 'returned', updated_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND delivery_status <> 'cancelled'`,
          [ret.delivery_id]
        );
      }

      // 3. Recompute status for every touched order (same logic as CancelDelivery).
      const orderIdsRes = await client.query<{ order_id: string }>(
        `SELECT DISTINCT li.order_id
           FROM factory_delivery_return_items ri
           JOIN factory_customer_order_line_items li ON li.id = ri.order_line_item_id
          WHERE ri.return_id = $1`,
        [returnId]
      );
      for (const { order_id } of orderIdsRes.rows) {
        const statRes = await client.query<{ pending: string; shipped_total: string }>(
          `SELECT COALESCE(SUM(quantity - delivered_qty), 0) AS pending,
                  COALESCE(SUM(delivered_qty), 0) AS shipped_total
             FROM factory_customer_order_line_items
            WHERE order_id = $1`,
          [order_id]
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
          [newStatus, order_id]
        );
      }

      // 4. Approve the return.
      await client.query(
        `UPDATE factory_delivery_returns
            SET status = 'approved', approved_by = $1, approved_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
          WHERE id = $2`,
        [userId, returnId]
      );

      // Gather accounting context while still in the transaction.
      const ctxRes = await client.query<{ delivery_number: string | null; customer_name: string | null }>(
        `SELECT d.delivery_number, fc.name AS customer_name
           FROM factory_customer_order_deliveries d
           JOIN factory_customers fc ON fc.id = d.factory_customer_id
          WHERE d.id = $1`,
        [ret.delivery_id]
      );
      accountingPayload = {
        returnId: String(returnId),
        returnNumber: ret.return_number,
        deliveryId: Number(ret.delivery_id),
        deliveryNumber: ctxRes.rows[0]?.delivery_number ?? null,
        customerId: String(ret.factory_customer_id),
        customerName: ctxRes.rows[0]?.customer_name ?? 'Customer',
        customerOrderId: ret.customer_order_id != null ? Number(ret.customer_order_id) : null,
        totalReturnValue: parseFloat(ret.total_return_value),
        currency: ret.currency || 'BDT',
        returnDate:
          ret.return_date instanceof Date ? ret.return_date.toISOString() : String(ret.return_date),
        returnReason: ret.return_reason,
      };

      await client.query('COMMIT');
      MyLogger.success(action, { returnId, deliveryId: ret.delivery_id });
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { returnId });
      throw error;
    } finally {
      client.release();
    }

    // 5. Post the reversal vouchers AFTER commit. Voucher posting runs on its own
    //    connection and must never roll back an already-approved return; failures
    //    are logged to the voucher-failure queue inside the integration service.
    if (accountingPayload && accountingPayload.totalReturnValue > 0) {
      try {
        await interModuleConnector.accModule.addDeliveryReturnVoucher(accountingPayload, userId);
      } catch (vErr: any) {
        MyLogger.warn(action, {
          message: 'Delivery return voucher posting failed (return still approved)',
          error: vErr?.message,
          returnId,
        });
      }
    }

    const full = await GetDeliveryReturnsMediator.getById(returnId);
    if (!full) throw createError('Failed to load approved return', 500);
    return full;
  }

  static async setStatus(
    returnId: number | string,
    status: 'rejected' | 'cancelled',
    userId: number
  ): Promise<DeliveryReturn> {
    const action = `Delivery Return -> ${status}`;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const res = await client.query<{ status: string }>(
        `SELECT status FROM factory_delivery_returns WHERE id = $1 FOR UPDATE`,
        [returnId]
      );
      if (res.rows.length === 0) throw createError('Delivery return not found', 404);
      if (res.rows[0].status !== 'draft') {
        throw createError(
          `Only draft returns can be ${status} (current: ${res.rows[0].status})`,
          400
        );
      }
      await client.query(
        `UPDATE factory_delivery_returns SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
        [status, returnId]
      );
      await client.query('COMMIT');
      MyLogger.success(action, { returnId, userId });
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { returnId });
      throw error;
    } finally {
      client.release();
    }
    const full = await GetDeliveryReturnsMediator.getById(returnId);
    if (!full) throw createError('Failed to load return', 500);
    return full;
  }
}
