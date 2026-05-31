import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import {
  Cheque,
  ChequeQueryParams,
  ChequeStatus,
  CreateChequeRequest,
} from '@/types/accounts';

interface ChequeRow {
  id: string;
  cheque_no: string;
  cheque_date: string | Date;
  instrument_type: 'cheque' | 'pay_order';
  bank_account_id: string | null;
  bank_account_name: string | null;
  drawee_bank_name: string | null;
  payee: string;
  amount: string;
  currency: string | null;
  status: ChequeStatus;
  cleared_date: string | Date | null;
  voucher_id: string | null;
  voucher_no: string | null;
  memo: string | null;
  created_by: string | null;
  created_at: string | Date;
  updated_at: string | Date | null;
}

const SELECT_CHEQUE = `
  SELECT c.id, c.cheque_no, c.cheque_date, c.instrument_type,
         c.bank_account_id, ba.name AS bank_account_name,
         c.drawee_bank_name, c.payee, c.amount, c.currency, c.status, c.cleared_date,
         c.voucher_id, v.voucher_no, c.memo, c.created_by, c.created_at, c.updated_at
    FROM cheques c
    LEFT JOIN chart_of_accounts ba ON ba.id = c.bank_account_id
    LEFT JOIN vouchers v ON v.id = c.voucher_id
`;

function mapRow(r: ChequeRow): Cheque {
  return {
    id: Number(r.id),
    cheque_no: r.cheque_no,
    cheque_date: String(r.cheque_date),
    instrument_type: r.instrument_type,
    bank_account_id: r.bank_account_id != null ? Number(r.bank_account_id) : undefined,
    bank_account_name: r.bank_account_name ?? undefined,
    drawee_bank_name: r.drawee_bank_name ?? undefined,
    payee: r.payee,
    amount: parseFloat(r.amount),
    currency: r.currency ?? undefined,
    status: r.status,
    cleared_date: r.cleared_date ? String(r.cleared_date) : undefined,
    voucher_id: r.voucher_id != null ? Number(r.voucher_id) : undefined,
    voucher_no: r.voucher_no ?? undefined,
    memo: r.memo ?? undefined,
    created_by: r.created_by != null ? Number(r.created_by) : undefined,
    created_at: String(r.created_at),
    updated_at: r.updated_at ? String(r.updated_at) : undefined,
  };
}

export class ChequeMediator {
  static async create(data: CreateChequeRequest, userId: number): Promise<Cheque> {
    const action = 'Create Cheque';
    MyLogger.info(action, { data, userId });
    if (!data.cheque_no || !data.payee) {
      throw createError('cheque_no and payee are required', 400);
    }
    const res = await pool.query<{ id: string }>(
      `INSERT INTO cheques
         (cheque_no, cheque_date, instrument_type, bank_account_id, drawee_bank_name,
          payee, amount, currency, voucher_id, memo, created_by)
       VALUES ($1, COALESCE($2::date, CURRENT_DATE), COALESCE($3, 'cheque'), $4, $5, $6, $7, COALESCE($8, 'BDT'), $9, $10, $11)
       RETURNING id`,
      [
        data.cheque_no,
        data.cheque_date || null,
        data.instrument_type || null,
        data.bank_account_id ?? null,
        data.drawee_bank_name || null,
        data.payee,
        data.amount ?? 0,
        data.currency || null,
        data.voucher_id ?? null,
        data.memo || null,
        userId,
      ]
    );
    const created = await this.getById(Number(res.rows[0].id));
    if (!created) throw createError('Failed to load created cheque', 500);
    MyLogger.success(action, { chequeId: created.id });
    return created;
  }

  static async list(params: ChequeQueryParams): Promise<{ cheques: Cheque[]; total: number; page: number; limit: number }> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    if (params.status) { conditions.push(`c.status = $${values.length + 1}`); values.push(params.status); }
    if (params.instrument_type) { conditions.push(`c.instrument_type = $${values.length + 1}`); values.push(params.instrument_type); }
    if (params.bank_account_id) { conditions.push(`c.bank_account_id = $${values.length + 1}`); values.push(params.bank_account_id); }
    if (params.search) {
      conditions.push(`(c.cheque_no ILIKE $${values.length + 1} OR c.payee ILIKE $${values.length + 1})`);
      values.push(`%${params.search}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM cheques c ${where}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.total ?? '0', 10);

    const res = await pool.query<ChequeRow>(
      `${SELECT_CHEQUE} ${where} ORDER BY c.cheque_date DESC, c.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );
    return { cheques: res.rows.map(mapRow), total, page, limit };
  }

  static async getById(id: number | string): Promise<Cheque | null> {
    const res = await pool.query<ChequeRow>(`${SELECT_CHEQUE} WHERE c.id = $1`, [id]);
    return res.rows.length ? mapRow(res.rows[0]) : null;
  }

  static async updateStatus(
    id: number | string,
    status: ChequeStatus,
    clearedDate: string | undefined,
    userId: number
  ): Promise<Cheque> {
    const action = 'Update Cheque Status';
    MyLogger.info(action, { id, status, userId });

    const current = await this.getById(id);
    if (!current) throw createError('Cheque not found', 404);
    if (current.status === 'cleared' || current.status === 'cancelled') {
      throw createError(`Cheque is already ${current.status}; status cannot change`, 400);
    }

    // 'cleared' stamps cleared_date (defaults to today); other statuses clear it.
    const setClearedDate = status === 'cleared';
    const res = await pool.query<ChequeRow>(
      `UPDATE cheques
          SET status = $1,
              cleared_date = CASE WHEN $2 THEN COALESCE($3::date, CURRENT_DATE) ELSE NULL END,
              updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
        RETURNING id`,
      [status, setClearedDate, clearedDate || null, id]
    );
    if (res.rows.length === 0) throw createError('Cheque not found', 404);
    const updated = await this.getById(id);
    if (!updated) throw createError('Failed to reload cheque', 500);
    MyLogger.success(action, { chequeId: updated.id, status });
    return updated;
  }
}
