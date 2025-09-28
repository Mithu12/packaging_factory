import {
  Voucher,
  CreateVoucherRequest,
  VoucherStatus,
} from "@/types/accounts";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class AddVoucherMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Create new voucher
  async createVoucher(data: CreateVoucherRequest, createdBy: number): Promise<Voucher> {
    let action = "Create Voucher";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { voucherData: data, createdBy });

      // Validate that debits equal credits
      const totalDebits = data.lines.reduce((sum, line) => sum + line.debit, 0);
      const totalCredits = data.lines.reduce((sum, line) => sum + line.credit, 0);
      
      if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw createError("Voucher is not balanced. Total debits must equal total credits.", 400);
      }

      // Validate that all accounts exist
      const accountIds = data.lines.map(line => line.accountId);
      const accountsQuery = `
        SELECT id, code, name 
        FROM chart_of_accounts 
        WHERE id = ANY($1) AND status = 'Active'
      `;
      const accountsResult = await client.query(accountsQuery, [accountIds]);
      
      if (accountsResult.rows.length !== accountIds.length) {
        throw createError("One or more accounts not found or inactive", 400);
      }

      // Validate cost centers if provided
      const costCenterIds = [
        data.costCenterId,
        ...data.lines.map(line => line.costCenterId)
      ].filter(id => id !== undefined && id !== null);

      if (costCenterIds.length > 0) {
        const costCentersQuery = `
          SELECT id 
          FROM cost_centers 
          WHERE id = ANY($1) AND status = 'Active'
        `;
        const costCentersResult = await client.query(costCentersQuery, [costCenterIds]);
        MyLogger.info(action, { costCentersResult:costCentersResult.rows, costCenterIds });
        if (costCentersResult.rows.length !== costCenterIds.length) {
          throw createError("One or more cost centers not found or inactive", 400);
        }
      }

      // Generate voucher number
      const voucherNoQuery = `
        SELECT generate_voucher_number($1) as next_number
      `;
      const voucherNoResult = await client.query(voucherNoQuery, [data.type]);
      const nextNumber = voucherNoResult.rows[0].next_number;
      const year = new Date().getFullYear();
      const voucherNo = `${String(nextNumber).padStart(4, '0')}`;
MyLogger.info('Voucher No', { voucherNo:voucherNo });
      // Calculate total amount
      const amount = Math.max(totalDebits, totalCredits);

      // Insert voucher
      const insertVoucherQuery = `
        INSERT INTO vouchers (
          voucher_no,
          type,
          date,
          reference,
          payee,
          amount,
          currency,
          status,
          narration,
          cost_center_id,
          attachments,
          created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING 
          id,
          voucher_no as "voucherNo",
          type,
          date,
          reference,
          payee,
          amount,
          currency,
          status,
          narration,
          cost_center_id as "costCenterId",
          attachments,
          created_by as "createdBy",
          approved_by as "approvedBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;
MyLogger.info('Insert Voucher Query', { insertVoucherQuery:insertVoucherQuery });
      const voucherResult = await client.query(insertVoucherQuery, [
        voucherNo,
        data.type,
        data.date,
        data.reference || null,
        data.payee || null,
        amount,
        'BDT', // Default currency
        VoucherStatus.DRAFT,
        data.narration,
        data.costCenterId || null,
        0, // Default attachments count
        createdBy
      ]);
MyLogger.info('Voucher Added', { voucherResult:voucherResult.rows });
      const voucher = voucherResult.rows[0];

      // Insert voucher lines
      const lines = [];
      for (const lineData of data.lines) {
        const insertLineQuery = `
          INSERT INTO voucher_lines (
            voucher_id,
            account_id,
            debit,
            credit,
            cost_center_id,
            description
          ) VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING 
            id,
            voucher_id as "voucherId",
            account_id as "accountId",
            debit,
            credit,
            cost_center_id as "costCenterId",
            description,
            created_at as "createdAt",
            updated_at as "updatedAt"
        `;

        const lineResult = await client.query(insertLineQuery, [
          voucher.id,
          lineData.accountId,
          lineData.debit,
          lineData.credit,
          lineData.costCenterId || null,
          lineData.description || null
        ]);
MyLogger.info('Voucher Line Added', { lineResult:lineResult.rows });
        const line = lineResult.rows[0];
        
        // Get account details
        const account = accountsResult.rows.find(acc => acc.id === lineData.accountId);
        MyLogger.info('Account Details', { account:account });
        lines.push({
          ...line,
          accountCode: account.code,
          accountName: account.name
        });
      }

      // Generate ledger entries if voucher is posted
      if (voucher.status === VoucherStatus.POSTED) {
        MyLogger.info('Generating Ledger Entries', { voucherId: voucher.id });
        await this.generateLedgerEntries(client, voucher, lines, createdBy);
      }

      // Update cost center actual spend if voucher is posted and has cost center
      if (voucher.status === VoucherStatus.POSTED && voucher.costCenterId) {
        MyLogger.info('Updating Cost Center Actual Spend', { voucher:voucher });
        await client.query(
          'UPDATE cost_centers SET actual_spend = actual_spend + $1 WHERE id = $2',
          [amount, voucher.costCenterId]
        );
      }

      await client.query('COMMIT');
      MyLogger.info('Voucher Committed', { voucher:voucher });
      const result: Voucher = {
        ...voucher,
        lines
      };
      MyLogger.info('Voucher Result', { result:result });
      MyLogger.success(action, {
        voucherId: voucher.id,
        voucherNo: voucher.voucherNo,
        type: voucher.type,
        amount: voucher.amount,
        linesCount: lines.length
      });
      MyLogger.info('Voucher Success', { result:result });
      return result;
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { voucherData: data, createdBy });
      throw error;
    } finally {
      client.release();
    }
  }

  // Generate ledger entries for posted voucher
  private async generateLedgerEntries(client: any, voucher: any, lines: any[], createdBy: number): Promise<void> {
    const action = 'Generate Ledger Entries';
    
    try {
      MyLogger.info(action, { voucherId: voucher.id, linesCount: lines.length });

      // Get current account balances for running balance calculation
      const accountBalances = new Map<number, number>();
      
      for (const line of lines) {
        // Get current account balance
        const balanceQuery = `
          SELECT COALESCE(
            (SELECT balance FROM ledger_entries 
             WHERE account_id = $1 
             ORDER BY created_at DESC, id DESC 
             LIMIT 1), 
            0
          ) as current_balance
        `;
        
        const balanceResult = await client.query(balanceQuery, [line.accountId]);
        let currentBalance = parseFloat(balanceResult.rows[0].current_balance || 0);
        
        // Calculate new balance (debit increases, credit decreases for most accounts)
        const movement = line.debit - line.credit;
        const newBalance = currentBalance + movement;
        
        // Store for potential use in other lines
        accountBalances.set(line.accountId, newBalance);

        // Insert ledger entry
        const ledgerEntryQuery = `
          INSERT INTO ledger_entries (
            date,
            voucher_id,
            voucher_no,
            type,
            account_id,
            description,
            debit,
            credit,
            balance,
            cost_center_id,
            created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `;

        await client.query(ledgerEntryQuery, [
          voucher.date,
          voucher.id,
          voucher.voucherNo,
          voucher.type,
          line.accountId,
          line.description || voucher.narration,
          line.debit,
          line.credit,
          newBalance,
          line.costCenterId || voucher.costCenterId || null,
          createdBy
        ]);

        MyLogger.info('Ledger Entry Created', { 
          accountId: line.accountId, 
          debit: line.debit, 
          credit: line.credit, 
          newBalance 
        });
      }

      // Update account balances in chart_of_accounts table
      for (const [accountId, balance] of accountBalances) {
        await client.query(
          'UPDATE chart_of_accounts SET balance = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [balance, accountId]
        );
      }

      MyLogger.success(action, { 
        voucherId: voucher.id, 
        entriesCreated: lines.length,
        accountsUpdated: accountBalances.size
      });

    } catch (error: any) {
      MyLogger.error(action, error, { voucherId: voucher.id });
      throw error;
    }
  }
}

export default new AddVoucherMediator();
