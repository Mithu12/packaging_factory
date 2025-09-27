import {
  AccountGroup,
  UpdateAccountGroupRequest,
} from "@/types/accounts";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class UpdateAccountGroupInfoMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Update account group
  async updateAccountGroup(
    id: number,
    data: UpdateAccountGroupRequest
  ): Promise<AccountGroup> {
    let action = "Update Account Group";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { accountGroupId: id, updateData: data });

      // Check if account group exists
      const existingResult = await client.query(
        "SELECT * FROM account_groups WHERE id = $1",
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createError("Account group not found", 404);
      }

      const existing = existingResult.rows[0];

      // Check if code is being updated and if it already exists
      if (data.code && data.code !== existing.code) {
        const codeCheck = await client.query(
          "SELECT id FROM account_groups WHERE code = $1 AND id != $2",
          [data.code, id]
        );

        if (codeCheck.rows.length > 0) {
          throw createError("Account group code already exists", 400);
        }
      }

      // If parentId is being updated, validate it
      if (data.parentId !== undefined) {
        if (data.parentId !== null) {
          // Check if parent exists
          const parentCheck = await client.query(
            "SELECT id, category FROM account_groups WHERE id = $1",
            [data.parentId]
          );

          if (parentCheck.rows.length === 0) {
            throw createError("Parent account group not found", 404);
          }

          // Check if parent has same category (use existing category if not being updated)
          const categoryToCheck = data.category || existing.category;
          if (parentCheck.rows[0].category !== categoryToCheck) {
            throw createError("Parent account group must have the same category", 400);
          }

          // Check for circular reference
          await this.checkCircularReference(client, id, data.parentId);
        }
      }

      // If category is being updated, validate children
      if (data.category && data.category !== existing.category) {
        await this.validateCategoryChange(client, id, data.category);
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

      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        updateValues.push(data.description);
        paramIndex++;
      }

      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        updateValues.push(data.status);
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
        UPDATE account_groups 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
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

      const result = await client.query(updateQuery, updateValues);
      await client.query('COMMIT');

      const accountGroup = result.rows[0];
      accountGroup.children = [];

      MyLogger.success(action, {
        accountGroupId: id,
        accountGroupName: accountGroup.name,
        updatedFields: Object.keys(data),
      });

      return accountGroup;
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { accountGroupId: id, updateData: data });
      throw error;
    } finally {
      client.release();
    }
  }

  // Check for circular reference when updating parent
  private async checkCircularReference(
    client: any,
    accountGroupId: number,
    newParentId: number
  ): Promise<void> {
    if (accountGroupId === newParentId) {
      throw createError("Account group cannot be its own parent", 400);
    }

    // Check if newParentId is a descendant of accountGroupId
    const descendants = await this.getDescendants(client, accountGroupId);
    if (descendants.includes(newParentId)) {
      throw createError("Cannot create circular reference in account group hierarchy", 400);
    }
  }

  // Get all descendants of an account group
  private async getDescendants(client: any, accountGroupId: number): Promise<number[]> {
    const descendants: number[] = [];
    
    const result = await client.query(
      "SELECT id FROM account_groups WHERE parent_id = $1",
      [accountGroupId]
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
    accountGroupId: number,
    newCategory: string
  ): Promise<void> {
    // Check if account group has children
    const childrenResult = await client.query(
      "SELECT id, category FROM account_groups WHERE parent_id = $1",
      [accountGroupId]
    );

    // If has children, they must all have the same category as the new category
    for (const child of childrenResult.rows) {
      if (child.category !== newCategory) {
        throw createError(
          `Cannot change category: child account group has different category (${child.category})`,
          400
        );
      }
    }

    // Check if account group has a parent
    const parentResult = await client.query(
      "SELECT category FROM account_groups WHERE id = (SELECT parent_id FROM account_groups WHERE id = $1)",
      [accountGroupId]
    );

    // If has parent, parent must have the same category as the new category
    if (parentResult.rows.length > 0 && parentResult.rows[0].category !== newCategory) {
      throw createError(
        `Cannot change category: parent account group has different category (${parentResult.rows[0].category})`,
        400
      );
    }
  }
}

export default new UpdateAccountGroupInfoMediator();
