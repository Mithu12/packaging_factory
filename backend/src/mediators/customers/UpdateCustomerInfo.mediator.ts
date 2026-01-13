import pool from '@/database/connection';
import { Customer, UpdateCustomerRequest } from '@/types/pos';
import { MyLogger } from '@/utils/new-logger';

export class UpdateCustomerInfoMediator {
    static async updateCustomer(id: number, data: UpdateCustomerRequest): Promise<Customer> {
        let action = 'UpdateCustomerInfoMediator.updateCustomer';
        try {
            MyLogger.info(action, { customerId: id, updateFields: Object.keys(data) });

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
                    UPDATE customers 
                    SET ${updateFields.join(', ')}
                    WHERE id = $${paramIndex}
                    RETURNING *
                `;

                values.push(id);
                const result = await client.query(updateQuery, values);

                if (result.rows.length === 0) {
                    throw new Error(`Customer with ID ${id} not found`);
                }

                const customer = result.rows[0];
                await client.query('COMMIT');

                MyLogger.success(action, { 
                    customerId: id, 
                    customerName: customer.name,
                    updatedFields: Object.keys(data)
                });

                return customer;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: id });
            throw error;
        }
    }

    static async toggleCustomerStatus(id: number): Promise<Customer> {
        let action = 'UpdateCustomerInfoMediator.toggleCustomerStatus';
        try {
            MyLogger.info(action, { customerId: id });

            const toggleQuery = `
                UPDATE customers 
                SET status = CASE 
                    WHEN status = 'active' THEN 'inactive'
                    ELSE 'active'
                END,
                updated_at = CURRENT_TIMESTAMP
                WHERE id = $1
                RETURNING *
            `;

            const result = await pool.query(toggleQuery, [id]);

            if (result.rows.length === 0) {
                throw new Error(`Customer with ID ${id} not found`);
            }

            const customer = result.rows[0];
            MyLogger.success(action, { 
                customerId: id, 
                customerName: customer.name,
                newStatus: customer.status
            });

            return customer;
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: id });
            throw error;
        }
    }

    static async updateCustomerLoyaltyPoints(id: number, points: number): Promise<Customer> {
        let action = 'UpdateCustomerInfoMediator.updateCustomerLoyaltyPoints';
        try {
            MyLogger.info(action, { customerId: id, points });

            const updateQuery = `
                UPDATE customers 
                SET loyalty_points = loyalty_points + $1,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `;

            const result = await pool.query(updateQuery, [points, id]);

            if (result.rows.length === 0) {
                throw new Error(`Customer with ID ${id} not found`);
            }

            const customer = result.rows[0];
            MyLogger.success(action, { 
                customerId: id, 
                customerName: customer.name,
                newLoyaltyPoints: customer.loyalty_points
            });

            return customer;
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: id, points });
            throw error;
        }
    }

    static async updateCustomerTotalPurchases(id: number, amount: number): Promise<Customer> {
        let action = 'UpdateCustomerInfoMediator.updateCustomerTotalPurchases';
        try {
            MyLogger.info(action, { customerId: id, amount });

            const updateQuery = `
                UPDATE customers 
                SET total_purchases = total_purchases + $1,
                    last_purchase_date = CURRENT_DATE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `;

            const result = await pool.query(updateQuery, [amount, id]);

            if (result.rows.length === 0) {
                throw new Error(`Customer with ID ${id} not found`);
            }

            const customer = result.rows[0];
            MyLogger.success(action, { 
                customerId: id, 
                customerName: customer.name,
                newTotalPurchases: customer.total_purchases
            });

            return customer;
        } catch (error: any) {
            MyLogger.error(action, error, { customerId: id, amount });
            throw error;
        }
    }

    static async collectDuePayment(id: number, amount: number, paymentMethod: string, userId?: number): Promise<Customer> {
        let action = 'UpdateCustomerInfoMediator.collectDuePayment';
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            MyLogger.info(action, { customerId: id, amount, paymentMethod, userId });

            // First, verify the customer exists and has enough due amount
            const checkQuery = `SELECT * FROM customers WHERE id = $1`;
            const checkResult = await client.query(checkQuery, [id]);

            if (checkResult.rows.length === 0) {
                throw new Error(`Customer with ID ${id} not found`);
            }

            const currentDueAmount = checkResult.rows[0].due_amount || 0;
            if (amount > currentDueAmount) {
                throw new Error(`Payment amount (${amount}) exceeds due amount (${currentDueAmount})`);
            }

            if (amount <= 0) {
                throw new Error('Payment amount must be greater than 0');
            }

            const updateQuery = `
                UPDATE customers 
                SET due_amount = COALESCE(due_amount, 0) - $1,
                    last_payment_date = CURRENT_DATE,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
                RETURNING *
            `;

            const result = await client.query(updateQuery, [amount, id]);
            const customer = result.rows[0];

            // Record payment in customer_payments table
            const paymentInsertQuery = `
                INSERT INTO customer_payments (
                    customer_id, sales_order_id, payment_type, payment_amount,
                    payment_date, payment_method, recorded_by, notes
                ) VALUES ($1, NULL, 'due_payment', $2, CURRENT_TIMESTAMP, $3, $4, $5)
                RETURNING id, payment_date, payment_reference
            `;
            const paymentResult = await client.query(paymentInsertQuery, [
                id,
                amount,
                paymentMethod || 'cash',
                userId || 1,
                `Due payment collected - ${paymentMethod || 'cash'}`
            ]);

            const paymentRecord = paymentResult.rows[0];

            await client.query('COMMIT');

            MyLogger.success(action, { 
                customerId: id, 
                customerName: customer.name,
                paymentAmount: amount,
                paymentMethod: paymentMethod,
                newDueAmount: customer.due_amount,
                paymentId: paymentRecord.id
            });

            // Return customer with payment info
            return {
                ...customer,
                payment_id: paymentRecord.id,
                payment_date: paymentRecord.payment_date,
                payment_reference: paymentRecord.payment_reference
            };
        } catch (error: any) {
            await client.query('ROLLBACK');
            MyLogger.error(action, error, { customerId: id, amount, paymentMethod });
            throw error;
        } finally {
            client.release();
        }
    }
}
