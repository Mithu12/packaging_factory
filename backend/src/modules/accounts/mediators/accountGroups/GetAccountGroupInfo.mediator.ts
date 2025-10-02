import {
  AccountGroup,
  AccountGroupQueryParams,
  AccountGroupStats,
  PaginatedResponse,
} from "@/types/accounts";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class GetAccountGroupInfoMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Get all account groups with pagination and filtering
  async getAccountGroupList(params: AccountGroupQueryParams): Promise<PaginatedResponse<AccountGroup>> {
    let action = "Get Account Group List";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { params });

      const {
        page = 1,
        limit = 10,
        search,
        category,
        status,
        parentId,
        sortBy = "id",
        sortOrder = "asc",
      } = params;

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (search) {
        whereConditions.push(
          `(name ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`
        );
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (category) {
        whereConditions.push(`category = $${paramIndex}`);
        queryParams.push(category);
        paramIndex++;
      }

      if (status) {
        whereConditions.push(`status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      if (parentId !== undefined) {
        if (parentId === null) {
          whereConditions.push(`parent_id IS NULL`);
        } else {
          whereConditions.push(`parent_id = $${paramIndex}`);
          queryParams.push(parentId);
          paramIndex++;
        }
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Count total records
      const countQuery = `SELECT COUNT(*) FROM account_groups ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get account groups
      const accountGroupsQuery = `
        SELECT 
          id,
          name,
          code,
          category,
          parent_id as "parentId",
          description,
          status,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM account_groups ${whereClause}
        ORDER BY ${ sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const accountGroupsResult = await client.query(accountGroupsQuery, queryParams);

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        total,
        page,
        limit,
        totalPages,
        returnedCount: accountGroupsResult.rows.length,
      });

      return {
        data: accountGroupsResult.rows,
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

  // Get account group by ID with children
  async getAccountGroupById(id: number): Promise<AccountGroup> {
    let action = "Get Account Group By ID";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { accountGroupId: id });

      const result = await client.query(
        `SELECT 
          id,
          name,
          code,
          category,
          parent_id as "parentId",
          description,
          status,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM account_groups WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        MyLogger.warn(action, {
          accountGroupId: id,
          message: "Account group not found",
        });
        throw createError("Account group not found", 404);
      }

      const accountGroup = result.rows[0];

      // Get children for this account group
      const childrenResult = await client.query(
        `SELECT 
          id,
          name,
          code,
          category,
          parent_id as "parentId",
          description,
          status,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM account_groups WHERE parent_id = $1 ORDER BY name`,
        [id]
      );

      accountGroup.children = childrenResult.rows;

      MyLogger.success(action, {
        accountGroupId: id,
        accountGroupName: accountGroup.name,
        childrenCount: childrenResult.rows.length,
      });
      return accountGroup;
    } catch (error: any) {
      MyLogger.error(action, error, { accountGroupId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get hierarchical account groups tree
  async getAccountGroupsTree(): Promise<AccountGroup[]> {
    let action = "Get Account Groups Tree";
    const client = await pool.connect();
    try {
      MyLogger.info(action);

      // Get all account groups
      const result = await client.query(
        `SELECT 
          id,
          name,
          code,
          category,
          parent_id as "parentId",
          description,
          status,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM account_groups 
        ORDER BY category, parent_id NULLS FIRST, name`
      );

      const allGroups = result.rows;
      
      // Build hierarchical structure
      const groupMap = new Map<number, AccountGroup>();
      const rootGroups: AccountGroup[] = [];

      // First pass: create map of all groups
      allGroups.forEach(group => {
        group.children = [];
        groupMap.set(group.id, group);
      });

      // Second pass: build hierarchy
      allGroups.forEach(group => {
        if (group.parentId) {
          const parent = groupMap.get(group.parentId);
          if (parent) {
            parent.children!.push(group);
          }
        } else {
          rootGroups.push(group);
        }
      });

      MyLogger.success(action, {
        totalGroups: allGroups.length,
        rootGroups: rootGroups.length,
      });

      return rootGroups;
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get account group statistics
  async getAccountGroupStats(): Promise<AccountGroupStats> {
    let action = "Get Account Group Statistics";
    const client = await pool.connect();
    try {
      MyLogger.info(action);

      const statsQuery = `
        SELECT 
          COUNT(*) as total_groups,
          COUNT(CASE WHEN status = 'Active' THEN 1 END) as active_groups,
          COUNT(CASE WHEN status = 'Inactive' THEN 1 END) as inactive_groups,
          COUNT(CASE WHEN category = 'Assets' THEN 1 END) as assets_groups,
          COUNT(CASE WHEN category = 'Liabilities' THEN 1 END) as liabilities_groups,
          COUNT(CASE WHEN category = 'Equity' THEN 1 END) as equity_groups,
          COUNT(CASE WHEN category = 'Revenue' THEN 1 END) as revenue_groups,
          COUNT(CASE WHEN category = 'Expenses' THEN 1 END) as expenses_groups,
          COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as child_groups
        FROM account_groups
      `;

      const result = await client.query(statsQuery);
      const stats = result.rows[0];

      // Get groups with children count
      const childrenCountQuery = `
        SELECT COUNT(DISTINCT parent_id) as groups_with_children
        FROM account_groups 
        WHERE parent_id IS NOT NULL
      `;
      const childrenResult = await client.query(childrenCountQuery);

      const accountGroupStats: AccountGroupStats = {
        totalGroups: parseInt(stats.total_groups),
        groupsByCategory: {
          Assets: parseInt(stats.assets_groups),
          Liabilities: parseInt(stats.liabilities_groups),
          Equity: parseInt(stats.equity_groups),
          Revenue: parseInt(stats.revenue_groups),
          Expenses: parseInt(stats.expenses_groups),
        },
        activeGroups: parseInt(stats.active_groups),
        inactiveGroups: parseInt(stats.inactive_groups),
        groupsWithChildren: parseInt(childrenResult.rows[0].groups_with_children),
      };

      MyLogger.success(action, accountGroupStats);
      return accountGroupStats;
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Search account groups by name or code
  async searchAccountGroups(
    query: string,
    limit: number = 10
  ): Promise<AccountGroup[]> {
    let action = "Search Account Groups";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { query, limit });

      const result = await client.query(
        `SELECT 
          id,
          name,
          code,
          category,
          parent_id as "parentId",
          description,
          status,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM account_groups
        WHERE name ILIKE $1 OR code ILIKE $1
        ORDER BY name
        LIMIT $2`,
        [`%${query}%`, limit]
      );

      MyLogger.success(action, {
        query,
        limit,
        resultsCount: result.rows.length,
      });
      return result.rows;
    } catch (error: any) {
      MyLogger.error(action, error, { query, limit });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new GetAccountGroupInfoMediator();
