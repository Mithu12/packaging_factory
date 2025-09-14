import pool from '@/database/connection';
import { SalesOrder, CreateSalesOrderRequest } from '@/types/pos';
import { MyLogger } from '@/utils/new-logger';
import { SequenceHelper } from '@/database/add-sequences';

export class AddSalesOrderMediator {
    static async createSalesOrder(data: CreateSalesOrderRequest): Promise<SalesOrder> {
        let action = 'AddSalesOrderMediator.createSalesOrder';
        try {
            MyLogger.info(action, { 
                customerId: data.customer_id, 
                paymentMethod: data.payment_method,
                lineItemsCount: data.line_items.length
            });

            const client = await pool.connect();
            
            try {
                await client.query('BEGIN');

                // Generate order number using sequence
                const orderNumber = await SequenceHelper.getNextSalesOrderNumber(client);

                // Calculate totals
                let subtotal = 0;
                const lineItemsData = [];

                for (const item of data.line_items) {
                    const discountAmount = (item.unit_price * item.quantity * (item.discount_percentage || 0)) / 100;
                    const lineTotal = (item.unit_price * item.quantity) - discountAmount;
                    subtotal += lineTotal;

                    lineItemsData.push({
                        product_id: item.product_id,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        discount_percentage: item.discount_percentage || 0,
                        discount_amount: discountAmount,
                        line_total: lineTotal
                    });
                }

                // For now, we'll use a simple tax calculation (10%)
                const taxAmount = subtotal * 0.1;
                const totalAmount = subtotal + taxAmount;

                // Calculate change if cash payment
                let changeGiven = 0;
                if (data.payment_method === 'cash' && data.cash_received) {
                    changeGiven = Math.max(0, data.cash_received - totalAmount);
                }

                // Insert sales order
                const insertOrderQuery = `
                    INSERT INTO sales_orders (
                        order_number,
                        customer_id,
                        payment_method,
                        subtotal,
                        tax_amount,
                        total_amount,
                        cash_received,
                        change_given,
                        notes
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9
                    ) RETURNING *
                `;

                const orderValues = [
                    orderNumber,
                    data.customer_id || null,
                    data.payment_method,
                    subtotal,
                    taxAmount,
                    totalAmount,
                    data.cash_received || 0,
                    changeGiven,
                    data.notes || null
                ];

                const orderResult = await client.query(insertOrderQuery, orderValues);
                const salesOrder = orderResult.rows[0];

                // Insert line items
                for (const itemData of lineItemsData) {
                    // Get product details
                    const productQuery = `
                        SELECT sku, name
                        FROM products
                        WHERE id = $1
                    `;
                    const productResult = await client.query(productQuery, [itemData.product_id]);
                    
                    if (productResult.rows.length === 0) {
                        throw new Error(`Product with ID ${itemData.product_id} not found`);
                    }

                    const product = productResult.rows[0];

                    const insertLineItemQuery = `
                        INSERT INTO sales_order_line_items (
                            sales_order_id,
                            product_id,
                            product_sku,
                            product_name,
                            quantity,
                            unit_price,
                            discount_percentage,
                            discount_amount,
                            line_total
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, $9
                        )
                    `;

                    const lineItemValues = [
                        salesOrder.id,
                        itemData.product_id,
                        product.sku,
                        product.name,
                        itemData.quantity,
                        itemData.unit_price,
                        itemData.discount_percentage,
                        itemData.discount_amount,
                        itemData.line_total
                    ];

                    await client.query(insertLineItemQuery, lineItemValues);

                    // Update product stock
                    const updateStockQuery = `
                        UPDATE products 
                        SET current_stock = current_stock - $1,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `;
                    await client.query(updateStockQuery, [itemData.quantity, itemData.product_id]);
                }

                // Update customer total purchases if customer exists
                if (data.customer_id) {
                    const updateCustomerQuery = `
                        UPDATE customers 
                        SET total_purchases = total_purchases + $1,
                            last_purchase_date = CURRENT_DATE,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `;
                    await client.query(updateCustomerQuery, [totalAmount, data.customer_id]);
                }

                await client.query('COMMIT');

                MyLogger.success(action, { 
                    salesOrderId: salesOrder.id, 
                    orderNumber: salesOrder.order_number,
                    totalAmount: salesOrder.total_amount
                });

                return salesOrder;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: data.customer_id });
            throw error;
        }
    }

}
