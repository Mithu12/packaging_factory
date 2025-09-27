import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class DeleteAccountGroupMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Delete account group
  async deleteAccountGroup(id: number): Promise<void> {
    let action = "Delete Account Group";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { accountGroupId: id });

      // Check if account group exists
      const existingResult = await client.query(
        "SELECT id, name FROM account_groups WHERE id = $1",
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createError("Account group not found", 404);
      }

      const accountGroup = existingResult.rows[0];

      // Check if account group has children
      const childrenResult = await client.query(
        "SELECT COUNT(*) as count FROM account_groups WHERE parent_id = $1",
        [id]
      );

      if (parseInt(childrenResult.rows[0].count) > 0) {
        throw createError(
          "Cannot delete account group that has child groups. Delete or reassign children first.",
          400
        );
      }

      // Check if account group is used in chart of accounts
      const accountsResult = await client.query(
        "SELECT COUNT(*) as count FROM chart_of_accounts WHERE group_id = $1",
        [id]
      );

      if (parseInt(accountsResult.rows[0].count) > 0) {
        throw createError(
          "Cannot delete account group that is used in chart of accounts. Remove or reassign accounts first.",
          400
        );
      }

      // Delete the account group
      await client.query(
        "DELETE FROM account_groups WHERE id = $1",
        [id]
      );

      await client.query('COMMIT');

      MyLogger.success(action, {
        accountGroupId: id,
        accountGroupName: accountGroup.name,
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { accountGroupId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Soft delete account group (set status to Inactive)
  async deactivateAccountGroup(id: number): Promise<void> {
    let action = "Deactivate Account Group";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { accountGroupId: id });

      // Check if account group exists
      const existingResult = await client.query(
        "SELECT id, name, status FROM account_groups WHERE id = $1",
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createError("Account group not found", 404);
      }

      const accountGroup = existingResult.rows[0];

      if (accountGroup.status === 'Inactive') {
        throw createError("Account group is already inactive", 400);
      }

      // Update status to Inactive
      await client.query(
        "UPDATE account_groups SET status = 'Inactive', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );

      await client.query('COMMIT');

      MyLogger.success(action, {
        accountGroupId: id,
        accountGroupName: accountGroup.name,
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { accountGroupId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Reactivate account group (set status to Active)
  async activateAccountGroup(id: number): Promise<void> {
    let action = "Activate Account Group";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { accountGroupId: id });

      // Check if account group exists
      const existingResult = await client.query(
        "SELECT id, name, status FROM account_groups WHERE id = $1",
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createError("Account group not found", 404);
      }

      const accountGroup = existingResult.rows[0];

      if (accountGroup.status === 'Active') {
        throw createError("Account group is already active", 400);
      }

      // Update status to Active
      await client.query(
        "UPDATE account_groups SET status = 'Active', updated_at = CURRENT_TIMESTAMP WHERE id = $1",
        [id]
      );

      await client.query('COMMIT');

      MyLogger.success(action, {
        accountGroupId: id,
        accountGroupName: accountGroup.name,
      });
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { accountGroupId: id });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new DeleteAccountGroupMediator();
