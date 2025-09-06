import pool from "@/database/connection";
import {createError} from "@/middleware/errorHandler";
import GetSupplierInfoMediator from "@/mediators/suppliers/GetSupplierInfo.mediator";
import {MyLogger} from "@/utils/new-logger";

class DeleteSupplierMediator {


    // Delete supplier
    async deleteSupplier(id: number): Promise<void> {
        let action = 'Delete Supplier'
        const client = await pool.connect();
        try {
            MyLogger.info(action, { supplierId: id })
            
            // Check if supplier exists
            const supplier = await GetSupplierInfoMediator.getSupplierById(id);

            const result = await client.query('DELETE FROM suppliers WHERE id = $1', [id]);

            if (result.rowCount === 0) {
                MyLogger.warn(action, { supplierId: id, message: 'Supplier not found for deletion' })
                throw createError('Supplier not found', 404);
            }

            MyLogger.success(action, { supplierId: id, supplierName: supplier.name })
        } catch (error: any) {
            MyLogger.error(action, error, { supplierId: id })
            throw error;
        } finally {
            client.release();
        }
    }
}

export default new DeleteSupplierMediator();