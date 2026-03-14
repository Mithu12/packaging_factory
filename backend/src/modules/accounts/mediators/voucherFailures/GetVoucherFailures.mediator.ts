import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

export interface VoucherFailureQueryParams {
  page?: number;
  limit?: number;
  sourceModule?: string;
  operationType?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface VoucherFailure {
  id: number;
  sourceModule: string;
  operationType: string;
  sourceEntityType: string;
  sourceEntityId: number;
  errorMessage: string;
  failureCategory: string;
  payload: Record<string, unknown> | null;
  createdBy: number | null;
  createdAt: string;
}

export interface PaginatedVoucherFailures {
  data: VoucherFailure[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

class GetVoucherFailuresMediator {
  async getVoucherFailures(params: VoucherFailureQueryParams): Promise<PaginatedVoucherFailures> {
    const action = 'Get Voucher Failures';
    const client = await pool.connect();

    try {
      const {
        page = 1,
        limit = 50,
        sourceModule,
        operationType,
        dateFrom,
        dateTo,
      } = params;

      const offset = (page - 1) * limit;
      const conditions: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (sourceModule) {
        conditions.push(`vf.source_module = $${paramIndex++}`);
        values.push(sourceModule);
      }
      if (operationType) {
        conditions.push(`vf.operation_type = $${paramIndex++}`);
        values.push(operationType);
      }
      if (dateFrom) {
        conditions.push(`vf.created_at >= $${paramIndex++}`);
        values.push(dateFrom);
      }
      if (dateTo) {
        conditions.push(`vf.created_at <= $${paramIndex++}`);
        values.push(dateTo);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const countQuery = `
        SELECT COUNT(*) as total FROM voucher_failures vf ${whereClause}
      `;
      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total, 10);

      const dataQuery = `
        SELECT
          vf.id,
          vf.source_module as "sourceModule",
          vf.operation_type as "operationType",
          vf.source_entity_type as "sourceEntityType",
          vf.source_entity_id as "sourceEntityId",
          vf.error_message as "errorMessage",
          vf.failure_category as "failureCategory",
          vf.payload,
          vf.created_by as "createdBy",
          vf.created_at as "createdAt"
        FROM voucher_failures vf
        ${whereClause}
        ORDER BY vf.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      values.push(limit, offset);
      const dataResult = await client.query(dataQuery, values);

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, { total, page, limit, totalPages });

      return {
        data: dataResult.rows,
        total,
        page,
        limit,
        totalPages,
      };
    } finally {
      client.release();
    }
  }
}

export default new GetVoucherFailuresMediator();
