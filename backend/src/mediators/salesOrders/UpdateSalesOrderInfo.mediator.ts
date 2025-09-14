import pool from '@/database/connection';
import { SalesOrder, UpdateSalesOrderRequest } from '@/types/pos';
import { MyLogger } from '@/utils/new-logger';

export class UpdateSalesOrderInfoMediator {
    static async updateSalesOrder(id: number, data: UpdateSalesOrderRequest): Promise<SalesOrder> {
        let action = 'UpdateSalesOrderInfoMediator.updateSalesOrder';
        try {
            MyLogger.info(action, { salesOrderId: id, updateFields: Object.keys(data) });

            const client = await pool.connect();
            
            try {
                await client.query('BEGIN');

                // Build dynamic update query
                const updateFields: string[] = [];
                const values: any[] = [];
                let paramIndex = 1;

                Object.entries(data).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        updateFields.push(`${key} = $${paramIndex}`);
                        values.push(value);
                        paramIndex++;
                    }
                });

                if (updateFields.length === 0) {
                    throw new Error('No fields to update');
                }

                // Add updated_at timestamp
                updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

                const updateQuery = `
                    UPDATE sales_orders 
                    SET ${updateFields.join(', ')}
                    WHERE id = $${paramIndex}
                    RETURNING *
                `;

                values.push(id);
                const result = await client.query(updateQuery, values);

                if (result.rows.length === 0) {
                    throw new Error(`Sales order with ID ${id} not found`);
                }

                const salesOrder = result.rows[0];
                await client.query('COMMIT');

                MyLogger.success(action, { 
                    salesOrderId: id, 
                    orderNumber: salesOrder.order_number,
                    updatedFields: Object.keys(data)
                });

                return salesOrder;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error: any) {
            MyLogger.error(action, error, { salesOrderId: id });
            throw error;
        }
    }
}
