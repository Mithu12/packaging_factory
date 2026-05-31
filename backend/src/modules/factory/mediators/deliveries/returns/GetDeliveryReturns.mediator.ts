import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { DeliveryReturn, DeliveryReturnItem } from '@/types/factory';

interface ReturnRow {
  id: string;
  return_number: string;
  delivery_id: string;
  delivery_number: string | null;
  factory_customer_id: string;
  factory_customer_name: string | null;
  customer_order_id: string | null;
  return_date: string | Date;
  return_reason: string;
  status: 'draft' | 'approved' | 'rejected' | 'cancelled';
  total_return_value: string;
  currency: string | null;
  reversal_voucher_id: string | null;
  credit_note_voucher_id: string | null;
  accounting_integrated: boolean;
  created_by: string | null;
  approved_by: string | null;
  approved_at: string | Date | null;
  notes: string | null;
  created_at: string | Date;
  updated_at: string | Date | null;
}

interface ReturnItemRow {
  id: string;
  return_id: string;
  delivery_item_id: string;
  order_line_item_id: string;
  product_id: string | null;
  product_name: string | null;
  returned_quantity: string;
  unit_price: string;
  line_total: string;
  condition: string | null;
  notes: string | null;
  created_at: string | Date;
}

const SELECT_RETURN = `
  SELECT r.id, r.return_number, r.delivery_id, d.delivery_number,
         r.factory_customer_id, fc.name AS factory_customer_name,
         r.customer_order_id, r.return_date, r.return_reason, r.status,
         r.total_return_value, r.currency, r.reversal_voucher_id, r.credit_note_voucher_id,
         r.accounting_integrated, r.created_by, r.approved_by, r.approved_at, r.notes,
         r.created_at, r.updated_at
    FROM factory_delivery_returns r
    JOIN factory_customer_order_deliveries d ON d.id = r.delivery_id
    JOIN factory_customers fc ON fc.id = r.factory_customer_id
`;

export class GetDeliveryReturnsMediator {
  static async listByDelivery(deliveryId: number | string): Promise<DeliveryReturn[]> {
    const res = await pool.query<ReturnRow>(
      `${SELECT_RETURN} WHERE r.delivery_id = $1 ORDER BY r.created_at DESC`,
      [deliveryId]
    );
    return this.hydrate(res.rows);
  }

  static async listAll(params: {
    page?: number;
    limit?: number;
    status?: string;
    factory_customer_id?: string;
  }): Promise<{ returns: DeliveryReturn[]; total: number; page: number; limit: number }> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    if (params.status) {
      conditions.push(`r.status = $${values.length + 1}`);
      values.push(params.status);
    }
    if (params.factory_customer_id) {
      conditions.push(`r.factory_customer_id = $${values.length + 1}`);
      values.push(params.factory_customer_id);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM factory_delivery_returns r ${where}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.total ?? '0', 10);

    const res = await pool.query<ReturnRow>(
      `${SELECT_RETURN} ${where} ORDER BY r.created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return { returns: await this.hydrate(res.rows), total, page, limit };
  }

  static async getById(returnId: number | string): Promise<DeliveryReturn | null> {
    const res = await pool.query<ReturnRow>(`${SELECT_RETURN} WHERE r.id = $1`, [returnId]);
    if (res.rows.length === 0) return null;
    return (await this.hydrate(res.rows))[0];
  }

  private static async hydrate(rows: ReturnRow[]): Promise<DeliveryReturn[]> {
    if (rows.length === 0) return [];
    const ids = rows.map(r => Number(r.id));
    const itemsRes = await pool.query<ReturnItemRow>(
      `SELECT id, return_id, delivery_item_id, order_line_item_id, product_id, product_name,
              returned_quantity, unit_price, line_total, condition, notes, created_at
         FROM factory_delivery_return_items
        WHERE return_id = ANY($1::bigint[])
        ORDER BY id ASC`,
      [ids]
    );
    const itemsByReturn = new Map<number, DeliveryReturnItem[]>();
    for (const it of itemsRes.rows) {
      const list = itemsByReturn.get(Number(it.return_id)) ?? [];
      list.push({
        id: Number(it.id),
        return_id: Number(it.return_id),
        delivery_item_id: Number(it.delivery_item_id),
        order_line_item_id: Number(it.order_line_item_id),
        product_id: it.product_id != null ? Number(it.product_id) : undefined,
        product_name: it.product_name ?? undefined,
        returned_quantity: parseFloat(it.returned_quantity),
        unit_price: parseFloat(it.unit_price),
        line_total: parseFloat(it.line_total),
        condition: it.condition ?? undefined,
        notes: it.notes ?? undefined,
        created_at: String(it.created_at),
      });
      itemsByReturn.set(Number(it.return_id), list);
    }

    return rows.map(row => ({
      id: Number(row.id),
      return_number: row.return_number,
      delivery_id: Number(row.delivery_id),
      delivery_number: row.delivery_number ?? undefined,
      factory_customer_id: Number(row.factory_customer_id),
      factory_customer_name: row.factory_customer_name ?? undefined,
      customer_order_id: row.customer_order_id != null ? Number(row.customer_order_id) : undefined,
      return_date: String(row.return_date),
      return_reason: row.return_reason,
      status: row.status,
      total_return_value: parseFloat(row.total_return_value),
      currency: row.currency ?? undefined,
      reversal_voucher_id: row.reversal_voucher_id != null ? Number(row.reversal_voucher_id) : undefined,
      credit_note_voucher_id: row.credit_note_voucher_id != null ? Number(row.credit_note_voucher_id) : undefined,
      accounting_integrated: !!row.accounting_integrated,
      created_by: row.created_by != null ? Number(row.created_by) : undefined,
      approved_by: row.approved_by != null ? Number(row.approved_by) : undefined,
      approved_at: row.approved_at ? String(row.approved_at) : undefined,
      notes: row.notes ?? undefined,
      items: itemsByReturn.get(Number(row.id)) ?? [],
      created_at: String(row.created_at),
      updated_at: row.updated_at ? String(row.updated_at) : undefined,
    }));
  }
}
