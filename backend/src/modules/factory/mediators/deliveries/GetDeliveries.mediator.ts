import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { Delivery, DeliveryItem } from '@/types/factory';

interface DeliveryRow {
  id: string;
  delivery_number: string;
  customer_order_id: string;
  order_number: string;
  invoice_id: string | null;
  invoice_number: string | null;
  delivery_date: string | Date;
  tracking_number: string | null;
  carrier: string | null;
  estimated_delivery_date: string | Date | null;
  delivery_status: 'shipped' | 'delivered' | 'returned' | 'cancelled';
  notes: string | null;
  shipped_by: string | null;
  created_at: string | Date;
  updated_at: string | Date | null;
}

interface DeliveryItemRow {
  id: string;
  delivery_id: string;
  order_line_item_id: string;
  product_id: string | null;
  product_name: string | null;
  product_sku: string | null;
  description: string | null;
  unit_of_measure: string | null;
  quantity: string;
  unit_price_snapshot: string;
  line_total: string;
  created_at: string | Date;
}

const SELECT_DELIVERY = `
  SELECT d.id, d.delivery_number, d.customer_order_id, co.order_number,
         d.invoice_id, inv.invoice_number,
         d.delivery_date, d.tracking_number, d.carrier, d.estimated_delivery_date,
         d.delivery_status, d.notes, d.shipped_by, d.created_at, d.updated_at
    FROM factory_customer_order_deliveries d
    JOIN factory_customer_orders co ON co.id = d.customer_order_id
    LEFT JOIN factory_sales_invoices inv ON inv.id = d.invoice_id
`;

export class GetDeliveriesMediator {
  static async listDeliveriesByOrder(orderId: number | string): Promise<Delivery[]> {
    const action = 'List Deliveries By Order';
    try {
      MyLogger.info(action, { orderId });
      const res = await pool.query<DeliveryRow>(
        `${SELECT_DELIVERY} WHERE d.customer_order_id = $1 ORDER BY d.created_at ASC`,
        [orderId]
      );

      if (res.rows.length === 0) return [];

      const deliveryIds = res.rows.map(r => Number(r.id));
      const itemsByDelivery = await this.loadItemsByDeliveryIds(deliveryIds);

      return res.rows.map(row => this.formatDelivery(row, itemsByDelivery.get(Number(row.id)) ?? []));
    } catch (error) {
      MyLogger.error(action, error, { orderId });
      throw error;
    }
  }

  static async getDeliveryById(deliveryId: number | string): Promise<Delivery | null> {
    const action = 'Get Delivery By Id';
    try {
      MyLogger.info(action, { deliveryId });
      const res = await pool.query<DeliveryRow>(`${SELECT_DELIVERY} WHERE d.id = $1`, [deliveryId]);
      if (res.rows.length === 0) return null;

      const items = await this.loadItemsByDeliveryIds([Number(deliveryId)]);
      return this.formatDelivery(res.rows[0], items.get(Number(deliveryId)) ?? []);
    } catch (error) {
      MyLogger.error(action, error, { deliveryId });
      throw error;
    }
  }

  private static async loadItemsByDeliveryIds(
    deliveryIds: number[]
  ): Promise<Map<number, DeliveryItem[]>> {
    if (deliveryIds.length === 0) return new Map();
    const itemsRes = await pool.query<DeliveryItemRow>(
      `SELECT di.id, di.delivery_id, di.order_line_item_id,
              li.product_id, li.product_name, li.product_sku,
              li.description, li.unit_of_measure,
              di.quantity, di.unit_price_snapshot, di.line_total, di.created_at
         FROM factory_customer_order_delivery_items di
         JOIN factory_customer_order_line_items li ON li.id = di.order_line_item_id
        WHERE di.delivery_id = ANY($1::bigint[])
        ORDER BY di.id ASC`,
      [deliveryIds]
    );

    const map = new Map<number, DeliveryItem[]>();
    for (const row of itemsRes.rows) {
      const did = Number(row.delivery_id);
      const list = map.get(did) ?? [];
      list.push({
        id: Number(row.id),
        delivery_id: did,
        order_line_item_id: Number(row.order_line_item_id),
        product_id: row.product_id ? Number(row.product_id) : undefined,
        product_name: row.product_name ?? undefined,
        product_sku: row.product_sku ?? undefined,
        description: row.description ?? undefined,
        unit_of_measure: row.unit_of_measure ?? undefined,
        quantity: parseFloat(row.quantity),
        unit_price_snapshot: parseFloat(row.unit_price_snapshot),
        line_total: parseFloat(row.line_total),
        created_at: typeof row.created_at === 'string' ? row.created_at : row.created_at.toISOString(),
      });
      map.set(did, list);
    }
    return map;
  }

  private static formatDelivery(row: DeliveryRow, items: DeliveryItem[]): Delivery {
    const subtotal = items.reduce((s, it) => s + it.line_total, 0);
    return {
      id: Number(row.id),
      delivery_number: row.delivery_number,
      customer_order_id: Number(row.customer_order_id),
      customer_order_number: row.order_number,
      invoice_id: row.invoice_id ? Number(row.invoice_id) : undefined,
      invoice_number: row.invoice_number ?? undefined,
      delivery_date:
        typeof row.delivery_date === 'string'
          ? row.delivery_date
          : row.delivery_date.toISOString().split('T')[0],
      tracking_number: row.tracking_number ?? undefined,
      carrier: row.carrier ?? undefined,
      estimated_delivery_date: row.estimated_delivery_date
        ? typeof row.estimated_delivery_date === 'string'
          ? row.estimated_delivery_date
          : row.estimated_delivery_date.toISOString().split('T')[0]
        : undefined,
      delivery_status: row.delivery_status,
      notes: row.notes ?? undefined,
      shipped_by: row.shipped_by ? Number(row.shipped_by) : undefined,
      items,
      subtotal: +subtotal.toFixed(2),
      created_at: typeof row.created_at === 'string' ? row.created_at : row.created_at.toISOString(),
      updated_at: row.updated_at
        ? typeof row.updated_at === 'string'
          ? row.updated_at
          : row.updated_at.toISOString()
        : undefined,
    };
  }
}
