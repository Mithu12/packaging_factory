import pool from '@/database/connection';
import { SalesOrder, UpdateSalesOrderRequest } from '@/types/pos';
import { MyLogger } from '@/utils/new-logger';
import { salesAccountsIntegrationService } from '@/services/salesAccountsIntegrationService';

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

                // Trigger accounts integration when status transitioned to completed, idempotent on voucher_id
                try {
                    if (data.status === 'completed' && !salesOrder.accounting_integrated && !salesOrder.voucher_id) {
                        await salesAccountsIntegrationService.createSalesOrderVoucher({
                            id: salesOrder.id,
                            order_number: salesOrder.order_number,
                            customer_id: salesOrder.customer_id,
                            customer_name: salesOrder.customer_name,
                            order_date: salesOrder.order_date,
                            status: salesOrder.status,
                            subtotal: Number(salesOrder.subtotal) || 0,
                            discount_amount: Number(salesOrder.discount_amount) || 0,
                            tax_amount: Number(salesOrder.tax_amount) || 0,
                            total_amount: Number(salesOrder.total_amount) || 0,
                            cash_received: Number(salesOrder.cash_received) || 0,
                            change_given: Number(salesOrder.change_given) || 0,
                            due_amount: Number(salesOrder.due_amount) || 0,
                            notes: salesOrder.notes,
                        }, 1);
                    }
                } catch (integrationError: any) {
                    MyLogger.error(`${action}.accountsIntegration`, integrationError, { salesOrderId: salesOrder.id });
                }

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
