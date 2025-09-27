import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class DeleteChartOfAccountMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Delete chart of account
  async deleteChartOfAccount(id: number): Promise<void> {
    let action = "Delete Chart of Account";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { accountId: id });

      // Check if chart of account exists
      const existingResult = await client.query(
        "SELECT id, name FROM chart_of_accounts WHERE id = $1",
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createError("Chart of account not found", 404);
      }

      const account = existingResult.rows[0];

      // Check if account has children
      const childrenResult = await client.query(
        "SELECT COUNT(*) as count FROM chart_of_accounts WHERE parent_id = $1",
        [id]
      );

      if (parseInt(childrenResult.rows[0].count) > 0) {
        throw createError(
          "Cannot delete account that has child accounts. Delete or reassign children first.",
          400
        );
      }

      // Check if account is used in voucher lines
      const voucherLinesResult = await client.query(
        "SELECT COUNT(*) as count FROM voucher_lines WHERE account_id = $1",
        [id]
      );

      if (parseInt(voucherLinesResult.rows[0].count) > 0) {
        throw createError(
          "Cannot delete account that has transaction history. Deactivate instead of deleting.",
          400
        );
      }

      // Check if account is used in ledger entries
      const ledgerResult = await client.query(
        "SELECT COUNT(*) as count FROM ledger_entries WHERE account_id = $1",
        [id]
      );

      if (parseInt(ledgerResult.rows[0].count) > 0) {
        throw createError(
          "Cannot delete account that has ledger entries. Deactivate instead of deleting.",
          400
        );
      }

      // Delete the chart of account
      await client.query(
        "DELETE FROM chart_of_accounts WHERE id = $1",
        [id]
      );

      await client.query('COMMIT');

      MyLogger.success(action, {
        accountId: id,
        accountName: account.name,
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { accountId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Soft delete chart of account (set status to Inactive)
  async deactivateChartOfAccount(id: number): Promise<void> {
    let action = "Deactivate Chart of Account";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { accountId: id });

      // Check if chart of account exists
      const existingResult = await client.query(
        "SELECT id, name, status FROM chart_of_accounts WHERE id = $1",
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createError("Chart of account not found", 404);
      }

      const account = existingResult.rows[0];

      if (account.status === 'Inactive') {
        throw createError("Chart of account is already inactive", 400);
      }

      // Update status to Inactive
      await client.query(
        "UPDATE chart_of_accounts SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );

      await client.query('COMMIT');

      MyLogger.success(action, {
        accountId: id,
        accountName: account.name,
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { accountId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Reactivate chart of account (set status to Active)
  async activateChartOfAccount(id: number): Promise<void> {
    let action = "Activate Chart of Account";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { accountId: id });

      // Check if chart of account exists
      const existingResult = await client.query(
        "SELECT id, name, status FROM chart_of_accounts WHERE id = $1",
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createError("Chart of account not found", 404);
      }

      const account = existingResult.rows[0];

      if (account.status === 'Active') {
        throw createError("Chart of account is already active", 400);
      }

      // Update status to Active
      await client.query(
        "UPDATE chart_of_accounts SET status = 'Active', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );

      await client.query('COMMIT');

      MyLogger.success(action, {
        accountId: id,
        accountName: account.name,
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { accountId: id });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new DeleteChartOfAccountMediator();
