import {
  CostCenter,
  UpdateCostCenterRequest,
} from "@/types/accounts";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class UpdateCostCenterInfoMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Update cost center
  async updateCostCenter(
    id: number,
    data: UpdateCostCenterRequest
  ): Promise<CostCenter> {
    let action = "Update Cost Center";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { costCenterId: id, updateData: data });

      // Check if cost center exists
      const existingResult = await client.query(
        "SELECT * FROM cost_centers WHERE id = $1",
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createError("Cost center not found", 404);
      }

      const existing = existingResult.rows[0];

      // Check if code is being updated and if it already exists
      if (data.code && data.code !== existing.code) {
        const codeCheck = await client.query(
          "SELECT id FROM cost_centers WHERE code = $1 AND id != $2",
          [data.code, id]
        );

        if (codeCheck.rows.length > 0) {
          throw createError("Cost center code already exists", 400);
        }
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

      if (data.department !== undefined) {
        updateFields.push(`department = $${paramIndex}`);
        updateValues.push(data.department);
        paramIndex++;
      }

      if (data.owner !== undefined) {
        updateFields.push(`owner = $${paramIndex}`);
        updateValues.push(data.owner);
        paramIndex++;
      }

      if (data.budget !== undefined) {
        updateFields.push(`budget = $${paramIndex}`);
        updateValues.push(data.budget);
        paramIndex++;
        // Note: variance will be automatically recalculated as it's a generated column
      }

      if (data.status !== undefined) {
        updateFields.push(`status = $${paramIndex}`);
        updateValues.push(data.status);
        paramIndex++;
      }

      if (data.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        updateValues.push(data.description);
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
        UPDATE cost_centers 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING 
          id,
          name,
          code,
          type,
          department,
          owner,
          budget,
          actual_spend as "actualSpend",
          variance,
          status,
          description,
          created_at as "createdAt",
          updated_at as "updatedAt"
      `;

      const result = await client.query(updateQuery, updateValues);
      await client.query('COMMIT');

      const costCenter = result.rows[0];

      MyLogger.success(action, {
        costCenterId: id,
        costCenterName: costCenter.name,
        updatedFields: Object.keys(data),
      });

      return costCenter;
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { costCenterId: id, updateData: data });
      throw error;
    } finally {
      client.release();
    }
  }

  // Update actual spend for a cost center (used when expenses are recorded)
  async updateActualSpend(id: number, actualSpend: number): Promise<CostCenter> {
    let action = "Update Cost Center Actual Spend";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { costCenterId: id, actualSpend });

      // Check if cost center exists
      const existingResult = await client.query(
        "SELECT id FROM cost_centers WHERE id = $1",
        [id]
      );

      if (existingResult.rows.length === 0) {
        throw createError("Cost center not found", 404);
      }

      const result = await client.query(
        `UPDATE cost_centers 
         SET actual_spend = $1, updated_at = CURRENT_TIMESTAMP
         WHERE id = $2
         RETURNING 
           id,
           name,
           code,
           type,
           department,
           owner,
           budget,
           actual_spend as "actualSpend",
           variance,
           status,
           description,
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [actualSpend, id]
      );

      await client.query('COMMIT');

      const costCenter = result.rows[0];

      MyLogger.success(action, {
        costCenterId: id,
        actualSpend,
        variance: costCenter.variance,
      });

      return costCenter;
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { costCenterId: id, actualSpend });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new UpdateCostCenterInfoMediator();
