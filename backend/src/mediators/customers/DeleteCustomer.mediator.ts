import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

export class DeleteCustomerMediator {
    static async deleteCustomer(id: number): Promise<void> {
        let action = 'DeleteCustomerMediator.deleteCustomer';
        try {
            MyLogger.info(action, { customerId: id });

            // Check if customer has any sales orders
            const checkReferencesQuery = `
                SELECT COUNT(*) as count
                FROM sales_orders
                WHERE customer_id = $1
            `;

            const referencesResult = await pool.query(checkReferencesQuery, [id]);
            const referenceCount = parseInt(referencesResult.rows[0].count);

            if (referenceCount > 0) {
                // Soft delete - mark as inactive instead of hard delete
                const softDeleteQuery = `
                    UPDATE customers 
                    SET status = 'inactive',
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1
                    RETURNING *
                `;

                const result = await pool.query(softDeleteQuery, [id]);

                if (result.rows.length === 0) {
                    throw new Error(`Customer with ID ${id} not found`);
                }

                MyLogger.success(action, { 
                    customerId: id, 
                    customerName: result.rows[0].name,
                    message: 'Customer marked as inactive (soft delete)',
                    referenceCount
                });
            } else {
                // Hard delete if no references
                const deleteQuery = `DELETE FROM customers WHERE id = $1`;
                const result = await pool.query(deleteQuery, [id]);

                if (result.rowCount === 0) {
                    throw new Error(`Customer with ID ${id} not found`);
                }

                MyLogger.success(action, { 
                    customerId: id, 
                    message: 'Customer permanently deleted',
                    referenceCount
                });
            }
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: id });
            throw error;
        }
    }

    static async hardDeleteCustomer(id: number): Promise<void> {
        let action = 'DeleteCustomerMediator.hardDeleteCustomer';
        try {
            MyLogger.info(action, { customerId: id });

            const deleteQuery = `DELETE FROM customers WHERE id = $1`;
            const result = await pool.query(deleteQuery, [id]);

            if (result.rowCount === 0) {
                throw new Error(`Customer with ID ${id} not found`);
            }

            MyLogger.success(action, { 
                customerId: id, 
                message: 'Customer permanently deleted'
            });
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: id });
            throw error;
        }
    }

    static async checkCustomerReferences(id: number): Promise<{
        hasReferences: boolean;
        references: {
            sales_orders: number;
        };
    }> {
        let action = 'DeleteCustomerMediator.checkCustomerReferences';
        try {
            MyLogger.info(action, { customerId: id });

            const checkQuery = `
                SELECT 
                    COUNT(so.id) as sales_orders
                FROM sales_orders so
                WHERE so.customer_id = $1
            `;

            const result = await pool.query(checkQuery, [id]);
            const salesOrders = parseInt(result.rows[0].sales_orders);

            const hasReferences = salesOrders > 0;

            const references = {
                hasReferences,
                references: {
                    sales_orders: salesOrders
                }
            };

            MyLogger.success(action, { 
                customerId: id, 
                hasReferences,
                salesOrders
            });

            return references;
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: id });
            throw error;
        }
    }
}
