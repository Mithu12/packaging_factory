import {
  ChartOfAccount,
  CreateChartOfAccountRequest,
} from "@/types/accounts";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class AddChartOfAccountMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Create new chart of account
  async createChartOfAccount(data: CreateChartOfAccountRequest): Promise<ChartOfAccount> {
    let action = "Create Chart of Account";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { accountData: data });

      // Check if code already exists
      const codeCheck = await client.query(
        "SELECT id FROM chart_of_accounts WHERE code = $1",
        [data.code]
      );

      if (codeCheck.rows.length > 0) {
        throw createError("Account code already exists", 400);
      }

      // If parentId is provided, validate it exists and has same category
      if (data.parentId) {
        const parentCheck = await client.query(
          "SELECT id, category, type FROM chart_of_accounts WHERE id = $1",
          [data.parentId]
        );

        if (parentCheck.rows.length === 0) {
          throw createError("Parent account not found", 404);
        }

        if (parentCheck.rows[0].category !== data.category) {
          throw createError("Parent account must have the same category", 400);
        }

        // Parent must be a Control account if specified
        if (parentCheck.rows[0].type !== 'Control') {
          throw createError("Parent account must be a Control account", 400);
        }
      }

      // If groupId is provided, validate it exists and has same category
      if (data.groupId) {
        const groupCheck = await client.query(
          "SELECT id, category FROM account_groups WHERE id = $1",
          [data.groupId]
        );

        if (groupCheck.rows.length === 0) {
          throw createError("Account group not found", 404);
        }

        if (groupCheck.rows[0].category !== data.category) {
          throw createError("Account group must have the same category", 400);
        }
      }

      // Validate business rules
      if (data.type === 'Posting' && data.parentId) {
        // Posting accounts can have parents, but let's ensure the hierarchy makes sense
        const parentResult = await client.query(
          "SELECT type FROM chart_of_accounts WHERE id = $1",
          [data.parentId]
        );
        
        if (parentResult.rows[0].type === 'Posting') {
          throw createError("Posting accounts cannot have Posting account parents", 400);
        }
      }

      // Insert new chart of account
      const insertQuery = `
        INSERT INTO chart_of_accounts (
          name, 
          code, 
          type,
          category, 
          parent_id, 
          group_id,
          balance,
          currency,
          status,
          notes,
          cost_center_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING 
          id,
          name,
          code,
          type,
          category,
          parent_id as "parentId",
          group_id as "groupId",
          balance,
          currency,
          status,
          notes,
          cost_center_id as "costCenterId",
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(insertQuery, [
        data.name,
        data.code,
        data.type,
        data.category,
        data.parentId || null,
        data.groupId || null,
        0, // Initial balance
        data.currency || 'USD',
        data.status || 'Active',
        data.notes || null,
        data.costCenterId || null,
      ]);

      await client.query('COMMIT');

      const account = result.rows[0];
      account.children = [];

      MyLogger.success(action, {
        accountId: account.id,
        accountName: account.name,
        code: account.code,
        type: account.type,
      });

      return account;
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { accountData: data });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new AddChartOfAccountMediator();
