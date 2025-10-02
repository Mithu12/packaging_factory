import {
  Voucher,
  VoucherQueryParams,
  PaginatedResponse,
} from "@/types/accounts";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class GetVoucherInfoMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Get paginated list of vouchers
  async getVoucherList(params: VoucherQueryParams): Promise<PaginatedResponse<Voucher>> {
    let action = "Get Voucher List";
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { params });

      const {
        page = 1,
        limit = 50,
        search = '',
        type,
        status,
        costCenterId,
        dateFrom,
        dateTo,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = params;

      const offset = (page - 1) * limit;
      const searchPattern = `%${search.toLowerCase()}%`;

      // Build WHERE conditions
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (search) {
        conditions.push(`(
          LOWER(v.voucher_no) LIKE $${paramIndex} OR 
          LOWER(v.payee) LIKE $${paramIndex} OR 
          LOWER(v.narration) LIKE $${paramIndex}
        )`);
        values.push(searchPattern);
        paramIndex++;
      }

      if (type) {
        conditions.push(`v.type = $${paramIndex}`);
        values.push(type);
        paramIndex++;
      }

      if (status) {
        conditions.push(`v.status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }

      if (costCenterId) {
        conditions.push(`v.cost_center_id = $${paramIndex}`);
        values.push(costCenterId);
        paramIndex++;
      }

      if (dateFrom) {
        conditions.push(`v.date >= $${paramIndex}`);
        values.push(dateFrom);
        paramIndex++;
      }

      if (dateTo) {
        conditions.push(`v.date <= $${paramIndex}`);
        values.push(dateTo);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM vouchers v
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get vouchers with lines
      const vouchersQuery = `
        SELECT 
          v.id,
          v.voucher_no as "voucherNo",
          v.type,
          v.date,
          v.reference,
          v.payee,
          v.amount,
          v.currency,
          v.status,
          v.narration,
          v.cost_center_id as "costCenterId",
          v.attachments,
          v.created_by as "createdBy",
          v.approved_by as "approvedBy",
          v.created_at as "createdAt",
          v.updated_at as "updatedAt"
        FROM vouchers v
        ${whereClause}
        ORDER BY v.${sortBy === 'created_at' ? 'created_at' : sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);
      const vouchersResult = await client.query(vouchersQuery, values);

      // Get voucher lines for each voucher
      const vouchers: Voucher[] = [];
      for (const voucherRow of vouchersResult.rows) {
        const linesQuery = `
          SELECT 
            vl.id,
            vl.voucher_id as "voucherId",
            vl.account_id as "accountId",
            coa.code as "accountCode",
            coa.name as "accountName",
            vl.debit,
            vl.credit,
            vl.cost_center_id as "costCenterId",
            vl.description,
            vl.created_at as "createdAt",
            vl.updated_at as "updatedAt"
          FROM voucher_lines vl
          JOIN chart_of_accounts coa ON vl.account_id = coa.id
          WHERE vl.voucher_id = $1
          ORDER BY vl.id
        `;

        const linesResult = await client.query(linesQuery, [voucherRow.id]);

        vouchers.push({
          ...voucherRow,
          lines: linesResult.rows
        });
      }

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        total,
        page,
        limit,
        totalPages,
        returnedCount: vouchers.length
      });

      return {
        data: vouchers,
          page,
          limit,
          total,
          totalPages
      };
    } catch (error: any) {
      MyLogger.error(action, error, { params });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get single voucher by ID
  async getVoucherById(id: number): Promise<Voucher> {
    let action = "Get Voucher By ID";
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { voucherId: id });

      const voucherQuery = `
        SELECT 
          v.id,
          v.voucher_no as "voucherNo",
          v.type,
          v.date,
          v.reference,
          v.payee,
          v.amount,
          v.currency,
          v.status,
          v.narration,
          v.cost_center_id as "costCenterId",
          v.attachments,
          v.created_by as "createdBy",
          v.approved_by as "approvedBy",
          v.created_at as "createdAt",
          v.updated_at as "updatedAt"
        FROM vouchers v
        WHERE v.id = $1
      `;

      const voucherResult = await client.query(voucherQuery, [id]);

      if (voucherResult.rows.length === 0) {
        throw createError("Voucher not found", 404);
      }

      const voucher = voucherResult.rows[0];

      // Get voucher lines
      const linesQuery = `
        SELECT 
          vl.id,
          vl.voucher_id as "voucherId",
          vl.account_id as "accountId",
          coa.code as "accountCode",
          coa.name as "accountName",
          vl.debit,
          vl.credit,
          vl.cost_center_id as "costCenterId",
          vl.description,
          vl.created_at as "createdAt",
          vl.updated_at as "updatedAt"
        FROM voucher_lines vl
        JOIN chart_of_accounts coa ON vl.account_id = coa.id
        WHERE vl.voucher_id = $1
        ORDER BY vl.id
      `;

      const linesResult = await client.query(linesQuery, [id]);

      const result: Voucher = {
        ...voucher,
        lines: linesResult.rows
      };

      MyLogger.success(action, {
        voucherId: id,
        voucherNo: result.voucherNo,
        type: result.type,
        linesCount: result.lines.length
      });

      return result;
    } catch (error: any) {
      MyLogger.error(action, error, { voucherId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get voucher statistics
  async getVoucherStats(type?: string): Promise<any> {
    let action = "Get Voucher Statistics";
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { type });

      const typeCondition = type ? 'WHERE type = $1' : '';
      const values = type ? [type] : [];

      const statsQuery = `
        SELECT 
          COUNT(*) as total_vouchers,
          COUNT(*) FILTER (WHERE status = 'Posted') as posted_vouchers,
          COUNT(*) FILTER (WHERE status = 'Pending Approval') as pending_vouchers,
          COUNT(*) FILTER (WHERE status = 'Draft') as draft_vouchers,
          COALESCE(SUM(amount) FILTER (WHERE status = 'Posted'), 0) as total_posted_amount,
          COALESCE(SUM(attachments), 0) as total_attachments
        FROM vouchers
        ${typeCondition}
      `;

      const result = await client.query(statsQuery, values);
      const stats = result.rows[0];

      MyLogger.success(action, { type, stats });

      return {
        totalVouchers: parseInt(stats.total_vouchers),
        postedVouchers: parseInt(stats.posted_vouchers),
        pendingVouchers: parseInt(stats.pending_vouchers),
        draftVouchers: parseInt(stats.draft_vouchers),
        totalPostedAmount: parseFloat(stats.total_posted_amount),
        totalAttachments: parseInt(stats.total_attachments)
      };
    } catch (error: any) {
      MyLogger.error(action, error, { type });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new GetVoucherInfoMediator();
