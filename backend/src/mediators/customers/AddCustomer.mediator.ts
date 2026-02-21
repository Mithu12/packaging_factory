import pool from '@/database/connection';
import { Customer, CreateCustomerRequest } from '@/types/pos';
import { MyLogger } from '@/utils/new-logger';
import bcrypt from 'bcryptjs';

export class AddCustomerMediator {
    static async createCustomer(data: CreateCustomerRequest): Promise<Customer> {
        let action = 'AddCustomerMediator.createCustomer';
        try {
            MyLogger.info(action, { customerName: data.name, customerType: data.customer_type });

            const client = await pool.connect();
            
            try {
                await client.query('BEGIN');

                let passwordHash = null;
                if (data.password) {
                    passwordHash = await bcrypt.hash(data.password, 10);
                }

                // Generate customer code using sequence
                const customerCode = await this.getNextCustomerCode(client);

                const insertQuery = `
                    INSERT INTO customers (
                        customer_code,
                        name,
                        email,
                        phone,
                        address,
                        city,
                        state,
                        zip_code,
                        country,
                        date_of_birth,
                        gender,
                        customer_type,
                        notes,
                        credit_limit,
                        opening_due,
                        due_amount,
                        password_hash,
                        erp_access_approved
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18
                    ) RETURNING *
                `;

                const values = [
                    customerCode,
                    data.name,
                    data.email || null,
                    data.phone || null,
                    data.address || null,
                    data.city || null,
                    data.state || null,
                    data.zip_code || null,
                    data.country || null,
                    data.date_of_birth || null,
                    data.gender || null,
                    data.customer_type || 'regular',
                    data.notes || null,
                    data.credit_limit || 0,
                    data.opening_due || 0,
                    data.opening_due || 0, // Initial due_amount equals opening_due
                    passwordHash,
                    data.erp_access_approved || false
                ];

                const result = await client.query(insertQuery, values);
                const customer = result.rows[0];

                // Record opening due in customer_payments if > 0
                if (data.opening_due && data.opening_due > 0) {
                    const paymentInsertQuery = `
                        INSERT INTO customer_payments (
                            customer_id, payment_type, payment_amount,
                            payment_date, payment_method, recorded_by, notes
                        ) VALUES ($1, 'adjustment', $2, CURRENT_TIMESTAMP, 'other', $3, $4)
                    `;
                    await client.query(paymentInsertQuery, [
                        customer.id,
                        data.opening_due,
                        1, // System/Default user ID
                        'Opening Due from onboarding'
                    ]);
                }

                await client.query('COMMIT');

                MyLogger.success(action, { 
                    customerId: customer.id, 
                    customerCode: customer.customer_code,
                    customerName: customer.name 
                });

                return customer;
            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }
        } catch (error: any) {
            MyLogger.error(action, error, { customerName: data.name });
            throw error;
        }
    }

    private static async getNextCustomerCode(client: any): Promise<string> {
        const result = await client.query('SELECT nextval(\'customer_code_seq\') as next_number');
        const nextNumber = result.rows[0].next_number;
        return `CUS-${nextNumber.toString().padStart(4, '0')}`;
    }

}
