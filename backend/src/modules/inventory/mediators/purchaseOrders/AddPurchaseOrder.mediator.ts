import pool from "@/database/connection";
import { CreatePurchaseOrderRequest, PurchaseOrder, PurchaseOrderLineItem } from "@/types/purchaseOrder";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";

class AddPurchaseOrderMediator {

    // Generate unique PO number
    private async generatePONumber(): Promise<string> {
        let action = 'Generate PO Number'
        try {
            MyLogger.info(action)
            const result = await pool.query(
                `SELECT nextval('po_number_sequence') as code;`,
                []
            );
            const count = parseInt(result.rows[0].code);
            const year = new Date().getFullYear();
            let poNumber = `PO-${year}-${count.toString().padStart(3, '0')}`;
            MyLogger.success(action, { poNumber })
            return poNumber
        } catch (e) {
            MyLogger.error(action, e)
            throw e;
        }
    }

    // Create a new purchase order
    async createPurchaseOrder(data: CreatePurchaseOrderRequest): Promise<PurchaseOrder> {
        let action = 'Create Purchase Order'
        const client = await pool.connect();
        try {
            MyLogger.info(action, { supplierId: data.supplier_id })
            
            await client.query('BEGIN');

            // Generate PO number
            const poNumber = await this.generatePONumber();

            // Calculate total amount from line items
            const totalAmount = data.line_items.reduce((sum, item) => {
                return sum + (item.quantity * item.unit_price);
            }, 0);

            // Insert purchase order
            const poQuery = `
                INSERT INTO purchase_orders (
                    po_number, supplier_id, expected_delivery_date, priority,
                    payment_terms, delivery_terms, department, project, notes,
                    total_amount, created_by, work_order_id, customer_order_id
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                RETURNING *
            `;

            const poValues = [
                poNumber,
                data.supplier_id,
                data.expected_delivery_date,
                data.priority || 'normal',
                data.payment_terms || 'Net 30',
                data.delivery_terms || 'FOB Destination',
                data.department,
                data.project,
                data.notes,
                totalAmount,
                'System User', // TODO: Get from authentication
                data.work_order_id,
                data.customer_order_id
            ];

            const poResult = await client.query(poQuery, poValues);
            const purchaseOrder = poResult.rows[0];

            // Insert line items
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

                const lineItemQuery = `
                    INSERT INTO purchase_order_line_items (
                        purchase_order_id, product_id, product_sku, product_name,
                        description, quantity, unit_price, total_price,
                        received_quantity, pending_quantity, unit_of_measure
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                    RETURNING *
                `;

                const lineItemValues = [
                    purchaseOrder.id,
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
                ];

                await client.query(lineItemQuery, lineItemValues);
            }

            // Add timeline entry
            const timelineQuery = `
                INSERT INTO purchase_order_timeline (
                    purchase_order_id, event, "user", status
                )
                VALUES ($1, $2, $3, $4)
            `;

            await client.query(timelineQuery, [
                purchaseOrder.id,
                'Purchase Order Created',
                'System User',
                'completed'
            ]);

            await client.query('COMMIT');
            
            MyLogger.success(action, { 
                purchaseOrderId: purchaseOrder.id, 
                poNumber,
                totalAmount,
                lineItemsCount: data.line_items.length
            });
            
            return purchaseOrder;
        } catch (error: any) {
            await client.query('ROLLBACK');
            MyLogger.error(action, error, { supplierId: data.supplier_id })
            if (error.code === '23505') { // Unique violation
                throw createError('Purchase order with this number already exists', 409);
            }
            throw error;
        } finally {
            client.release();
        }
    }
}

export default new AddPurchaseOrderMediator();
