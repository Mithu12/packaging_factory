import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import {
  BankReconciliation,
  ReconciliationEntry,
  SaveReconciliationRequest,
  StartReconciliationResult,
} from '@/types/accounts';

interface ReconRow {
  id: string;
  bank_account_id: string;
  bank_account_name: string | null;
  statement_date: string | Date;
  statement_balance: string;
  book_balance: string;
  reconciled_balance: string;
  difference: string;
  status: 'in_progress' | 'completed';
  notes: string | null;
  created_by: string | null;
  completed_at: string | Date | null;
  created_at: string | Date;
  updated_at: string | Date | null;
}

export class BankReconciliationMediator {
  /**
   * Load the ledger entries for a bank account up to a statement date, flagging
   * which are already cleared by a prior reconciliation. Also returns the book
   * balance (SUM debit - credit) for the account as of that date.
   */
  static async start(
    bankAccountId: number,
    statementDate: string
  ): Promise<StartReconciliationResult> {
    const action = 'Start Bank Reconciliation';
    MyLogger.info(action, { bankAccountId, statementDate });

    const acctRes = await pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM chart_of_accounts WHERE id = $1`,
      [bankAccountId]
    );
    if (acctRes.rows.length === 0) throw createError('Bank account not found', 404);

    const entriesRes = await pool.query<{
      id: string;
      date: string | Date;
      voucher_no: string | null;
      description: string;
      debit: string;
      credit: string;
      already_cleared: boolean;
    }>(
      `SELECT le.id, le.date, le.voucher_no, le.description, le.debit, le.credit,
              EXISTS (
                SELECT 1 FROM bank_reconciliation_lines rl
                  JOIN bank_reconciliations r ON r.id = rl.reconciliation_id
                 WHERE rl.ledger_entry_id = le.id AND rl.is_cleared = TRUE
                   AND r.status = 'completed'
              ) AS already_cleared
         FROM ledger_entries le
        WHERE le.account_id = $1 AND le.date <= $2::date
        ORDER BY le.date ASC, le.id ASC`,
      [bankAccountId, statementDate]
    );

    const entries: ReconciliationEntry[] = entriesRes.rows.map(r => ({
      ledger_entry_id: Number(r.id),
      date: String(r.date),
      voucher_no: r.voucher_no ?? undefined,
      description: r.description,
      debit: parseFloat(r.debit) || 0,
      credit: parseFloat(r.credit) || 0,
      already_cleared: !!r.already_cleared,
    }));

    const bookBalance = entries.reduce((acc, e) => acc + e.debit - e.credit, 0);

    return {
      bank_account_id: bankAccountId,
      bank_account_name: acctRes.rows[0].name,
      statement_date: statementDate,
      book_balance: +bookBalance.toFixed(2),
      entries,
    };
  }

  /**
   * Persist a reconciliation: record the cleared entries, compute the cleared
   * (reconciled) balance and its difference from the statement balance.
   */
  static async save(data: SaveReconciliationRequest, userId: number): Promise<BankReconciliation> {
    const action = 'Save Bank Reconciliation';
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { data, userId });

      const acctRes = await client.query(`SELECT id FROM chart_of_accounts WHERE id = $1`, [
        data.bank_account_id,
      ]);
      if (acctRes.rows.length === 0) throw createError('Bank account not found', 404);

      const clearedIds = Array.from(new Set((data.cleared_ledger_entry_ids ?? []).map(Number)));

      // Book balance over all entries up to the statement date.
      const bookRes = await client.query<{ book_balance: string }>(
        `SELECT COALESCE(SUM(debit - credit), 0) AS book_balance
           FROM ledger_entries
          WHERE account_id = $1 AND date <= $2::date`,
        [data.bank_account_id, data.statement_date]
      );
      const bookBalance = parseFloat(bookRes.rows[0].book_balance) || 0;

      // Cleared balance over the ticked entries (validated to belong to this account).
      let reconciledBalance = 0;
      if (clearedIds.length > 0) {
        const clearedRes = await client.query<{ reconciled: string; cnt: string }>(
          `SELECT COALESCE(SUM(debit - credit), 0) AS reconciled, COUNT(*)::text AS cnt
             FROM ledger_entries
            WHERE id = ANY($1::bigint[]) AND account_id = $2`,
          [clearedIds, data.bank_account_id]
        );
        if (parseInt(clearedRes.rows[0].cnt, 10) !== clearedIds.length) {
          throw createError('One or more cleared entries do not belong to this account', 400);
        }
        reconciledBalance = parseFloat(clearedRes.rows[0].reconciled) || 0;
      }

      const statementBalance = Number(data.statement_balance) || 0;
      const difference = +(statementBalance - reconciledBalance).toFixed(2);
      const status = data.complete ? 'completed' : 'in_progress';

      const headerRes = await client.query<{ id: string }>(
        `INSERT INTO bank_reconciliations
           (bank_account_id, statement_date, statement_balance, book_balance,
            reconciled_balance, difference, status, notes, created_by, completed_at)
         VALUES ($1, $2::date, $3, $4, $5, $6, $7::varchar, $8, $9, CASE WHEN $7::varchar = 'completed' THEN CURRENT_TIMESTAMP ELSE NULL END)
         RETURNING id`,
        [
          data.bank_account_id,
          data.statement_date,
          statementBalance,
          +bookBalance.toFixed(2),
          +reconciledBalance.toFixed(2),
          difference,
          status,
          data.notes || null,
          userId,
        ]
      );
      const reconId = Number(headerRes.rows[0].id);

      for (const entryId of clearedIds) {
        await client.query(
          `INSERT INTO bank_reconciliation_lines (reconciliation_id, ledger_entry_id, is_cleared, cleared_date)
           VALUES ($1, $2, TRUE, $3::date)`,
          [reconId, entryId, data.statement_date]
        );
      }

      await client.query('COMMIT');
      MyLogger.success(action, { reconId, difference, status });

      const full = await this.getById(reconId);
      if (!full) throw createError('Failed to load saved reconciliation', 500);
      return full;
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { data });
      throw error;
    } finally {
      client.release();
    }
  }

  static async list(params: {
    page?: number;
    limit?: number;
    bank_account_id?: number;
    status?: string;
  }): Promise<{ reconciliations: BankReconciliation[]; total: number; page: number; limit: number }> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;
    const offset = (page - 1) * limit;

    const conditions: string[] = [];
    const values: any[] = [];
    if (params.bank_account_id) { conditions.push(`r.bank_account_id = $${values.length + 1}`); values.push(params.bank_account_id); }
    if (params.status) { conditions.push(`r.status = $${values.length + 1}`); values.push(params.status); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await pool.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM bank_reconciliations r ${where}`,
      values
    );
    const total = parseInt(countRes.rows[0]?.total ?? '0', 10);

    const res = await pool.query<ReconRow>(
      `SELECT r.*, ba.name AS bank_account_name
         FROM bank_reconciliations r
         LEFT JOIN chart_of_accounts ba ON ba.id = r.bank_account_id
         ${where}
        ORDER BY r.statement_date DESC, r.id DESC
        LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    const reconciliations = await Promise.all(res.rows.map(row => this.mapRow(row)));
    return { reconciliations, total, page, limit };
  }

  static async getById(id: number | string): Promise<BankReconciliation | null> {
    const res = await pool.query<ReconRow>(
      `SELECT r.*, ba.name AS bank_account_name
         FROM bank_reconciliations r
         LEFT JOIN chart_of_accounts ba ON ba.id = r.bank_account_id
        WHERE r.id = $1`,
      [id]
    );
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  private static async mapRow(row: ReconRow): Promise<BankReconciliation> {
    const linesRes = await pool.query<{ ledger_entry_id: string }>(
      `SELECT ledger_entry_id FROM bank_reconciliation_lines WHERE reconciliation_id = $1 AND is_cleared = TRUE`,
      [row.id]
    );
    return {
      id: Number(row.id),
      bank_account_id: Number(row.bank_account_id),
      bank_account_name: row.bank_account_name ?? undefined,
      statement_date: String(row.statement_date),
      statement_balance: parseFloat(row.statement_balance),
      book_balance: parseFloat(row.book_balance),
      reconciled_balance: parseFloat(row.reconciled_balance),
      difference: parseFloat(row.difference),
      status: row.status,
      notes: row.notes ?? undefined,
      created_by: row.created_by != null ? Number(row.created_by) : undefined,
      completed_at: row.completed_at ? String(row.completed_at) : undefined,
      cleared_ledger_entry_ids: linesRes.rows.map(r => Number(r.ledger_entry_id)),
      created_at: String(row.created_at),
      updated_at: row.updated_at ? String(row.updated_at) : undefined,
    };
  }
}
