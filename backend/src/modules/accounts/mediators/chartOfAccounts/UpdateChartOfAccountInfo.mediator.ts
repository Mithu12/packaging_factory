import {
  ChartOfAccount,
  UpdateChartOfAccountRequest,
} from "@/types/accounts";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class UpdateChartOfAccountInfoMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Update chart of account
  async updateChartOfAccount(
    id: number,
    data: UpdateChartOfAccountRequest
  ): Promise<ChartOfAccount> {
    let action = "Update Chart of Account";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { accountId: id, updateData: data });

      // Check if chart of account exists
      const existingResult = await client.query(
        "SELECT * FROM chart_of_accounts WHERE id = $1",
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createError("Chart of account not found", 404);
      }

      const existing = existingResult.rows[0];

      // Check if code is being updated and if it already exists
      if (data.code && data.code !== existing.code) {
        const codeCheck = await client.query(
          "SELECT id FROM chart_of_accounts WHERE code = $1 AND id != $2",
          [data.code, id]
        );

        if (codeCheck.rows.length > 0) {
          throw createError("Account code already exists", 400);
        }
      }

      // If parentId is being updated, validate it
      if (data.parentId !== undefined) {
        if (data.parentId !== null) {
          // Check if parent exists
          const parentCheck = await client.query(
            "SELECT id, category, type FROM chart_of_accounts WHERE id = $1",
            [data.parentId]
          );

          if (parentCheck.rows.length === 0) {
            throw createError("Parent account not found", 404);
          }

          // Check if parent has same category (use existing category if not being updated)
          const categoryToCheck = data.category || existing.category;
          if (parentCheck.rows[0].category !== categoryToCheck) {
            throw createError("Parent account must have the same category", 400);
          }

          // Parent must be a Control account
          if (parentCheck.rows[0].type !== 'Control') {
            throw createError("Parent account must be a Control account", 400);
          }

          // Check for circular reference
          await this.checkCircularReference(client, id, data.parentId);
        }
      }

      // If groupId is being updated, validate it
      if (data.groupId !== undefined && data.groupId !== null) {
        const groupCheck = await client.query(
          "SELECT id, category FROM account_groups WHERE id = $1",
          [data.groupId]
        );

        if (groupCheck.rows.length === 0) {
          throw createError("Account group not found", 404);
        }

        // Check if group has same category (use existing category if not being updated)
        const categoryToCheck = data.category || existing.category;
        if (groupCheck.rows[0].category !== categoryToCheck) {
          throw createError("Account group must have the same category", 400);
        }
      }

      // If category is being updated, validate children and parent
      if (data.category && data.category !== existing.category) {
        await this.validateCategoryChange(client, id, data.category);
      }

      // If type is being updated, validate business rules
      if (data.type && data.type !== existing.type) {
        await this.validateTypeChange(client, id, data.type, data.parentId || existing.parent_id);
      }

      // Build update query dynamically
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (data.name !== undefined) {
        updateFields.push(`name = $${paramIndex}`);
        updateValues.push(data.name);
        paramIndex++;
      }

      if (data.code !== undefined) {
        updateFields.push(`code = $${paramIndex}`);
        updateValues.push(data.code);
        paramIndex++;
      }

      if (data.type !== undefined) {
        updateFields.push(`type = $${paramIndex}`);
        updateValues.push(data.type);
        paramIndex++;
      }

      if (data.category !== undefined) {
        updateFields.push(`category = $${paramIndex}`);
        updateValues.push(data.category);
        paramIndex++;
      }

      if (data.parentId !== undefined) {
        updateFields.push(`parent_id = $${paramIndex}`);
        updateValues.push(data.parentId);
        paramIndex++;
      }

      if (data.groupId !== undefined) {
        updateFields.push(`group_id = $${paramIndex}`);
        updateValues.push(data.groupId);
        paramIndex++;
      }

      if (data.currency !== undefined) {
        updateFields.push(`currency = $${paramIndex}`);
        updateValues.push(data.currency);
        paramIndex++;
      }

      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        updateValues.push(data.status);
        paramIndex++;
      }

      if (data.notes !== undefined) {
        updateFields.push(`notes = $${paramIndex}`);
        updateValues.push(data.notes);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw createError("No fields to update", 400);
      }

      // Add updated_at
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

      // Add WHERE clause parameter
      updateValues.push(id);

      const updateQuery = `
        UPDATE chart_of_accounts 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
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
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(updateQuery, updateValues);
      await client.query('COMMIT');

      const account = result.rows[0];
      account.children = [];

      MyLogger.success(action, {
        accountId: id,
        accountName: account.name,
        updatedFields: Object.keys(data),
      });

      return account;
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { accountId: id, updateData: data });
      throw error;
    } finally {
      client.release();
    }
  }

  // Check for circular reference when updating parent
  private async checkCircularReference(
    client: any,
    accountId: number,
    newParentId: number
  ): Promise<void> {
    if (accountId === newParentId) {
      throw createError("Account cannot be its own parent", 400);
    }

    // Check if newParentId is a descendant of accountId
    const descendants = await this.getDescendants(client, accountId);
    if (descendants.includes(newParentId)) {
      throw createError("Cannot create circular reference in account hierarchy", 400);
    }
  }

  // Get all descendants of an account
  private async getDescendants(client: any, accountId: number): Promise<number[]> {
    const descendants: number[] = [];
    
    const result = await client.query(
      "SELECT id FROM chart_of_accounts WHERE parent_id = $1",
      [accountId]
    );

    for (const row of result.rows) {
      descendants.push(row.id);
      const childDescendants = await this.getDescendants(client, row.id);
      descendants.push(...childDescendants);
    }

    return descendants;
  }

  // Validate category change doesn't break hierarchy
  private async validateCategoryChange(
    client: any,
    accountId: number,
    newCategory: string
  ): Promise<void> {
    // Check if account has children
    const childrenResult = await client.query(
      "SELECT id, category FROM chart_of_accounts WHERE parent_id = $1",
      [accountId]
    );

    // If has children, they must all have the same category as the new category
    for (const child of childrenResult.rows) {
      if (child.category !== newCategory) {
        throw createError(
          `Cannot change category: child account has different category (${child.category})`,
          400
        );
      }
    }

    // Check if account has a parent
    const parentResult = await client.query(
      "SELECT category FROM chart_of_accounts WHERE id = (SELECT parent_id FROM chart_of_accounts WHERE id = $1)",
      [accountId]
    );

    // If has parent, parent must have the same category as the new category
    if (parentResult.rows.length > 0 && parentResult.rows[0].category !== newCategory) {
      throw createError(
        `Cannot change category: parent account has different category (${parentResult.rows[0].category})`,
        400
      );
    }
  }

  // Validate type change doesn't break business rules
  private async validateTypeChange(
    client: any,
    accountId: number,
    newType: string,
    parentId?: number
  ): Promise<void> {
    // If changing to Posting and has children, children must also be compatible
    if (newType === 'Posting') {
      const childrenResult = await client.query(
        "SELECT COUNT(*) as count FROM chart_of_accounts WHERE parent_id = $1",
        [accountId]
      );

      if (parseInt(childrenResult.rows[0].count) > 0) {
        throw createError(
          "Cannot change to Posting account: account has children. Posting accounts cannot have children.",
          400
        );
      }
    }

    // If changing to Control and has parent that is Posting
    if (newType === 'Control' && parentId) {
      const parentResult = await client.query(
        "SELECT type FROM chart_of_accounts WHERE id = $1",
        [parentId]
      );

      if (parentResult.rows.length > 0 && parentResult.rows[0].type === 'Posting') {
        throw createError(
          "Cannot change to Control account: parent is a Posting account. Control accounts cannot have Posting parents.",
          400
        );
      }
    }
  }
}

export default new UpdateChartOfAccountInfoMediator();
