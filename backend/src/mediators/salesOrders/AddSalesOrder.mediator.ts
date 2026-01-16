import pool from '@/database/connection';
import { SalesOrder, CreateSalesOrderRequest } from '@/types/pos';
import { MyLogger } from '@/utils/new-logger';
import { interModuleConnector } from '@/utils/InterModuleConnector';

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
                        line_total: lineTotal,
                        is_gift: item.is_gift || false
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
                MyLogger.info('Inserting sales order');
                // Insert sales order
                const insertOrderQuery = `
                    INSERT INTO sales_orders (
                        order_number,
                        customer_id,
                        distribution_center_id,
                        order_date,
                        status,
                        payment_status,
                        payment_method,
                        subtotal,
                        discount_amount,
                        tax_amount,
                        total_amount,
                        cash_received,
                        due_amount,
                        change_given,
                        notes
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
                    ) RETURNING *
                `;

                const orderValues = [
                    orderNumber,
                    data.customer_id || null,
                    data.distribution_center_id || null,
                    new Date().toISOString(), // order_date
                    orderStatus,
                    paymentStatus,
                    data.payment_method,
                    discountedSubtotal,
                    overallDiscountAmount,
                    taxAmount,
                    totalAmount,
                    data.cash_received || 0,
                    data.due_amount || 0,
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

                    MyLogger.info('Inserting line item', {
                        salesOrderId: salesOrder.id,
                        productId: itemData.product_id,
                        productSku: product.sku,
                        productName: product.name,
                        quantity: itemData.quantity,
                        unitPrice: itemData.unit_price,
                        discountPercentage: itemData.discount_percentage,
                        discountAmount: itemData.discount_amount,
                        lineTotal: itemData.line_total
                    });
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
                            line_total,
                            is_gift
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
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
                        itemData.line_total,
                        itemData.is_gift
                    ];

                    await client.query(insertLineItemQuery, lineItemValues);

                    // Update product stock - branch-aware stock management
                    MyLogger.info('Updating product stock', {
                        productId: itemData.product_id,
                        quantity: itemData.quantity,
                        distributionCenterId: data.distribution_center_id
                    });

                    if (data.distribution_center_id) {
                        // Branch-specific stock management
                        // Check if product_location exists for this branch
                        const locationCheckQuery = `
                            SELECT id, current_stock, reserved_stock, 
                                   (current_stock - reserved_stock) as available_stock
                            FROM product_locations
                            WHERE product_id = $1 AND distribution_center_id = $2
                        `;
                        const locationResult = await client.query(locationCheckQuery, [
                            itemData.product_id,
                            data.distribution_center_id
                        ]);

                        let locationId: number | null = null;
                        let currentBranchStock = 0;
                        let availableStock = 0;

                        if (locationResult.rows.length > 0) {
                            // Location exists
                            const location = locationResult.rows[0];
                            locationId = location.id;
                            currentBranchStock = parseFloat(location.current_stock);
                            availableStock = parseFloat(location.available_stock);

                            // Check if sufficient stock available
                            if (availableStock < itemData.quantity) {
                                // Get branch name for error message
                                const branchQuery = `SELECT name FROM distribution_centers WHERE id = $1`;
                                const branchResult = await client.query(branchQuery, [data.distribution_center_id]);
                                const branchName = branchResult.rows[0]?.name || `Branch ${data.distribution_center_id}`;
                                
                                throw new Error(
                                    `Insufficient stock at ${branchName}. Available: ${availableStock}, Required: ${itemData.quantity}`
                                );
                            }
                        } else {
                            // Location doesn't exist - create it
                            // Get current stock from products table
                            const productStockQuery = `SELECT current_stock FROM products WHERE id = $1`;
                            const productStockResult = await client.query(productStockQuery, [itemData.product_id]);
                            const productStock = productStockResult.rows[0]?.current_stock || 0;
                            const initialStock = Math.max(0, parseFloat(productStock));

                            // Create product_location
                            const createLocationQuery = `
                                INSERT INTO product_locations (
                                    product_id, distribution_center_id, current_stock, 
                                    min_stock_level, status
                                ) VALUES ($1, $2, $3, 0, 'active')
                                RETURNING id, current_stock, reserved_stock,
                                          (current_stock - reserved_stock) as available_stock
                            `;
                            const createLocationResult = await client.query(createLocationQuery, [
                                itemData.product_id,
                                data.distribution_center_id,
                                initialStock
                            ]);
                            locationId = createLocationResult.rows[0].id;
                            currentBranchStock = parseFloat(createLocationResult.rows[0].current_stock);
                            availableStock = parseFloat(createLocationResult.rows[0].available_stock);

                            // Check if sufficient stock available
                            if (availableStock < itemData.quantity) {
                                const branchQuery = `SELECT name FROM distribution_centers WHERE id = $1`;
                                const branchResult = await client.query(branchQuery, [data.distribution_center_id]);
                                const branchName = branchResult.rows[0]?.name || `Branch ${data.distribution_center_id}`;
                                
                                throw new Error(
                                    `Insufficient stock at ${branchName}. Available: ${availableStock}, Required: ${itemData.quantity}`
                                );
                            }

                            MyLogger.info('Created product location for branch', {
                                productId: itemData.product_id,
                                distributionCenterId: data.distribution_center_id,
                                initialStock: initialStock
                            });
                        }

                        // Deduct from branch stock
                        const updateBranchStockQuery = `
                            UPDATE product_locations 
                            SET current_stock = current_stock - $1,
                                last_movement_date = CURRENT_TIMESTAMP,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = $2
                        `;
                        await client.query(updateBranchStockQuery, [itemData.quantity, locationId]);

                        // Also deduct from total product stock
                        const updateTotalStockQuery = `
                            UPDATE products 
                            SET current_stock = current_stock - $1,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = $2
                        `;
                        await client.query(updateTotalStockQuery, [itemData.quantity, itemData.product_id]);

                        MyLogger.info('Updated branch and total stock', {
                            productId: itemData.product_id,
                            branchId: data.distribution_center_id,
                            quantity: itemData.quantity
                        });
                    } else {
                        // No branch specified - backward compatibility: deduct from total stock only
                        const updateStockQuery = `
                            UPDATE products 
                            SET current_stock = current_stock - $1,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = $2
                        `;
                        await client.query(updateStockQuery, [itemData.quantity, itemData.product_id]);
                    }
                }

                // Update customer total purchases if customer exists
                if (data.customer_id) {
                    MyLogger.info('Updating customer total purchases', {
                        customerId: data.customer_id,
                        totalAmount: totalAmount
                    });
                    const updateCustomerQuery = `
                        UPDATE customers 
                        SET total_purchases = total_purchases + $1,
                            last_purchase_date = CURRENT_DATE,
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = $2
                    `;
                    await client.query(updateCustomerQuery, [totalAmount, data.customer_id]);

                    // Update customer due amount for credit/partial payments
                    if (data.due_amount && data.due_amount > 0) {
                        MyLogger.info('Updating customer due amount', {
                            customerId: data.customer_id,
                            dueAmount: data.due_amount,
                            paymentMethod: data.payment_method
                        });
                        const updateDueAmountQuery = `
                            UPDATE customers 
                            SET due_amount = COALESCE(due_amount, 0) + $1,
                                updated_at = CURRENT_TIMESTAMP
                            WHERE id = $2
                        `;
                        await client.query(updateDueAmountQuery, [data.due_amount, data.customer_id]);
                    }

                    // Record upfront payment if cash_received > 0
                    if (data.cash_received && data.cash_received > 0) {
                        MyLogger.info('Recording upfront payment', {
                            customerId: data.customer_id,
                            salesOrderId: salesOrder.id,
                            cashReceived: data.cash_received,
                            paymentMethod: data.payment_method
                        });
                        const paymentInsertQuery = `
                            INSERT INTO customer_payments (
                                customer_id, sales_order_id, payment_type, payment_amount,
                                payment_date, payment_method, recorded_by, notes
                            ) VALUES ($1, $2, 'upfront', $3, $4, $5, $6, $7)
                        `;
                        await client.query(paymentInsertQuery, [
                            data.customer_id,
                            salesOrder.id,
                            data.cash_received,
                            salesOrder.order_date,
                            data.payment_method || 'cash',
                            data.cashier_id || 1,
                            `Upfront payment for order ${salesOrder.order_number}`
                        ]);
                    }
                }

                await client.query('COMMIT');

                MyLogger.success(action, { 
                    salesOrderId: salesOrder.id, 
                    orderNumber: salesOrder.order_number,
                    totalAmount: salesOrder.total_amount
                });

                // Trigger accounts integration for POS cases where order is created as completed
                try {
                    if (salesOrder.status === 'completed' && !salesOrder.voucher_id) {
                        await interModuleConnector.accModule.addSalesVoucher({
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
                        }, Number(salesOrder.cashier_id) || 1);
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
