import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { Delivery, DeliveryItem, TouchedOrder } from '@/types/factory';

interface DeliveryRow {
  id: string;
  delivery_number: string;
  factory_customer_id: string;
  factory_customer_name: string | null;
  customer_order_id: string | null;
  order_number: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  delivery_date: string | Date;
  tracking_number: string | null;
  carrier: string | null;
  estimated_delivery_date: string | Date | null;
  delivery_status: 'shipped' | 'delivered' | 'returned' | 'cancelled';
  notes: string | null;
  shipped_by: string | null;
  vat_number: string | null;
  touched_orders: unknown;
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
  ply: number | null;
  bundles: number | null;
  item_code: string | null;
  product_customer_item_code: string | null;
  created_at: string | Date;
}

const SELECT_DELIVERY = `
  SELECT d.id, d.delivery_number,
         d.factory_customer_id, fc.name AS factory_customer_name,
         d.customer_order_id, co.order_number,
         d.invoice_id, inv.invoice_number,
         d.delivery_date, d.tracking_number, d.carrier, d.estimated_delivery_date,
         d.delivery_status, d.notes, d.shipped_by, d.vat_number,
         d.created_at, d.updated_at,
         COALESCE(tos.touched_orders, '[]'::json) AS touched_orders
    FROM factory_customer_order_deliveries d
    JOIN factory_customers fc ON fc.id = d.factory_customer_id
    LEFT JOIN factory_customer_orders co ON co.id = d.customer_order_id
    LEFT JOIN factory_sales_invoices inv ON inv.id = d.invoice_id
    LEFT JOIN LATERAL (
      SELECT json_agg(o ORDER BY o.order_id) AS touched_orders
        FROM (
          SELECT DISTINCT
                 o2.id AS order_id,
                 o2.order_number,
                 o2.po_number,
                 o2.po_date
            FROM factory_customer_order_delivery_items di
            JOIN factory_customer_order_line_items li ON li.id = di.order_line_item_id
            JOIN factory_customer_orders o2 ON o2.id = li.order_id
           WHERE di.delivery_id = d.id
        ) o
    ) tos ON true
`;

export class GetDeliveriesMediator {
  static async listDeliveriesByOrder(orderId: number | string): Promise<Delivery[]> {
    const action = 'List Deliveries By Order';
    try {
      MyLogger.info(action, { orderId });
      // Include deliveries whose primary order is this one OR whose items reference
      // a line belonging to this order (multi-order shipments touch several orders).
      const res = await pool.query<DeliveryRow>(
        `${SELECT_DELIVERY}
          WHERE d.customer_order_id = $1
             OR EXISTS (
                  SELECT 1
                    FROM factory_customer_order_delivery_items di
                    JOIN factory_customer_order_line_items li ON li.id = di.order_line_item_id
                   WHERE di.delivery_id = d.id
                     AND li.order_id = $1
                )
          ORDER BY d.created_at ASC`,
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

  static async listDeliveriesByCustomer(customerId: number | string): Promise<Delivery[]> {
    const action = 'List Deliveries By Customer';
    try {
      MyLogger.info(action, { customerId });
      const res = await pool.query<DeliveryRow>(
        `${SELECT_DELIVERY} WHERE d.factory_customer_id = $1 ORDER BY d.created_at DESC`,
        [customerId]
      );

      if (res.rows.length === 0) return [];

      const deliveryIds = res.rows.map(r => Number(r.id));
      const itemsByDelivery = await this.loadItemsByDeliveryIds(deliveryIds);

      return res.rows.map(row => this.formatDelivery(row, itemsByDelivery.get(Number(row.id)) ?? []));
    } catch (error) {
      MyLogger.error(action, error, { customerId });
      throw error;
    }
  }

  /**
   * Paginated list of every delivery across all customers/orders. Used by the
   * top-level Deliveries page. Filters are optional and additive.
   */
  static async listAllDeliveries(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'shipped' | 'delivered' | 'returned' | 'cancelled';
    factory_customer_id?: string | number;
    factory_id?: string | number;
    date_from?: string;
    date_to?: string;
    sort_by?: 'delivery_date' | 'created_at' | 'delivery_number';
    sort_order?: 'asc' | 'desc';
  }): Promise<{
    deliveries: Delivery[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const action = 'List All Deliveries';
    const {
      page = 1,
      limit = 20,
      search,
      status,
      factory_customer_id,
      date_from,
      date_to,
      sort_by = 'delivery_date',
      sort_order = 'desc',
    } = params;

    const offset = (page - 1) * limit;
    const where: string[] = [];
    const args: unknown[] = [];
    let idx = 1;

    if (search) {
      where.push(`(d.delivery_number ILIKE $${idx} OR co.order_number ILIKE $${idx} OR fc.name ILIKE $${idx} OR inv.invoice_number ILIKE $${idx})`);
      args.push(`%${search}%`);
      idx++;
    }
    if (status) {
      where.push(`d.delivery_status = $${idx}`);
      args.push(status);
      idx++;
    }
    if (factory_customer_id) {
      where.push(`d.factory_customer_id = $${idx}`);
      args.push(factory_customer_id);
      idx++;
    }
    if (date_from) {
      where.push(`d.delivery_date >= $${idx}`);
      args.push(date_from);
      idx++;
    }
    if (date_to) {
      where.push(`d.delivery_date <= $${idx}`);
      args.push(date_to);
      idx++;
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const sortCol = ['delivery_date', 'created_at', 'delivery_number'].includes(sort_by) ? sort_by : 'delivery_date';
    const sortDir = sort_order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    try {
      MyLogger.info(action, { params });

      const countSql = `
        SELECT COUNT(*)::int AS total
          FROM factory_customer_order_deliveries d
          JOIN factory_customers fc ON fc.id = d.factory_customer_id
          LEFT JOIN factory_customer_orders co ON co.id = d.customer_order_id
          LEFT JOIN factory_sales_invoices inv ON inv.id = d.invoice_id
          ${whereSql}
      `;
      const countRes = await pool.query<{ total: number }>(countSql, args);
      const total = countRes.rows[0]?.total ?? 0;

      const dataSql = `
        ${SELECT_DELIVERY}
        ${whereSql}
        ORDER BY d.${sortCol} ${sortDir}, d.id ${sortDir}
        LIMIT $${idx} OFFSET $${idx + 1}
      `;
      const dataRes = await pool.query<DeliveryRow>(dataSql, [...args, limit, offset]);

      const deliveryIds = dataRes.rows.map(r => Number(r.id));
      const itemsByDelivery = await this.loadItemsByDeliveryIds(deliveryIds);
      const deliveries = dataRes.rows.map(r => this.formatDelivery(r, itemsByDelivery.get(Number(r.id)) ?? []));

      return {
        deliveries,
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      };
    } catch (error) {
      MyLogger.error(action, error, { params });
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
              di.quantity, di.unit_price_snapshot, di.line_total,
              p.ply,
              di.bundles,
              di.item_code,
              p.customer_item_code AS product_customer_item_code,
              di.created_at
         FROM factory_customer_order_delivery_items di
         JOIN factory_customer_order_line_items li ON li.id = di.order_line_item_id
         LEFT JOIN products p ON p.id = li.product_id
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
        ply: row.ply != null ? Number(row.ply) : null,
        bundles: row.bundles != null ? Number(row.bundles) : null,
        // Fall back to the product's customer_item_code when the per-shipment override is empty
        item_code: row.item_code ?? row.product_customer_item_code ?? null,
        created_at: typeof row.created_at === 'string' ? row.created_at : row.created_at.toISOString(),
      });
      map.set(did, list);
    }
    return map;
  }

  private static formatDelivery(row: DeliveryRow, items: DeliveryItem[]): Delivery {
    const subtotal = items.reduce((s, it) => s + it.line_total, 0);
    const touched = Array.isArray(row.touched_orders) ? row.touched_orders : [];
    const touchedOrders: TouchedOrder[] = touched.map((o: any) => ({
      order_id: Number(o.order_id),
      order_number: String(o.order_number),
      po_number: o.po_number ?? null,
      po_date: o.po_date
        ? (typeof o.po_date === 'string' ? o.po_date : new Date(o.po_date).toISOString().split('T')[0])
        : null,
    }));

    return {
      id: Number(row.id),
      delivery_number: row.delivery_number,
      factory_customer_id: Number(row.factory_customer_id),
      factory_customer_name: row.factory_customer_name ?? undefined,
      customer_order_id: row.customer_order_id ? Number(row.customer_order_id) : undefined,
      customer_order_number: row.order_number ?? undefined,
      touched_orders: touchedOrders,
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
      vat_number: row.vat_number ?? undefined,
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
