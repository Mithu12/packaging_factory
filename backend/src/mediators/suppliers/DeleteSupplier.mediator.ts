import pool from "@/database/connection";
import {createError} from "@/middleware/errorHandler";
import GetSupplierInfoMediator from "@/mediators/suppliers/GetSupplierInfo.mediator";

class DeleteSupplierMediator {


    // Delete supplier
    async deleteSupplier(id: number): Promise<void> {
        const client = await pool.connect();
        try {
            // Check if supplier exists
            await GetSupplierInfoMediator.getSupplierById(id);

            const result = await client.query('DELETE FROM suppliers WHERE id = $1', [id]);

            if (result.rowCount === 0) {
                throw createError('Supplier not found', 404);
            }
        } finally {
            client.release();
        }
    }
}

export default new DeleteSupplierMediator();