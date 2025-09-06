import {Supplier, UpdateSupplierRequest} from "@/types/supplier";
import pool from "@/database/connection";
import {createError} from "@/middleware/errorHandler";
import GetSupplierInfoMediator from "@/mediators/suppliers/GetSupplierInfo.mediator";

class UpdateSupplierInfoMediator {

    // Toggle supplier status (activate/deactivate)
    async toggleSupplierStatus(id: number): Promise<Supplier> {
        const client = await pool.connect();
        try {
            const supplier = await GetSupplierInfoMediator.getSupplierById(id);
            const newStatus = supplier.status === 'active' ? 'inactive' : 'active';

            const result = await client.query(
                'UPDATE suppliers SET status = $1 WHERE id = $2 RETURNING *',
                [newStatus, id]
            );

            return result.rows[0];
        } finally {
            client.release();
        }
    }


    // Update supplier
    async updateSupplier(id: number, data: UpdateSupplierRequest): Promise<Supplier> {
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

            const query = {
                text: `
                    UPDATE suppliers
                    SET name           = $2,
                        contact_person = $3,
                        phone          = $4,
                        email          = $5,
                        website        = $6,
                        address        = $7,
                        city           = $8,
                        state          = $9,
                        zip_code       = $10,
                        country        = $11,
                        category       = $12,
                        tax_id         = $13,
                        vat_id         = $14,
                        payment_terms  = $15,
                        bank_name      = $16,
                        bank_account   = $17,
                        bank_routing   = $18,
                        swift_code     = $19,
                        iban           = $20,
                        status         = $21,
                        notes          = $22
                    WHERE id = $1
                    RETURNING *
                `,
                values: [
                    id,
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
                ]
            }

            const result = await client.query(query);

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

export default new UpdateSupplierInfoMediator();