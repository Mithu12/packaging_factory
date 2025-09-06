import pool from "@/database/connection";
import {CreateSupplierRequest, Supplier} from "@/types/supplier";
import {createError} from "@/middleware/errorHandler";
import {MyLogger} from "@/utils/new-logger";

class AddSupplierMediator {

    // Generate unique supplier code
    private async generateSupplierCode(): Promise<string> {
        let action = 'Get Supplier Code'
        try {
            MyLogger.info(action)
            const result = await pool.query(
                'SELECT COUNT(*) FROM suppliers WHERE supplier_code LIKE $1',
                ['SUP-%']
            );
            const count = parseInt(result.rows[0].count) + 1;
            let code = `SUP-${count.toString().padStart(3, '0')}`;
            MyLogger.success(action, {code})
            return code
        } catch (e) {
            MyLogger.error(action, e)
            throw e;
        }
    }

    // Create a new supplier
    async createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
        const client = await pool.connect();
        try {
            const {
                name,
                contact_person,
                phone,
                email,
                website,
                address,
                city,
                state,
                zip_code,
                country,
                category,
                tax_id,
                vat_id,
                payment_terms,
                bank_name,
                bank_account,
                bank_routing,
                swift_code,
                iban,
                status,
                notes,
            } = data
            const supplierCode = await this.generateSupplierCode();

            const query = `
                INSERT INTO suppliers (supplier_code, name, contact_person, phone, email, website,
                                       address, city, state, zip_code, country, category, tax_id, vat_id,
                                       payment_terms, bank_name, bank_account, bank_routing, swift_code, iban,
                                       status, notes)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
                        $22)
                RETURNING *
            `;

            const values = [
                supplierCode, name, contact_person, phone, email,
                website, address, city, state, zip_code,
                country, category, tax_id, vat_id, payment_terms,
                bank_name, bank_account, bank_routing, swift_code,
                iban, status || 'active', notes
            ];

            const result = await client.query(query, values);
            return result.rows[0];
        } catch (error: any) {
            if (error.code === '23505') { // Unique violation
                throw createError('Supplier with this information already exists', 409);
            }
            throw error;
        } finally {
            client.release();
        }
    }
}

export default new AddSupplierMediator();