import { PoolClient } from 'pg';
import { MyLogger } from '@/utils/new-logger';

export class LoyaltyService {
    /**
     * Award loyalty points to a customer based on a completed order
     * @param orderId ID of the completed sales order
     * @param client Database client for transaction
     */
    static async awardLoyaltyPointsFromOrder(orderId: number, client: PoolClient): Promise<void> {
        let action = 'LoyaltyService.awardLoyaltyPointsFromOrder';
        try {
            // 1. Fetch order details to get customer_id and loyalty_points_earned
            const orderQuery = `
                SELECT customer_id, loyalty_points_earned, order_number 
                FROM sales_orders 
                WHERE id = $1
            `;
            const orderResult = await client.query(orderQuery, [orderId]);

            if (orderResult.rows.length === 0) {
                MyLogger.warn(action, { message: 'Order not found', orderId });
                return;
            }

            const { customer_id, loyalty_points_earned, order_number } = orderResult.rows[0];

            if (!customer_id || !loyalty_points_earned || loyalty_points_earned <= 0) {
                MyLogger.info(action, { 
                    message: 'No loyalty points to award', 
                    orderId, 
                    customerId: customer_id, 
                    points: loyalty_points_earned 
                });
                return;
            }

            MyLogger.info(action, { orderId, customerId: customer_id, points: loyalty_points_earned });

            // 2. Update customer loyalty points balance
            const updateCustomerQuery = `
                UPDATE customers 
                SET loyalty_points = loyalty_points + $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING loyalty_points
            `;
            const customerResult = await client.query(updateCustomerQuery, [loyalty_points_earned, customer_id]);

            if (customerResult.rows.length === 0) {
                throw new Error(`Customer with ID ${customer_id} not found`);
            }

            const newBalance = customerResult.rows[0].loyalty_points;

            // 3. Record the transaction in loyalty_points_transactions
            const insertTransactionQuery = `
                INSERT INTO loyalty_points_transactions (
                    customer_id, type, points, balance_after, description, reference_id
                ) VALUES ($1, 'earn', $2, $3, $4, $5)
            `;
            await client.query(insertTransactionQuery, [
                customer_id,
                loyalty_points_earned,
                newBalance,
                `Points earned from order ${order_number}`,
                orderId
            ]);

            MyLogger.success(action, { 
                orderId, 
                customerId: customer_id, 
                awardedPoints: loyalty_points_earned, 
                newBalance 
            });

        } catch (error: any) {
            MyLogger.error(action, error, { orderId });
            throw error;
        }
    }

    /**
     * Calculate loyalty points based on amount
     * @param amount Transaction amount
     * @returns Number of points
     */
    static calculatePoints(amount: number): number {
        // Default rule: 1 point per 100 units
        return Math.floor(amount / 100);
    }
}
