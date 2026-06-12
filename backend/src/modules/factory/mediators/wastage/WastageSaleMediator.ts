import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import { interModuleConnector } from '@/utils/InterModuleConnector';

export interface CreateWastageSaleRequest {
  wastage_ids: (number | string)[];
  buyer_name: string;
  buyer_phone?: string;
  total_amount: number;
  payment_method: 'cash' | 'bank_transfer';
  payment_reference?: string;
  notes?: string;
}

export interface WastageSaleQueryParams {
  page?: number;
  limit?: number;
  search?: string;
}

export class WastageSaleMediator {
  static async createWastageSale(
    data: CreateWastageSaleRequest,
    userId: number
  ): Promise<any> {
    const action = 'Create Wastage Sale';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { wastageIds: data.wastage_ids, buyer: data.buyer_name, userId });

      const wastageResult = await client.query(
        `SELECT id, status, material_name, quantity, cost
         FROM material_wastage
         WHERE id = ANY($1::bigint[])
         FOR UPDATE`,
        [data.wastage_ids]
      );

      if (wastageResult.rows.length !== data.wastage_ids.length) {
        throw createError('One or more wastage records not found', 404);
      }

      // Only approved records are sellable; sold records are no longer
      // approved, so this also blocks double-selling.
      const unsellable = wastageResult.rows.find((row) => row.status !== 'approved');
      if (unsellable) {
        throw createError(
          `Cannot sell wastage record #${unsellable.id} with status: ${unsellable.status}`,
          400
        );
      }

      const saleNumberResult = await client.query(
        `SELECT CONCAT('WS-', TO_CHAR(CURRENT_DATE, 'YYYY'), '-', LPAD(NEXTVAL('wastage_sale_number_sequence')::TEXT, 5, '0')) AS sale_number`
      );
      const saleNumber = saleNumberResult.rows[0].sale_number;

      const saleResult = await client.query(
        `INSERT INTO factory_wastage_sales (
          sale_number,
          buyer_name,
          buyer_phone,
          total_amount,
          payment_method,
          payment_reference,
          notes,
          sold_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          saleNumber,
          data.buyer_name,
          data.buyer_phone || null,
          data.total_amount,
          data.payment_method,
          data.payment_reference || null,
          data.notes || null,
          userId
        ]
      );
      const sale = saleResult.rows[0];

      await client.query(
        `UPDATE material_wastage
         SET status = 'sold',
             wastage_sale_id = $1,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ANY($2::bigint[])`,
        [sale.id, data.wastage_ids]
      );

      await client.query('COMMIT');

      MyLogger.success(action, { saleId: sale.id, saleNumber, itemCount: wastageResult.rows.length });

      // Post the receipt voucher after commit; accounting failure must not
      // fail the sale (it lands in voucher_failures, same as approveWastage).
      try {
        const itemSummary = wastageResult.rows
          .map((row) => `${row.material_name} x${parseFloat(row.quantity)}`)
          .join(', ');

        const saleData = {
          saleId: Number(sale.id),
          saleNumber,
          buyerName: data.buyer_name,
          amount: data.total_amount,
          paymentMethod: data.payment_method,
          paymentReference: data.payment_reference,
          saleDate: sale.sale_date instanceof Date ? sale.sale_date.toISOString() : sale.sale_date,
          itemCount: wastageResult.rows.length,
          itemSummary,
          notes: data.notes,
          userId
        };

        MyLogger.info(`${action}.bridge`, { saleId: sale.id });
        await interModuleConnector.accModule.addWastageSaleVoucher(saleData, userId);
      } catch (eventError: any) {
        MyLogger.error(`${action}.bridge`, eventError, {
          saleId: sale.id,
          message: 'Failed to post wastage sale voucher, but sale recording succeeded'
        });
      }

      return sale;
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getWastageSales(
    params: WastageSaleQueryParams,
    userId: number
  ): Promise<{
    sales: any[];
    total: number;
    page: number;
    limit: number;
  }> {
    const action = 'Get Wastage Sales';

    try {
      MyLogger.info(action, { params, userId });

      const { page = 1, limit = 20, search } = params;
      const offset = (page - 1) * limit;

      const whereConditions = ['1=1'];
      const queryParams: any[] = [];
      let paramIndex = 1;

      if (search) {
        whereConditions.push(
          `(s.sale_number ILIKE $${paramIndex} OR s.buyer_name ILIKE $${paramIndex})`
        );
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      const countResult = await pool.query(
        `SELECT COUNT(*) as count FROM factory_wastage_sales s WHERE ${whereClause}`,
        queryParams
      );
      const total = parseInt(countResult.rows[0].count);

      const salesResult = await pool.query(
        `SELECT
          s.*,
          u.full_name as sold_by_name,
          (SELECT COALESCE(json_agg(json_build_object(
              'id', mw.id,
              'material_name', mw.material_name,
              'quantity', mw.quantity,
              'cost', mw.cost
            ) ORDER BY mw.id), '[]'::json)
           FROM material_wastage mw
           WHERE mw.wastage_sale_id = s.id) AS items
        FROM factory_wastage_sales s
        LEFT JOIN users u ON s.sold_by = u.id
        WHERE ${whereClause}
        ORDER BY s.sale_date DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, limit, offset]
      );

      MyLogger.success(action, { total, page, limit });

      return {
        sales: salesResult.rows,
        total,
        page,
        limit
      };
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }
}
