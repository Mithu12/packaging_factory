import {
  ChartOfAccount,
  ChartOfAccountQueryParams,
  PaginatedResponse,
} from "@/types/accounts";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class GetChartOfAccountInfoMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Get all chart of accounts with pagination and filtering
  async getChartOfAccountList(params: ChartOfAccountQueryParams): Promise<PaginatedResponse<ChartOfAccount>> {
    let action = "Get Chart of Account List";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { params });

      const {
        page = 1,
        limit = 10,
        search,
        category,
        type,
        status,
        groupId,
        parentId,
        costCenterId,
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
          `(coa.name ILIKE $${paramIndex} OR coa.code ILIKE $${paramIndex} OR coa.notes ILIKE $${paramIndex})`
        );
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (category) {
        whereConditions.push(`coa.category = $${paramIndex}`);
        queryParams.push(category);
        paramIndex++;
      }

      if (type) {
        whereConditions.push(`coa.type = $${paramIndex}`);
        queryParams.push(type);
        paramIndex++;
      }

      if (status) {
        whereConditions.push(`coa.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      if (groupId !== undefined) {
        whereConditions.push(`coa.group_id = $${paramIndex}`);
        queryParams.push(groupId);
        paramIndex++;
      }

      if (parentId !== undefined) {
        if (parentId === null) {
          whereConditions.push(`coa.parent_id IS NULL`);
        } else {
          whereConditions.push(`coa.parent_id = $${paramIndex}`);
          queryParams.push(parentId);
          paramIndex++;
        }
      }

      if (costCenterId !== undefined) {
        if (costCenterId === null) {
          whereConditions.push(`coa.cost_center_id IS NULL`);
        } else {
          whereConditions.push(`coa.cost_center_id = $${paramIndex}`);
          queryParams.push(costCenterId);
          paramIndex++;
        }
      }

      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      // Count total records
      const countQuery = `SELECT COUNT(*) FROM chart_of_accounts coa ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get chart of accounts with joins
        const accountsQuery = `
        SELECT 
          coa.id,
          coa.name,
          coa.code,
          coa.type,
          coa.category,
          coa.parent_id as "parentId",
          coa.group_id as "groupId",
          coa.balance,
          coa.currency,
          coa.status,
          coa.notes,
          coa.cost_center_id as "costCenterId",
          coa.created_at as "createdAt",
          coa.updated_at as "updatedAt",
          ag.name as "groupName",
          cc.name as "costCenterName",
          parent.name as "parentName"
        FROM chart_of_accounts coa
        LEFT JOIN account_groups ag ON coa.group_id = ag.id
        LEFT JOIN cost_centers cc ON coa.cost_center_id = cc.id
        LEFT JOIN chart_of_accounts parent ON coa.parent_id = parent.id
        ${whereClause}
        ORDER BY ${
                         // @ts-ignore
            sortBy === 'parentId' ? 'coa.parent_id' : sortBy === 'groupId' ? 'coa.group_id' : `coa.${sortBy}`} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const accountsResult = await client.query(accountsQuery, queryParams);

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        total,
        page,
        limit,
        totalPages,
        returnedCount: accountsResult.rows.length,
      });

      return {
        data: accountsResult.rows,
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

  // Get chart of account by ID
  async getChartOfAccountById(id: number): Promise<ChartOfAccount> {
    let action = "Get Chart of Account By ID";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { accountId: id });

      const result = await client.query(
        `SELECT 
          coa.id,
          coa.name,
          coa.code,
          coa.type,
          coa.category,
          coa.parent_id as "parentId",
          coa.group_id as "groupId",
          coa.balance,
          coa.currency,
          coa.status,
          coa.notes,
          coa.cost_center_id as "costCenterId",
          coa.created_at as "createdAt",
          coa.updated_at as "updatedAt",
          ag.name as "groupName",
          cc.name as "costCenterName",
          parent.name as "parentName"
        FROM chart_of_accounts coa
        LEFT JOIN account_groups ag ON coa.group_id = ag.id
        LEFT JOIN cost_centers cc ON coa.cost_center_id = cc.id
        LEFT JOIN chart_of_accounts parent ON coa.parent_id = parent.id
        WHERE coa.id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        MyLogger.warn(action, {
          accountId: id,
          message: "Chart of account not found",
        });
        throw createError("Chart of account not found", 404);
      }

      const account = result.rows[0];

      // Get children for this account
      const childrenResult = await client.query(
        `SELECT 
          coa.id,
          coa.name,
          coa.code,
          coa.type,
          coa.category,
          coa.parent_id as "parentId",
          coa.group_id as "groupId",
          coa.balance,
          coa.currency,
          coa.status,
          coa.notes,
          coa.cost_center_id as "costCenterId",
          coa.created_at as "createdAt",
          coa.updated_at as "updatedAt",
          ag.name as "groupName",
          cc.name as "costCenterName"
        FROM chart_of_accounts coa
        LEFT JOIN account_groups ag ON coa.group_id = ag.id
        LEFT JOIN cost_centers cc ON coa.cost_center_id = cc.id
        WHERE coa.parent_id = $1 ORDER BY coa.name`,
        [id]
      );

      account.children = childrenResult.rows;

      MyLogger.success(action, {
        accountId: id,
        accountName: account.name,
        childrenCount: childrenResult.rows.length,
      });
      return account;
    } catch (error: any) {
      MyLogger.error(action, error, { accountId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get hierarchical chart of accounts tree
  async getChartOfAccountsTree(): Promise<ChartOfAccount[]> {
    let action = "Get Chart of Accounts Tree";
    const client = await pool.connect();
    try {
      MyLogger.info(action);

      // Get all chart of accounts
      const result = await client.query(
        `SELECT 
          coa.id,
          coa.name,
          coa.code,
          coa.type,
          coa.category,
          coa.parent_id as "parentId",
          coa.group_id as "groupId",
          coa.balance,
          coa.currency,
          coa.status,
          coa.notes,
          coa.cost_center_id as "costCenterId",
          coa.created_at as "createdAt",
          coa.updated_at as "updatedAt",
          ag.name as "groupName",
          cc.name as "costCenterName"
        FROM chart_of_accounts coa
        LEFT JOIN account_groups ag ON coa.group_id = ag.id
        LEFT JOIN cost_centers cc ON coa.cost_center_id = cc.id
        ORDER BY coa.category, coa.parent_id NULLS FIRST, coa.name`
      );

      const allAccounts = result.rows;
      
      // Build hierarchical structure
      const accountMap = new Map<number, ChartOfAccount>();
      const rootAccounts: ChartOfAccount[] = [];

      // First pass: create map of all accounts
      allAccounts.forEach(account => {
        account.children = [];
        accountMap.set(account.id, account);
      });

      // Second pass: build hierarchy
      allAccounts.forEach(account => {
        if (account.parentId) {
          const parent = accountMap.get(account.parentId);
          if (parent) {
            parent.children!.push(account);
          }
        } else {
          rootAccounts.push(account);
        }
      });

      MyLogger.success(action, {
        totalAccounts: allAccounts.length,
        rootAccounts: rootAccounts.length,
      });

      return rootAccounts;
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new GetChartOfAccountInfoMediator();
