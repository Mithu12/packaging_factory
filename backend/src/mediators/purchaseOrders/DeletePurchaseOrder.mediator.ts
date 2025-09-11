import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class DeletePurchaseOrderMediator {

    // Delete purchase order
    async deletePurchaseOrder(id: number): Promise<void> {
        let action = 'Delete Purchase Order'
        const client = await pool.connect();
        try {
            MyLogger.info(action, { purchaseOrderId: id })

            await client.query('BEGIN');

            // Check if purchase order exists
            const checkQuery = `
                SELECT id, status, po_number 
                FROM purchase_orders 
                WHERE id = $1
            `;
            const checkResult = await client.query(checkQuery, [id]);
            
            if (checkResult.rows.length === 0) {
                throw createError('Purchase order not found', 404);
            }

            const purchaseOrder = checkResult.rows[0];

            // Don't allow deletion of received or approved orders
            if (['received', 'approved', 'sent'].includes(purchaseOrder.status)) {
                throw createError('Cannot delete purchase orders that have been approved, sent, or received', 400);
            }

            // Delete purchase order (cascade will handle line items and timeline)
            const deleteQuery = `DELETE FROM purchase_orders WHERE id = $1`;
            await client.query(deleteQuery, [id]);

            await client.query('COMMIT');

            MyLogger.success(action, { 
                purchaseOrderId: id,
                poNumber: purchaseOrder.po_number,
                status: purchaseOrder.status
            });

        } catch (error) {
            await client.query('ROLLBACK');
            MyLogger.error(action, error, { purchaseOrderId: id })
            throw error;
        } finally {
            client.release();
        }
    }

    // Cancel purchase order (soft delete by changing status)
    async cancelPurchaseOrder(id: number, reason?: string): Promise<void> {
        let action = 'Cancel Purchase Order'
        const client = await pool.connect();
        try {
            MyLogger.info(action, { purchaseOrderId: id })

            await client.query('BEGIN');

            // Check if purchase order exists
            const checkQuery = `
                SELECT id, status, po_number 
                FROM purchase_orders 
                WHERE id = $1
            `;
            const checkResult = await client.query(checkQuery, [id]);
            
            if (checkResult.rows.length === 0) {
                throw createError('Purchase order not found', 404);
            }

            const purchaseOrder = checkResult.rows[0];

            // Don't allow cancellation of already received orders
            if (purchaseOrder.status === 'received') {
                throw createError('Cannot cancel purchase orders that have been fully received', 400);
            }

            // Update status to cancelled
            const updateQuery = `
                UPDATE purchase_orders 
                SET status = 'cancelled', updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
            `;
            await client.query(updateQuery, [id]);

            // Add timeline entry
            const timelineQuery = `
                INSERT INTO purchase_order_timeline (
                    purchase_order_id, event, description, "user", status
                )
                VALUES ($1, $2, $3, $4, $5)
            `;

            await client.query(timelineQuery, [
                id,
                'Purchase Order Cancelled',
                reason || 'Purchase order cancelled by user',
                'System User',
                'completed'
            ]);

            await client.query('COMMIT');

            MyLogger.success(action, { 
                purchaseOrderId: id,
                poNumber: purchaseOrder.po_number,
                oldStatus: purchaseOrder.status,
                reason
            });

        } catch (error) {
            await client.query('ROLLBACK');
            MyLogger.error(action, error, { purchaseOrderId: id })
            throw error;
        } finally {
            client.release();
        }
    }
}

export default new DeletePurchaseOrderMediator();
