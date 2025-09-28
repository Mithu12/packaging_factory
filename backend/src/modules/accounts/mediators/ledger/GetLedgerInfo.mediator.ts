import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

export interface LedgerEntry {
  id: number;
  voucherId: number;
  voucherNo: string;
  voucherType: string;
  date: string;
  accountId: number;
  accountCode: string;
  accountName: string;
  debit: number;
  credit: number;
  balance: number;
  costCenterId?: number;
  costCenterName?: string;
  description: string;
  createdBy: string;
  createdAt: string;
}

export interface LedgerQueryParams {
  page?: number;
  limit?: number;
  accountCode?: string;
  accountId?: number;
  costCenterId?: number;
  voucherType?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export interface LedgerStats {
  totalEntries: number;
  totalDebit: number;
  totalCredit: number;
  openingBalance: number;
  closingBalance: number;
}

export class GetLedgerInfoMediator {
  static async getLedgerEntries(params: LedgerQueryParams) {
    const action = 'Get Ledger Entries';
    try {
      MyLogger.info(action, { params });

      const {
        page = 1,
        limit = 50,
        accountCode,
        accountId,
        costCenterId,
        voucherType,
        dateFrom,
        dateTo,
        search,
        sortBy = 'date',
        sortOrder = 'desc'
      } = params;

      const offset = (page - 1) * limit;
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (accountCode) {
        conditions.push(`coa.code = $${paramIndex++}`);
        values.push(accountCode);
      }
      
      if (accountId) {
        conditions.push(`le.account_id = $${paramIndex++}`);
        values.push(accountId);
      }
      
      if (costCenterId) {
        conditions.push(`le.cost_center_id = $${paramIndex++}`);
        values.push(costCenterId);
      }
      
      if (voucherType && voucherType !== 'All') {
        conditions.push(`v.type = $${paramIndex++}`);
        values.push(voucherType);
      }
      
      if (dateFrom) {
        conditions.push(`v.date >= $${paramIndex++}`);
        values.push(dateFrom);
      }
      
      if (dateTo) {
        conditions.push(`v.date <= $${paramIndex++}`);
        values.push(dateTo);
      }
      
      if (search) {
        conditions.push(`(
          v.voucher_no ILIKE $${paramIndex++} OR 
          le.description ILIKE $${paramIndex++} OR 
          coa.name ILIKE $${paramIndex++} OR
          v.narration ILIKE $${paramIndex++}
        )`);
        values.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Build ORDER BY clause
      const orderByMap: Record<string, string> = {
        date: 'v.date',
        amount: '(le.debit + le.credit)',
        voucher_no: 'v.voucher_no',
        account_code: 'coa.code'
      };
      
      const orderByColumn = orderByMap[sortBy] || 'v.date';
      const orderByClause = `ORDER BY ${orderByColumn} ${sortOrder.toUpperCase()}`;

      // Main query
      const query = `
        SELECT 
          le.id,
          le.voucher_id,
          v.voucher_no,
          v.type as voucher_type,
          v.date,
          le.account_id,
          coa.code as account_code,
          coa.name as account_name,
          le.debit,
          le.credit,
          le.balance,
          le.cost_center_id,
          cc.name as cost_center_name,
          COALESCE(le.description, v.narration) as description,
          COALESCE(u.username, 'System') as created_by,
          le.created_at
        FROM ledger_entries le
        JOIN vouchers v ON le.voucher_id = v.id
        JOIN chart_of_accounts coa ON le.account_id = coa.id
        LEFT JOIN cost_centers cc ON le.cost_center_id = cc.id
        LEFT JOIN users u ON v.created_by = u.id
        ${whereClause}
        ${orderByClause}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM ledger_entries le
        JOIN vouchers v ON le.voucher_id = v.id
        JOIN chart_of_accounts coa ON le.account_id = coa.id
        LEFT JOIN cost_centers cc ON le.cost_center_id = cc.id
        LEFT JOIN users u ON v.created_by = u.id
        ${whereClause}
      `;

      const countValues = values.slice(0, -2); // Remove limit and offset
      
      const [entriesResult, countResult] = await Promise.all([
        pool.query(query, values),
        pool.query(countQuery, countValues)
      ]);

      const entries = entriesResult.rows as LedgerEntry[];
      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, { 
        total, 
        page, 
        limit, 
        totalPages,
        entriesCount: entries.length 
      });

      return {
        data: entries,
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      };
    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    }
  }

  static async getLedgerStats(params: LedgerQueryParams): Promise<LedgerStats> {
    const action = 'Get Ledger Stats';
    try {
      MyLogger.info(action, { params });

      const {
        accountCode,
        accountId,
        costCenterId,
        voucherType,
        dateFrom,
        dateTo
      } = params;

      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions (same as above)
      if (accountCode) {
        conditions.push(`coa.code = $${paramIndex++}`);
        values.push(accountCode);
      }
      
      if (accountId) {
        conditions.push(`le.account_id = $${paramIndex++}`);
        values.push(accountId);
      }
      
      if (costCenterId) {
        conditions.push(`le.cost_center_id = $${paramIndex++}`);
        values.push(costCenterId);
      }
      
      if (voucherType && voucherType !== 'All') {
        conditions.push(`v.type = $${paramIndex++}`);
        values.push(voucherType);
      }
      
      if (dateFrom) {
        conditions.push(`v.date >= $${paramIndex++}`);
        values.push(dateFrom);
      }
      
      if (dateTo) {
        conditions.push(`v.date <= $${paramIndex++}`);
        values.push(dateTo);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const query = `
        SELECT 
          COUNT(*) as total_entries,
          COALESCE(SUM(le.debit), 0) as total_debit,
          COALESCE(SUM(le.credit), 0) as total_credit,
          COALESCE(MIN(le.balance), 0) as opening_balance,
          COALESCE(MAX(le.balance), 0) as closing_balance
        FROM ledger_entries le
        JOIN vouchers v ON le.voucher_id = v.id
        JOIN chart_of_accounts coa ON le.account_id = coa.id
        LEFT JOIN cost_centers cc ON le.cost_center_id = cc.id
        ${whereClause}
      `;

      const result = await pool.query(query, values);
      const stats = result.rows[0];

      const ledgerStats: LedgerStats = {
        totalEntries: parseInt(stats.total_entries),
        totalDebit: parseFloat(stats.total_debit),
        totalCredit: parseFloat(stats.total_credit),
        openingBalance: parseFloat(stats.opening_balance),
        closingBalance: parseFloat(stats.closing_balance)
      };

      MyLogger.success(action, ledgerStats);
      return ledgerStats;
    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    }
  }

  static async getCostCenterLedgerEntries(costCenterId: number, params: LedgerQueryParams) {
    const action = 'Get Cost Center Ledger Entries';
    try {
      MyLogger.info(action, { costCenterId, params });

      // Add cost center filter to params
      const costCenterParams = { ...params, costCenterId };
      
      return await this.getLedgerEntries(costCenterParams);
    } catch (error: any) {
      MyLogger.error(action, error, { costCenterId, params });
      throw error;
    }
  }
}
