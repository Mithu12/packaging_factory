import {
  CostCenter,
  CostCenterQueryParams,
  PaginatedResponse,
} from "@/types/accounts";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class GetCostCenterInfoMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Get all cost centers with pagination and filtering
  async getCostCenterList(params: CostCenterQueryParams): Promise<PaginatedResponse<CostCenter>> {
    let action = "Get Cost Center List";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { params });

      const {
        page = 1,
        limit = 10,
        search,
        type,
        status,
        department,
        sortBy = "name",
        sortOrder = "asc",
      } = params;

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (search) {
        whereConditions.push(
          `(cc.name ILIKE $${paramIndex} OR cc.code ILIKE $${paramIndex} OR cc.owner ILIKE $${paramIndex} OR cc.description ILIKE $${paramIndex})`
        );
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (type) {
        whereConditions.push(`cc.type = $${paramIndex}`);
        queryParams.push(type);
        paramIndex++;
      }

      if (status) {
        whereConditions.push(`cc.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      if (department) {
        whereConditions.push(`cc.department = $${paramIndex}`);
        queryParams.push(department);
        paramIndex++;
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Count total records
      const countQuery = `SELECT COUNT(*) FROM cost_centers cc ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get cost centers
      const costCentersQuery = `
        SELECT 
          cc.id,
          cc.name,
          cc.code,
          cc.type,
          cc.department,
          cc.owner,
          cc.budget,
          cc.actual_spend as "actualSpend",
          cc.variance,
          cc.default_account_id as "defaultAccountId",
          cc.status,
          cc.description,
          cc.created_at as "createdAt",
          cc.updated_at as "updatedAt",
          coa.code as "defaultAccountCode",
          coa.name as "defaultAccountName"
        FROM cost_centers cc
        LEFT JOIN chart_of_accounts coa ON cc.default_account_id = coa.id
        ${whereClause}
        ORDER BY ${sortBy === 'actualSpend' ? 'cc.actual_spend' : `cc.${sortBy}`} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const costCentersResult = await client.query(costCentersQuery, queryParams);

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        total,
        page,
        limit,
        totalPages,
        returnedCount: costCentersResult.rows.length,
      });

      return {
        data: costCentersResult.rows,
        total,
        page,
        limit,
        totalPages,
      };
    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get cost center by ID
  async getCostCenterById(id: number): Promise<CostCenter> {
    let action = "Get Cost Center By ID";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { costCenterId: id });

      const result = await client.query(
        `SELECT 
          cc.id,
          cc.name,
          cc.code,
          cc.type,
          cc.department,
          cc.owner,
          cc.budget,
          cc.actual_spend as "actualSpend",
          cc.variance,
          cc.status,
          cc.description,
          cc.created_at as "createdAt",
          cc.updated_at as "updatedAt"
        FROM cost_centers cc
        WHERE cc.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        MyLogger.warn(action, {
          costCenterId: id,
          message: "Cost center not found",
        });
        throw createError("Cost center not found", 404);
      }

      const costCenter = result.rows[0];

      MyLogger.success(action, {
        costCenterId: id,
        costCenterName: costCenter.name,
      });
      return costCenter;
    } catch (error: any) {
      MyLogger.error(action, error, { costCenterId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get cost center statistics
  async getCostCenterStats(): Promise<any> {
    let action = "Get Cost Center Stats";
    const client = await pool.connect();
    try {
      MyLogger.info(action);

      const result = await client.query(`
        SELECT 
          COUNT(*) as "totalCostCenters",
          COUNT(*) FILTER (WHERE status = 'Active') as "activeCostCenters",
          COUNT(*) FILTER (WHERE status = 'Inactive') as "inactiveCostCenters",
          COUNT(*) FILTER (WHERE variance < 0) as "overBudgetCostCenters",
          COALESCE(SUM(budget), 0) as "totalBudget",
          COALESCE(SUM(actual_spend), 0) as "totalActualSpend",
          COALESCE(SUM(variance), 0) as "totalVariance",
          COUNT(DISTINCT type) as "uniqueTypes",
          COUNT(DISTINCT department) as "uniqueDepartments"
        FROM cost_centers
      `);

      const stats = result.rows[0];

      MyLogger.success(action, { stats });
      return stats;
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Search cost centers
  async searchCostCenters(query: string): Promise<CostCenter[]> {
    let action = "Search Cost Centers";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { query });

      const result = await client.query(
        `SELECT 
          cc.id,
          cc.name,
          cc.code,
          cc.type,
          cc.department,
          cc.owner,
          cc.budget,
          cc.actual_spend as "actualSpend",
          cc.variance,
          cc.status,
          cc.description,
          cc.created_at as "createdAt",
          cc.updated_at as "updatedAt"
        FROM cost_centers cc
        WHERE cc.name ILIKE $1 OR cc.code ILIKE $1 OR cc.owner ILIKE $1
        ORDER BY cc.name
        LIMIT 20`,
        [`%${query}%`]
      );

      MyLogger.success(action, {
        query,
        resultCount: result.rows.length,
      });

      return result.rows;
    } catch (error: any) {
      MyLogger.error(action, error, { query });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new GetCostCenterInfoMediator();
