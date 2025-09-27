import {
  AccountGroup,
  CreateAccountGroupRequest,
} from "@/types/accounts";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class AddAccountGroupMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Create new account group
  async createAccountGroup(data: CreateAccountGroupRequest): Promise<AccountGroup> {
    let action = "Create Account Group";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { accountGroupData: data });

      // Check if code already exists
      const codeCheck = await client.query(
        "SELECT id FROM account_groups WHERE code = $1",
        [data.code]
      );

      if (codeCheck.rows.length > 0) {
        throw createError("Account group code already exists", 400);
      }

      // If parentId is provided, validate it exists and has same category
      if (data.parentId) {
        const parentCheck = await client.query(
          "SELECT id, category FROM account_groups WHERE id = $1",
          [data.parentId]
        );

        if (parentCheck.rows.length === 0) {
          throw createError("Parent account group not found", 404);
        }

        if (parentCheck.rows[0].category !== data.category) {
          throw createError("Parent account group must have the same category", 400);
        }
      }

      // Insert new account group
      const insertQuery = `
        INSERT INTO account_groups (
          name, 
          code, 
          category, 
          parent_id, 
          description, 
          status
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING 
          id,
          name,
          code,
          category,
          parent_id as "parentId",
          description,
          status,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(insertQuery, [
        data.name,
        data.code,
        data.category,
        data.parentId || null,
        data.description || null,
        data.status || 'Active',
      ]);

      await client.query('COMMIT');

      const accountGroup = result.rows[0];
      accountGroup.children = [];

      MyLogger.success(action, {
        accountGroupId: accountGroup.id,
        accountGroupName: accountGroup.name,
        code: accountGroup.code,
      });

      return accountGroup;
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { accountGroupData: data });
      throw error;
    } finally {
      client.release();
    }
  }

  // Validate account group data before creation
  private async validateAccountGroupData(
    client: any,
    data: CreateAccountGroupRequest
  ): Promise<void> {
    // Additional business logic validations can be added here
    
    // Example: Validate category-specific rules
    if (data.category === 'Assets' && data.parentId) {
      // Assets can only have Assets as parent
      const parentResult = await client.query(
        "SELECT category FROM account_groups WHERE id = $1",
        [data.parentId]
      );
      
      if (parentResult.rows.length > 0 && parentResult.rows[0].category !== 'Assets') {
        throw createError("Assets account group can only have Assets parent", 400);
      }
    }

    // Add more validation rules as needed
  }
}

export default new AddAccountGroupMediator();
