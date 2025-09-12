import pool from "@/database/connection";
import { 
    UpdatePurchaseOrderRequest, 
    UpdatePurchaseOrderStatusRequest,
    PurchaseOrder,
    ReceiveGoodsRequest
} from "@/types/purchaseOrder";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";
import { InvoiceMediator } from "@/mediators/payments/InvoiceMediator";

class UpdatePurchaseOrderInfoMediator {

    // Helper method to calculate due date based on payment terms
    private calculateDueDate(paymentTerms: string): string {
        const today = new Date();
        let daysToAdd = 30; // Default to Net 30

        if (paymentTerms) {
            const terms = paymentTerms.toLowerCase();
            if (terms.includes('net 15')) {
                daysToAdd = 15;
            } else if (terms.includes('net 30')) {
                daysToAdd = 30;
            } else if (terms.includes('net 45')) {
                daysToAdd = 45;
            } else if (terms.includes('net 60')) {
                daysToAdd = 60;
            } else if (terms.includes('net 90')) {
                daysToAdd = 90;
            }
        }

        const dueDate = new Date(today);
        dueDate.setDate(today.getDate() + daysToAdd);
        return dueDate.toISOString().split('T')[0];
    }

    // Update purchase order
    async updatePurchaseOrder(id: number, data: UpdatePurchaseOrderRequest): Promise<PurchaseOrder> {
        let action = 'Update Purchase Order'
        const client = await pool.connect();
        try {
            MyLogger.info(action, { purchaseOrderId: id })

            await client.query('BEGIN');

            // Check if purchase order exists
            const checkQuery = `SELECT id, status FROM purchase_orders WHERE id = $1`;
            const checkResult = await client.query(checkQuery, [id]);
            
            if (checkResult.rows.length === 0) {
                throw createError('Purchase order not found', 404);
            }

            const currentPO = checkResult.rows[0];
            
            // Don't allow updates to received or cancelled orders
            if (['received', 'cancelled'].includes(currentPO.status)) {
                throw createError('Cannot update received or cancelled purchase orders', 400);
            }

            // Build update query dynamically
            const updateFields: string[] = [];
            const updateValues: any[] = [];
            let paramIndex = 1;

            if (data.supplier_id !== undefined) {
                updateFields.push(`supplier_id = $${paramIndex}`);
                updateValues.push(data.supplier_id);
                paramIndex++;
            }

            if (data.expected_delivery_date !== undefined) {
                updateFields.push(`expected_delivery_date = $${paramIndex}`);
                updateValues.push(data.expected_delivery_date);
                paramIndex++;
            }

            if (data.actual_delivery_date !== undefined) {
                updateFields.push(`actual_delivery_date = $${paramIndex}`);
                updateValues.push(data.actual_delivery_date);
                paramIndex++;
            }

            if (data.priority !== undefined) {
                updateFields.push(`priority = $${paramIndex}`);
                updateValues.push(data.priority);
                paramIndex++;
            }

            if (data.payment_terms !== undefined) {
                updateFields.push(`payment_terms = $${paramIndex}`);
                updateValues.push(data.payment_terms);
                paramIndex++;
            }

            if (data.delivery_terms !== undefined) {
                updateFields.push(`delivery_terms = $${paramIndex}`);
                updateValues.push(data.delivery_terms);
                paramIndex++;
            }

            if (data.department !== undefined) {
                updateFields.push(`department = $${paramIndex}`);
                updateValues.push(data.department);
                paramIndex++;
            }

            if (data.project !== undefined) {
                updateFields.push(`project = $${paramIndex}`);
                updateValues.push(data.project);
                paramIndex++;
            }

            if (data.notes !== undefined) {
                updateFields.push(`notes = $${paramIndex}`);
                updateValues.push(data.notes);
                paramIndex++;
            }

            if (updateFields.length === 0) {
                throw createError('No fields to update', 400);
            }

            // Update purchase order
            const updateQuery = `
                UPDATE purchase_orders 
                SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
                WHERE id = $${paramIndex}
                RETURNING *
            `;

            updateValues.push(id);
            const result = await client.query(updateQuery, updateValues);
            const updatedPO = result.rows[0];

            // Update line items if provided
            if (data.line_items && data.line_items.length > 0) {
                // Delete existing line items
                await client.query('DELETE FROM purchase_order_line_items WHERE purchase_order_id = $1', [id]);

                // Insert new line items
                let totalAmount = 0;
                for (const lineItem of data.line_items) {
                    // Get product details
                    const productQuery = `
                        SELECT sku, name, unit_of_measure 
                        FROM products 
                        WHERE id = $1
                    `;
                    const productResult = await client.query(productQuery, [lineItem.product_id]);
                    
                    if (productResult.rows.length === 0) {
                        throw createError(`Product with ID ${lineItem.product_id} not found`, 404);
                    }

                    const product = productResult.rows[0];
                    const totalPrice = lineItem.quantity * lineItem.unit_price;
                    totalAmount += totalPrice;

                    const lineItemQuery = `
                        INSERT INTO purchase_order_line_items (
                            purchase_order_id, product_id, product_sku, product_name,
                            description, quantity, unit_price, total_price,
                            received_quantity, pending_quantity, unit_of_measure
                        )
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    `;

                    await client.query(lineItemQuery, [
                        id,
                        lineItem.product_id,
                        product.sku,
                        product.name,
                        lineItem.description,
                        lineItem.quantity,
                        lineItem.unit_price,
                        totalPrice,
                        0, // received_quantity
                        lineItem.quantity, // pending_quantity
                        product.unit_of_measure
                    ]);
                }

                // Update total amount
                await client.query(
                    'UPDATE purchase_orders SET total_amount = $1 WHERE id = $2',
                    [totalAmount, id]
                );
            }

            // Add timeline entry
            const timelineQuery = `
                INSERT INTO purchase_order_timeline (
                    purchase_order_id, event, "user", status
                )
                VALUES ($1, $2, $3, $4)
            `;

            await client.query(timelineQuery, [
                id,
                'Purchase Order Updated',
                'System User',
                'completed'
            ]);

            await client.query('COMMIT');

            MyLogger.success(action, { 
                purchaseOrderId: id,
                updatedFields: updateFields.length
            });

            return updatedPO;
        } catch (error) {
            await client.query('ROLLBACK');
            MyLogger.error(action, error, { purchaseOrderId: id })
            throw error;
        } finally {
            client.release();
        }
    }

    // Update purchase order status
    async updatePurchaseOrderStatus(id: number, data: UpdatePurchaseOrderStatusRequest): Promise<PurchaseOrder> {
        let action = 'Update Purchase Order Status'
        const client = await pool.connect();
        try {
            MyLogger.info(action, { purchaseOrderId: id, newStatus: data.status })

            await client.query('BEGIN');

            // Check if purchase order exists
            const checkQuery = `SELECT id, status FROM purchase_orders WHERE id = $1`;
            const checkResult = await client.query(checkQuery, [id]);
            
            if (checkResult.rows.length === 0) {
                throw createError('Purchase order not found', 404);
            }

            const currentPO = checkResult.rows[0];

            // Update status
            const updateQuery = `
                UPDATE purchase_orders 
                SET status = $1, 
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `;

            const result = await client.query(updateQuery, [data.status, id]);
            
            // Update approval fields if status is approved
            if (data.status === 'approved') {
                await client.query(
                    'UPDATE purchase_orders SET approved_by = $1, approved_date = CURRENT_DATE WHERE id = $2',
                    ['System User', id]
                );
            }
            const updatedPO = result.rows[0];

            // Add timeline entry
            const timelineQuery = `
                INSERT INTO purchase_order_timeline (
                    purchase_order_id, event, description, "user", status
                )
                VALUES ($1, $2, $3, $4, $5)
            `;

            const eventMap: { [key: string]: string } = {
                'draft': 'Status Changed to Draft',
                'pending': 'Submitted for Approval',
                'approved': 'Approved',
                'sent': 'Sent to Supplier',
                'partially_received': 'Partially Received',
                'received': 'Fully Received',
                'cancelled': 'Cancelled'
            };

            await client.query(timelineQuery, [
                id,
                eventMap[data.status] || `Status Changed to ${data.status}`,
                data.notes,
                'System User',
                'completed'
            ]);

            // Create invoice when status is changed to received
            if (data.status === 'received') {
                try {
                    const invoiceData = {
                        purchase_order_id: id,
                        supplier_id: updatedPO.supplier_id,
                        invoice_date: new Date().toISOString().split('T')[0],
                        due_date: this.calculateDueDate(updatedPO.payment_terms),
                        total_amount: parseFloat(updatedPO.total_amount),
                        terms: updatedPO.payment_terms,
                        notes: `Invoice for Purchase Order ${updatedPO.po_number}`
                    };

                    const invoice = await InvoiceMediator.createInvoice(invoiceData);
                    
                    // Add timeline entry for invoice creation
                    await client.query(timelineQuery, [
                        id,
                        'Invoice Created',
                        `Invoice ${invoice.invoice_number} created automatically`,
                        'System User',
                        'completed'
                    ]);

                    MyLogger.success('Invoice Created', { 
                        purchaseOrderId: id,
                        invoiceId: invoice.id,
                        invoiceNumber: invoice.invoice_number
                    });
                } catch (invoiceError: any) {
                    MyLogger.error('Failed to create invoice', invoiceError, { 
                        purchaseOrderId: id 
                    });
                    // Don't fail the entire transaction if invoice creation fails
                }
            }

            await client.query('COMMIT');

            MyLogger.success(action, { 
                purchaseOrderId: id,
                oldStatus: currentPO.status,
                newStatus: data.status
            });

            return updatedPO;
        } catch (error) {
            await client.query('ROLLBACK');
            MyLogger.error(action, error, { purchaseOrderId: id })
            throw error;
        } finally {
            client.release();
        }
    }

    // Receive goods for purchase order
    async receiveGoods(id: number, data: ReceiveGoodsRequest): Promise<PurchaseOrder> {
        let action = 'Receive Goods'
        const client = await pool.connect();
        try {
            MyLogger.info(action, { purchaseOrderId: id })

            await client.query('BEGIN');

            // Check if purchase order exists and is in correct status
            const checkQuery = `
                SELECT id, status, total_amount 
                FROM purchase_orders 
                WHERE id = $1
            `;
            const checkResult = await client.query(checkQuery, [id]);
            
            if (checkResult.rows.length === 0) {
                throw createError('Purchase order not found', 404);
            }

            const currentPO = checkResult.rows[0];
            
            if (!['approved', 'sent', 'partially_received'].includes(currentPO.status)) {
                throw createError('Cannot receive goods for purchase order in current status', 400);
            }

            let allItemsReceived = true;
            let newStatus = 'partially_received';

            // Update line items
            for (const receivedItem of data.line_items) {
                const lineItemQuery = `
                    SELECT id, quantity, received_quantity, pending_quantity
                    FROM purchase_order_line_items
                    WHERE id = $1 AND purchase_order_id = $2
                `;
                const lineItemResult = await client.query(lineItemQuery, [receivedItem.line_item_id, id]);
                
                if (lineItemResult.rows.length === 0) {
                    throw createError(`Line item with ID ${receivedItem.line_item_id} not found`, 404);
                }

                const lineItem = lineItemResult.rows[0];
                const newReceivedQuantity = lineItem.received_quantity + receivedItem.received_quantity;
                const newPendingQuantity = lineItem.pending_quantity - receivedItem.received_quantity;

                if (newReceivedQuantity > lineItem.quantity) {
                    throw createError(`Cannot receive more than ordered quantity for line item ${receivedItem.line_item_id}`, 400);
                }

                // Update line item
                const updateLineItemQuery = `
                    UPDATE purchase_order_line_items
                    SET received_quantity = $1, pending_quantity = $2, updated_at = CURRENT_TIMESTAMP
                    WHERE id = $3
                `;
                await client.query(updateLineItemQuery, [newReceivedQuantity, newPendingQuantity, receivedItem.line_item_id]);

                // Check if all items are fully received
                if (newReceivedQuantity < lineItem.quantity) {
                    allItemsReceived = false;
                }
            }

            // Update purchase order status
            if (allItemsReceived) {
                newStatus = 'received';
            }

            const updatePOQuery = `
                UPDATE purchase_orders
                SET status = $1, 
                    actual_delivery_date = COALESCE($2, CURRENT_DATE),
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $3
                RETURNING *
            `;

            const result = await client.query(updatePOQuery, [newStatus, data.received_date, id]);
            const updatedPO = result.rows[0];

            // Add timeline entry
            const timelineQuery = `
                INSERT INTO purchase_order_timeline (
                    purchase_order_id, event, description, "user", status
                )
                VALUES ($1, $2, $3, $4, $5)
            `;

            const eventDescription = allItemsReceived 
                ? 'All goods received' 
                : `Partial goods received: ${data.line_items.length} items`;

            await client.query(timelineQuery, [
                id,
                allItemsReceived ? 'Goods Received' : 'Partial Goods Received',
                data.notes || eventDescription,
                'System User',
                'completed'
            ]);

            // Create invoice when all goods are received
            if (allItemsReceived) {
                try {
                    const invoiceData = {
                        purchase_order_id: id,
                        supplier_id: updatedPO.supplier_id,
                        invoice_date: new Date().toISOString().split('T')[0],
                        due_date: this.calculateDueDate(updatedPO.payment_terms),
                        total_amount: parseFloat(updatedPO.total_amount),
                        terms: updatedPO.payment_terms,
                        notes: `Invoice for Purchase Order ${updatedPO.po_number}`
                    };

                    const invoice = await InvoiceMediator.createInvoice(invoiceData);
                    
                    // Add timeline entry for invoice creation
                    await client.query(timelineQuery, [
                        id,
                        'Invoice Created',
                        `Invoice ${invoice.invoice_number} created automatically`,
                        'System User',
                        'completed'
                    ]);

                    MyLogger.success('Invoice Created', { 
                        purchaseOrderId: id,
                        invoiceId: invoice.id,
                        invoiceNumber: invoice.invoice_number
                    });
                } catch (invoiceError: any) {
                    MyLogger.error('Failed to create invoice', invoiceError, { 
                        purchaseOrderId: id 
                    });
                    // Don't fail the entire transaction if invoice creation fails
                }
            }

            await client.query('COMMIT');

            MyLogger.success(action, { 
                purchaseOrderId: id,
                newStatus,
                receivedItemsCount: data.line_items.length,
                allItemsReceived
            });

            return updatedPO;
        } catch (error) {
            await client.query('ROLLBACK');
            MyLogger.error(action, error, { purchaseOrderId: id })
            throw error;
        } finally {
            client.release();
        }
    }
}

export default new UpdatePurchaseOrderInfoMediator();
