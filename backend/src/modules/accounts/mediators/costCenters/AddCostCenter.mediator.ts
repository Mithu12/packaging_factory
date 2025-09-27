import {
  CostCenter,
  CreateCostCenterRequest,
} from "@/types/accounts";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class AddCostCenterMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Create new cost center
  async createCostCenter(data: CreateCostCenterRequest): Promise<CostCenter> {
    let action = "Create Cost Center";
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      MyLogger.info(action, { costCenterData: data });

      // Check if code already exists
      const codeCheck = await client.query(
        "SELECT id FROM cost_centers WHERE code = $1",
        [data.code]
      );

      if (codeCheck.rows.length > 0) {
        throw createError("Cost center code already exists", 400);
      }

      // Insert new cost center (excluding variance as it's a generated column)
      const insertQuery = `
        INSERT INTO cost_centers (
          name, 
          code, 
          type,
          department, 
          owner, 
          budget,
          actual_spend,
          status,
          description
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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

      const budget = data.budget || 0;
      const actualSpend = 0; // Initial actual spend is 0

      const result = await client.query(insertQuery, [
        data.name,
        data.code,
        data.type,
        data.department,
        data.owner,
        budget,
        actualSpend,
        data.status || 'Active',
        data.description || null,
      ]);

      await client.query('COMMIT');

      const costCenter = result.rows[0];

      MyLogger.success(action, {
        costCenterId: costCenter.id,
        costCenterName: costCenter.name,
        code: costCenter.code,
        type: costCenter.type,
      });

      return costCenter;
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { costCenterData: data });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new AddCostCenterMediator();
