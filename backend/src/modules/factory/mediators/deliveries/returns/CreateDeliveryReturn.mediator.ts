import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import { CreateDeliveryReturnRequest, DeliveryReturn } from '@/types/factory';
import { GetDeliveryReturnsMediator } from './GetDeliveryReturns.mediator';

interface DeliveryItemForReturn {
  id: number;
  order_line_item_id: number;
  quantity: string;
  returned_qty: string;
  unit_price_snapshot: string;
  product_id: number | null;
  product_name: string | null;
}

/**
 * Creates a delivery (challan) return in 'draft' status. No stock or accounting
 * effect happens here — that is deferred to approveDeliveryReturn. We still
 * validate requested quantities against (delivery line qty - already returned)
 * so an obviously-invalid return is rejected early; approval re-validates under
 * a row lock to guard against concurrent drafts.
 */
export class CreateDeliveryReturnMediator {
  static async createReturn(
    deliveryId: number | string,
    request: CreateDeliveryReturnRequest,
    userId: number
  ): Promise<DeliveryReturn> {
    const action = 'Create Delivery Return';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { deliveryId, items: request.items, userId });

      if (!request.items || request.items.length === 0) {
        throw createError('Return must include at least one line item', 400);
      }

      const deliveryRes = await client.query<{
        id: string;
        factory_customer_id: string;
        customer_order_id: string | null;
        delivery_status: string;
      }>(
        `SELECT id, factory_customer_id, customer_order_id, delivery_status
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
        throw createError('Cannot return a cancelled delivery', 400);
      }

      // Load the delivery lines being returned, scoped to this delivery.
      const deliveryItemIds = request.items.map(it => Number(it.delivery_item_id));
      const itemsRes = await client.query<DeliveryItemForReturn>(
        `SELECT di.id, di.order_line_item_id, di.quantity, di.returned_qty,
                di.unit_price_snapshot, li.product_id, li.product_name
           FROM factory_customer_order_delivery_items di
           JOIN factory_customer_order_line_items li ON li.id = di.order_line_item_id
          WHERE di.id = ANY($1::bigint[]) AND di.delivery_id = $2
          FOR UPDATE OF di`,
        [deliveryItemIds, deliveryId]
      );
      if (itemsRes.rows.length !== deliveryItemIds.length) {
        throw createError('One or more delivery line items not found on this delivery', 400);
      }
      const itemById = new Map<number, DeliveryItemForReturn>();
      itemsRes.rows.forEach(r => itemById.set(Number(r.id), r));

      // Insert header (total filled in after lines).
      const headerRes = await client.query<{ id: string }>(
        `INSERT INTO factory_delivery_returns
           (delivery_id, factory_customer_id, customer_order_id, return_date, return_reason, status, created_by, notes)
         VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), $5, 'draft', $6, $7)
         RETURNING id`,
        [
          deliveryId,
          delivery.factory_customer_id,
          delivery.customer_order_id,
          request.return_date || null,
          request.return_reason || 'other',
          userId,
          request.notes || null,
        ]
      );
      const returnId = Number(headerRes.rows[0].id);

      let totalReturnValue = 0;
      for (const reqItem of request.items) {
        const di = itemById.get(Number(reqItem.delivery_item_id))!;
        if (reqItem.returned_quantity <= 0) {
          throw createError(`Returned quantity must be > 0 for "${di.product_name ?? di.product_id}"`, 400);
        }
        const alreadyReturned = parseFloat(di.returned_qty);
        const delivered = parseFloat(di.quantity);
        const remaining = delivered - alreadyReturned;
        if (reqItem.returned_quantity > remaining + 1e-9) {
          throw createError(
            `Cannot return ${reqItem.returned_quantity} of "${di.product_name ?? di.product_id}"; only ${remaining} returnable`,
            400
          );
        }
        const unitPrice = parseFloat(di.unit_price_snapshot);
        const lineTotal = +(unitPrice * reqItem.returned_quantity).toFixed(2);
        totalReturnValue += lineTotal;

        await client.query(
          `INSERT INTO factory_delivery_return_items
             (return_id, delivery_item_id, order_line_item_id, product_id, product_name,
              returned_quantity, unit_price, line_total, condition, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            returnId,
            di.id,
            di.order_line_item_id,
            di.product_id,
            di.product_name,
            reqItem.returned_quantity,
            unitPrice,
            lineTotal,
            reqItem.condition || 'damaged',
            reqItem.notes || null,
          ]
        );
      }

      totalReturnValue = +totalReturnValue.toFixed(2);
      await client.query(
        `UPDATE factory_delivery_returns SET total_return_value = $1 WHERE id = $2`,
        [totalReturnValue, returnId]
      );

      await client.query('COMMIT');
      MyLogger.success(action, { returnId, deliveryId, totalReturnValue });

      const full = await GetDeliveryReturnsMediator.getById(returnId);
      if (!full) throw createError('Failed to load created return', 500);
      return full;
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { deliveryId });
      throw error;
    } finally {
      client.release();
    }
  }
}
