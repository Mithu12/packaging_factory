import {
  Voucher,
  UpdateVoucherRequest,
  VoucherStatus,
} from "@/types/accounts";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class UpdateVoucherInfoMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Update voucher
  async updateVoucher(
    id: number,
    data: UpdateVoucherRequest,
    updatedBy: number
  ): Promise<Voucher> {
    let action = "Update Voucher";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { voucherId: id, updateData: data, updatedBy });

      // Check if voucher exists and get current status
      const existingResult = await client.query(
        "SELECT * FROM vouchers WHERE id = $1",
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createError("Voucher not found", 404);
      }

      const existing = existingResult.rows[0];

      // Check if voucher can be edited (only drafts can be fully edited)
      if (existing.status === VoucherStatus.POSTED && data.lines) {
        throw createError("Cannot modify lines of a posted voucher", 400);
      }

      if (existing.status === VoucherStatus.VOID) {
        throw createError("Cannot modify a void voucher", 400);
      }

      // Validate lines if provided
      if (data.lines) {
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
      }

      // Validate cost centers if provided
      const costCenterIds = [
        data.costCenterId,
        ...(data.lines ? data.lines.map(line => line.costCenterId) : [])
      ].filter(id => id !== undefined && id !== null);

      if (costCenterIds.length > 0) {
        const costCentersQuery = `
          SELECT id 
          FROM cost_centers 
          WHERE id = ANY($1) AND status = 'Active'
        `;
        const costCentersResult = await client.query(costCentersQuery, [costCenterIds]);
        
        if (costCentersResult.rows.length !== costCenterIds.length) {
          throw createError("One or more cost centers not found or inactive", 400);
        }
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (data.date !== undefined) {
        updateFields.push(`date = $${paramIndex}`);
        updateValues.push(data.date);
        paramIndex++;
      }

      if (data.reference !== undefined) {
        updateFields.push(`reference = $${paramIndex}`);
        updateValues.push(data.reference || null);
        paramIndex++;
      }

      if (data.payee !== undefined) {
        updateFields.push(`payee = $${paramIndex}`);
        updateValues.push(data.payee || null);
        paramIndex++;
      }

      if (data.narration !== undefined) {
        updateFields.push(`narration = $${paramIndex}`);
        updateValues.push(data.narration);
        paramIndex++;
      }

      if (data.costCenterId !== undefined) {
        updateFields.push(`cost_center_id = $${paramIndex}`);
        updateValues.push(data.costCenterId || null);
        paramIndex++;
      }

      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        updateValues.push(data.status);
        paramIndex++;

        // If approving, set approved_by
        if (data.status === VoucherStatus.POSTED) {
          updateFields.push(`approved_by = $${paramIndex}`);
          updateValues.push(updatedBy);
          paramIndex++;
        }
      }

      // Update amount if lines are provided
      if (data.lines) {
        const amount = Math.max(
          data.lines.reduce((sum, line) => sum + line.debit, 0),
          data.lines.reduce((sum, line) => sum + line.credit, 0)
        );
        updateFields.push(`amount = $${paramIndex}`);
        updateValues.push(amount);
        paramIndex++;
      }

      if (updateFields.length === 0 && !data.lines) {
        throw createError("No fields to update", 400);
      }

      // Add updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      // Update voucher if there are fields to update
      if (updateFields.length > 1) { // More than just updated_at
        updateValues.push(id);
        
        const updateQuery = `
          UPDATE vouchers 
          SET ${updateFields.join(', ')}
          WHERE id = $${paramIndex}
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

        const result = await client.query(updateQuery, updateValues);
        var voucher = result.rows[0];
      } else {
        voucher = existing;
      }

      // Update voucher lines if provided
      let lines = [];
      if (data.lines) {
        // Delete existing lines
        await client.query('DELETE FROM voucher_lines WHERE voucher_id = $1', [id]);

        // Insert new lines
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
            id,
            lineData.accountId,
            lineData.debit,
            lineData.credit,
            lineData.costCenterId || null,
            lineData.description || null
          ]);

          const line = lineResult.rows[0];
          
          // Get account details
          const accountQuery = 'SELECT code, name FROM chart_of_accounts WHERE id = $1';
          const accountResult = await client.query(accountQuery, [lineData.accountId]);
          const account = accountResult.rows[0];
          
          lines.push({
            ...line,
            accountCode: account.code,
            accountName: account.name
          });
        }
      } else {
        // Get existing lines
        const linesQuery = `
          SELECT 
            vl.id,
            vl.voucher_id as "voucherId",
            vl.account_id as "accountId",
            coa.code as "accountCode",
            coa.name as "accountName",
            vl.debit,
            vl.credit,
            vl.cost_center_id as "costCenterId",
            vl.description,
            vl.created_at as "createdAt",
            vl.updated_at as "updatedAt"
          FROM voucher_lines vl
          JOIN chart_of_accounts coa ON vl.account_id = coa.id
          WHERE vl.voucher_id = $1
          ORDER BY vl.id
        `;

        const linesResult = await client.query(linesQuery, [id]);
        lines = linesResult.rows;
      }

      // Generate ledger entries if status changed to posted
      if (data.status === VoucherStatus.POSTED && existing.status !== VoucherStatus.POSTED) {
        MyLogger.info('Generating Ledger Entries for Approved Voucher', { voucherId: id });
        await this.generateLedgerEntries(client, voucher, lines, updatedBy);
        
        // Update cost center actual spend
        if (voucher.costCenterId) {
          await client.query(
            'UPDATE cost_centers SET actual_spend = actual_spend + $1 WHERE id = $2',
            [voucher.amount, voucher.costCenterId]
          );
        }
      }

      await client.query('COMMIT');

      const result: Voucher = {
        ...voucher,
        lines
      };

      MyLogger.success(action, {
        voucherId: id,
        voucherNo: result.voucherNo,
        updatedFields: Object.keys(data),
        linesUpdated: !!data.lines
      });

      return result;
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { voucherId: id, updateData: data });
      throw error;
    } finally {
      client.release();
    }
  }

  // Approve voucher (change status to Posted)
  async approveVoucher(id: number, approvedBy: number): Promise<Voucher> {
    return this.updateVoucher(id, { status: VoucherStatus.POSTED }, approvedBy);
  }

  // Void voucher
  async voidVoucher(id: number, voidedBy: number): Promise<Voucher> {
    return this.updateVoucher(id, { status: VoucherStatus.VOID }, voidedBy);
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

export default new UpdateVoucherInfoMediator();
