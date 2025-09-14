import pool from '@/database/connection';
import { Customer, CreateCustomerRequest } from '@/types/pos';
import { MyLogger } from '@/utils/new-logger';

export class AddCustomerMediator {
    static async createCustomer(data: CreateCustomerRequest): Promise<Customer> {
        let action = 'AddCustomerMediator.createCustomer';
        try {
            MyLogger.info(action, { customerName: data.name, customerType: data.customer_type });

            const client = await pool.connect();
            
            try {
                await client.query('BEGIN');

                // Generate customer code
                const customerCode = await this.generateCustomerCode(client);

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
                        notes
                    ) VALUES (
                        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
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
                    data.notes || null
                ];

                const result = await client.query(insertQuery, values);
                const customer = result.rows[0];

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

    private static async generateCustomerCode(client: any): Promise<string> {
        let action = 'AddCustomerMediator.generateCustomerCode';
        try {
            // Get the next sequence number
            const sequenceQuery = `
                SELECT COALESCE(MAX(CAST(SUBSTRING(customer_code FROM 4) AS INTEGER)), 0) + 1 as next_number
                FROM customers
                WHERE customer_code ~ '^CUS-[0-9]+$'
            `;
            
            const result = await client.query(sequenceQuery);
            const nextNumber = result.rows[0].next_number;
            
            const customerCode = `CUS-${nextNumber.toString().padStart(4, '0')}`;
            
            MyLogger.info(action, { customerCode });
            return customerCode;
        } catch (error: any) {
            MyLogger.error(action, error);
            throw error;
        }
    }
}
