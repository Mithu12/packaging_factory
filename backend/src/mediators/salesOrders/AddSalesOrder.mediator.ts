import pool from '@/database/connection';
import { SalesOrder, CreateSalesOrderRequest } from '@/types/pos';
import { MyLogger } from '@/utils/new-logger';

export class AddSalesOrderMediator {
    static async createSalesOrder(data: CreateSalesOrderRequest): Promise<SalesOrder> {
        let action = 'AddSalesOrderMediator.createSalesOrder';
        try {
            MyLogger.info(action, data);
            const client = await pool.connect();

            try {
                await client.query('BEGIN');

                // Generate order number using sequence
                const orderNumber = await this.getNextSalesOrderNumber(client);

                // Calculate totals
                let subtotal = 0;
                const lineItemsData = [];

                for (const item of data.line_items) {
                    let discountAmount = 0;
                    if (item.discount_percentage) {
                        discountAmount = (item.unit_price * item.quantity * (item.discount_percentage || 0)) / 100;
                    } else if (item.discount_amount) {
                        discountAmount = item.discount_amount;
                    }
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

                // Apply overall discount
                let overallDiscountAmount = 0;
                if (data.discount_percentage && data.discount_percentage > 0) {
                    overallDiscountAmount = (subtotal * data.discount_percentage) / 100;
                    MyLogger.info('Applied percentage discount', { 
                        originalSubtotal: subtotal, 
                        discountPercentage: data.discount_percentage, 
                        discountAmount: overallDiscountAmount 
                    });
                } else if (data.discount_amount && data.discount_amount > 0) {
                    overallDiscountAmount = data.discount_amount;
                    MyLogger.info('Applied fixed discount', { 
                        originalSubtotal: subtotal, 
                        discountAmount: overallDiscountAmount 
                    });
                }
                
                const discountedSubtotal = subtotal - overallDiscountAmount;
                
                // Use tax amount from frontend, or fallback to 10% if not provided
                const taxAmount = data.tax_amount || 0;
                const totalAmount = discountedSubtotal + taxAmount;
                
                MyLogger.info('Tax calculation', { 
                    frontendTaxAmount: data.tax_amount,
                    calculatedTaxAmount: data.tax_amount ? 'using frontend value' : 'using 0% fallback',
                    finalTaxAmount: taxAmount,
                    discountedSubtotal: discountedSubtotal,
                    totalAmount: totalAmount
                });

                // Calculate change if cash payment
                let changeGiven = 0;
                if (data.payment_method === 'cash' && data.cash_received) {
                    changeGiven = Math.max(0, data.cash_received - totalAmount);
                }
                
                // Determine order and payment status based on payment method
                let orderStatus = 'pending';
                let paymentStatus = 'pending';
                
                if (data.payment_method === 'cash') {
                    // Cash payments are immediately completed and paid
                    orderStatus = 'completed';
                    paymentStatus = 'paid';
                } else if (data.payment_method === 'card') {
                    // Card payments are completed but payment status depends on processing
                    orderStatus = 'completed';
                    paymentStatus = 'paid'; // Assuming card payment is processed immediately in POS
                } else if (data.payment_method === 'credit') {
                    // Credit payments remain pending until payment is received
                    orderStatus = 'pending';
                    paymentStatus = 'pending';
                } else {
                    // Other payment methods (check, bank_transfer) remain pending
                    orderStatus = 'pending';
                    paymentStatus = 'pending';
                }
                
                MyLogger.info('Order status determination', {
                    paymentMethod: data.payment_method,
                    orderStatus: orderStatus,
                    paymentStatus: paymentStatus
                });
                
                // Insert sales order
                const insertOrderQuery = `
                    INSERT INTO sales_orders (
                        order_number,
                        customer_id,
                        order_date,
                        status,
                        payment_status,
                        payment_method,
                        subtotal,
                        discount_amount,
                        tax_amount,
                        total_amount,
                        cash_received,
                        change_given,
                        notes
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
                    ) RETURNING *
                `;

                const orderValues = [
                    orderNumber,
                    data.customer_id || null,
                    new Date().toISOString(), // order_date
                    orderStatus,
                    paymentStatus,
                    data.payment_method,
                    discountedSubtotal,
                    overallDiscountAmount,
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

    private static async getNextSalesOrderNumber(client: any): Promise<string> {
        const result = await client.query('SELECT nextval(\'sales_order_number_seq\') as next_number');
        const nextNumber = result.rows[0].next_number;
        return `SO-${nextNumber.toString().padStart(6, '0')}`;
    }

}
