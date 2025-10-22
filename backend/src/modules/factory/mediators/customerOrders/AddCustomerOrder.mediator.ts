import pool from "@/database/connection";
import {
    CreateCustomerOrderRequest,
    FactoryCustomerOrder,
    FactoryCustomerOrderStatus,
    OrderLineItem
} from "@/types/factory";
import { MyLogger } from "@/utils/new-logger";
import { recalcFactoryCustomerFinancials } from "../../utils/customerFinancials";

// Helper function to get user's accessible factories
async function getUserFactories(userId: number): Promise<{factory_id: string, factory_name: string, factory_code: string, role: string, is_primary: boolean}[]> {
    const query = 'SELECT * FROM get_user_factories($1)';
    const result = await pool.query(query, [userId]);
    return result.rows;
}

// Helper function to check if user is admin
async function isUserAdmin(userId: number): Promise<boolean> {
    const query = 'SELECT role_id FROM users WHERE id = $1';
    const result = await pool.query(query, [userId]);
    if (result.rows.length === 0) return false;

    // Assuming role_id 1 is admin based on common patterns
    return result.rows[0].role_id === 1;
}
export class AddCustomerOrderMediator {
    static async generateOrderNumber(): Promise<string> {
        const action = "AddCustomerOrderMediator.generateOrderNumber";
        try {
            MyLogger.info(action);

            // Get next value from PostgreSQL sequence
            const query = "SELECT nextval('factory_customer_order_sequence') as next_number";
            const result = await pool.query(query);
            const nextNumber = result.rows[0].next_number;

            const orderNumber = `ORD-${new Date().getFullYear()}-${nextNumber.toString().padStart(4, "0")}`;

            MyLogger.success(action, {
                generatedOrderNumber: orderNumber,
                sequenceNumber: nextNumber,
            });

            return orderNumber;
        } catch (error: any) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    static async validateReferences(orderData: CreateCustomerOrderRequest): Promise<void> {
        const action = "AddCustomerOrderMediator.validateReferences";
        try {
            MyLogger.info(action, { factory_customerId: orderData.factory_customer_id });

            // Validate factory_customer exists and is active
            const factory_customerQuery = "SELECT id, name, email, phone, is_active FROM factory_customers WHERE id = $1";
            const factory_customerResult = await pool.query(factory_customerQuery, [orderData.factory_customer_id]);

            if (factory_customerResult.rows.length === 0) {
                throw new Error(`Customer with ID ${orderData.factory_customer_id} not found`);
            }

            if (!factory_customerResult.rows[0].is_active) {
                throw new Error(`Customer ${factory_customerResult.rows[0].name} is not active`);
            }

            // Validate all products exist and are active
            const productIds = orderData.line_items.map(item => item.product_id);
            if (productIds.length > 0) {
                const productQuery = `
                    SELECT id, name, sku, cost_price as unit_price, unit_of_measure, status
                    FROM products
                    WHERE id = ANY($1)
                `;
                const productResult = await pool.query(productQuery, [productIds]);

                if (productResult.rows.length !== productIds.length) {
                    const foundIds = productResult.rows.map(row => row.id);
                    const missingIds = productIds.filter(id => !foundIds.includes(id));
                    throw new Error(`Products not found: ${missingIds.join(', ')}`);
                }

                // Check if all products are active
                const inactiveProducts = productResult.rows.filter(row => row.status !== 'active');
                if (inactiveProducts.length > 0) {
                    throw new Error(`Inactive products: ${inactiveProducts.map(p => p.name).join(', ')}`);
                }
            }

            MyLogger.success(action, { message: "All references validated successfully" });
        } catch (error: any) {
            MyLogger.error(action, error);
            throw error;
        }
    }

    static async createCustomerOrder(
        orderData: CreateCustomerOrderRequest,
        userId: string
    ): Promise<FactoryCustomerOrder> {
        const action = "AddCustomerOrderMediator.createCustomerOrder";
        const client = await pool.connect();

        try {
            await client.query('BEGIN');

            MyLogger.info(action, {
                factory_customerId: orderData.factory_customer_id,
                lineItemsCount: orderData.line_items.length,
                userId
            });

            // Get user's accessible factories for factory access control
            const currentUserId = parseInt(userId);
            let userFactories: string[] = [];
            if (currentUserId) {
                const isAdmin = await isUserAdmin(currentUserId);
                if (!isAdmin) {
                    const factories = await getUserFactories(currentUserId);
                    userFactories = factories.map(f => f.factory_id);
                    MyLogger.info('userFactories',userFactories)
                    // If no factories are accessible, deny access
                    if (userFactories.length === 0) {
                        throw new Error('No factories accessible to user');
                    }
                }
            }
            // Validate references
            await this.validateReferences(orderData);
            // Generate order number
            const orderNumber = await this.generateOrderNumber();
            MyLogger.info('orderNumber',orderNumber)
            // Get factory_customer details
            const factory_customerQuery = "SELECT name, email, phone FROM factory_customers WHERE id = $1";
            const factory_customerResult = await client.query(factory_customerQuery, [orderData.factory_customer_id]);
            const factory_customer = factory_customerResult.rows[0];
            MyLogger.info('factory_customer',factory_customer)
            // Calculate total value
            let totalValue = 0;
            const processedLineItems = orderData.line_items.map(item => {
                const discountAmount = item.discount_percentage
                    ? (item.unit_price * item.quantity * item.discount_percentage) / 100
                    : 0;
                const lineTotal = (item.unit_price * item.quantity) - discountAmount;
                totalValue += lineTotal;

                return {
                    ...item,
                    discount_amount: discountAmount,
                    line_total: lineTotal
                };
            });
            MyLogger.info('processedLineItems',processedLineItems)
            // Insert factory_customer order
            const orderQuery = `
        INSERT INTO factory_customer_orders (
          order_number, factory_customer_id, factory_customer_name, factory_customer_email, factory_customer_phone,
          order_date, required_date, status, priority, total_value, currency,
          sales_person, notes, terms, payment_terms, shipping_address, billing_address,
          attachments, created_by, created_at, factory_id, paid_amount, outstanding_amount
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
        ) RETURNING *
      `;

            const orderValues = [
                orderNumber,
                orderData.factory_customer_id,
                factory_customer.name,
                factory_customer.email,
                factory_customer.phone,
                new Date(),
                new Date(orderData.required_date),
                FactoryCustomerOrderStatus.DRAFT,
                orderData.priority,
                totalValue,
                'BDT', // Default currency
                userId, // sales_person is the current user
                orderData.notes && orderData.notes.trim() !== '' ? orderData.notes : null,
                orderData.terms && orderData.terms.trim() !== '' ? orderData.terms : null,
                orderData.payment_terms,
                JSON.stringify(orderData.shipping_address),
                JSON.stringify(orderData.billing_address),
                JSON.stringify([]), // Empty attachments array
                userId,
                new Date(),
                orderData.factory_id,
                0, // paid_amount - new orders start unpaid
                totalValue // outstanding_amount - full amount is outstanding
            ];

            const orderResult = await client.query(orderQuery, orderValues);

            // Insert order line items
            const lineItems: OrderLineItem[] = [];
            for (const item of processedLineItems) {

                // Get product details
                const productQuery = "SELECT name, sku, unit_of_measure FROM products WHERE id = $1";
                const productResult = await client.query(productQuery, [item.product_id]);
                const product = productResult.rows[0];

                const lineItemQuery = `
                    INSERT INTO factory_customer_order_line_items (
                        order_id, product_id, product_name, product_sku, description,
                        quantity, unit_price, discount_percentage, discount_amount, line_total,
                        unit_of_measure, specifications, delivery_date, is_optional, created_at
                    ) VALUES (
                                 $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
                             ) RETURNING *
                `;

                const lineItemValues = [
                    orderResult.rows[0].id,
                    item.product_id,
                    product.name,
                    product.sku,
                    item.specifications && item.specifications.trim() !== '' ? item.specifications : null,
                    item.quantity,
                    item.unit_price,
                    item.discount_percentage && item.discount_percentage > 0 ? item.discount_percentage : null,
                    item.discount_amount,
                    item.line_total,
                    product.unit_of_measure,
                    item.specifications && item.specifications.trim() !== '' ? item.specifications : null,
                    item.delivery_date ? new Date(item.delivery_date) : null,
                    item.is_optional || false,
                    new Date()
                ];

                const lineItemResult = await client.query(lineItemQuery, lineItemValues);

                lineItems.push({
                    id: lineItemResult.rows[0].id,
                    order_id: orderResult.rows[0].id,
                    product_id: item.product_id,
                    product_name: product.name,
                    product_sku: product.sku,
                    description: item.specifications || undefined,
                    quantity: item.quantity,
                    unit_price: item.unit_price,
                    discount_percentage: item.discount_percentage,
                    discount_amount: item.discount_amount,
                    line_total: item.line_total,
                    unit_of_measure: product.unit_of_measure,
                    specifications: item.specifications,
                    delivery_date: item.delivery_date,
                    is_optional: item.is_optional || false,
                    created_at: lineItemResult.rows[0].created_at.toISOString(),
                });
            }

            await recalcFactoryCustomerFinancials(client, orderResult.rows[0].factory_customer_id);

            await client.query('COMMIT');

            const createdOrder: FactoryCustomerOrder = {
                id: orderResult.rows[0].id,
                order_number: orderResult.rows[0].order_number,
                factory_customer_id: orderResult.rows[0].factory_customer_id,
                factory_customer_name: orderResult.rows[0].factory_customer_name,
                factory_customer_email: orderResult.rows[0].factory_customer_email,
                factory_customer_phone: orderResult.rows[0].factory_customer_phone,
                order_date: orderResult.rows[0].order_date.toISOString(),
                required_date: orderResult.rows[0].required_date.toISOString(),
                status: orderResult.rows[0].status,
                priority: orderResult.rows[0].priority,
                paid_amount: 0,
                outstanding_amount: parseFloat(orderResult.rows[0].total_value),
                total_value: orderResult.rows[0].total_value,
                currency: orderResult.rows[0].currency,
                sales_person: orderResult.rows[0].sales_person,
                notes: orderResult.rows[0].notes,
                terms: orderResult.rows[0].terms,
                payment_terms: orderResult.rows[0].payment_terms,
                shipping_address: orderResult.rows[0].shipping_address,
                billing_address: orderResult.rows[0].billing_address,
                line_items: lineItems,
                attachments: orderResult.rows[0].attachments,
                created_by: orderResult.rows[0].created_by,
                created_at: orderResult.rows[0].created_at.toISOString(),
            };

            MyLogger.success(action, {
                orderId: createdOrder.id,
                orderNumber: createdOrder.order_number,
                totalValue: createdOrder.total_value,
                lineItemsCount: lineItems.length
            });

            return createdOrder;

        } catch (error: any) {
            await client.query('ROLLBACK');
            MyLogger.error(action, error);
            throw error;
        } finally {
            client.release();
        }
    }
}

export default AddCustomerOrderMediator;
