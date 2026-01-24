import {
  Supplier,
  UpdateSupplierRequest,
} from "@/types/supplier";
import pool from "@/database/connection";
import { createError } from "@/middleware/errorHandler";
import GetSupplierInfoMediator from "./GetSupplierInfo.mediator";
import { MyLogger } from "@/utils/new-logger";

class UpdateSupplierInfoMediator {
  // Toggle supplier status (activate/deactivate)
  async toggleSupplierStatus(id: number): Promise<Supplier> {
    let action = "Toggle Supplier Status";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { supplierId: id });

      const supplier = await GetSupplierInfoMediator.getSupplierById(id);
      const newStatus = supplier.status === "active" ? "inactive" : "active";

      const result = await client.query(
        "UPDATE suppliers SET status = $1 WHERE id = $2 RETURNING *",
        [newStatus, id]
      );

      MyLogger.success(action, {
        supplierId: id,
        oldStatus: supplier.status,
        newStatus,
      });
      return result.rows[0];
    } catch (error: any) {
      MyLogger.error(action, error, { supplierId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Update supplier
  async updateSupplier(
    id: number,
    data: UpdateSupplierRequest
  ): Promise<Supplier> {
    let action = "Update Supplier";
    const client = await pool.connect();
    try {
      MyLogger.info(action, {
        supplierId: id,
        updateFields: Object.keys(data),
      });

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
        whatsapp_number,
        opening_balance,
      } = data;

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
                        notes          = $22,
                        whatsapp_number = $23,
                        opening_balance = $24
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
          whatsapp_number,
          opening_balance,
        ],
      };

      const result = await client.query(query);
      MyLogger.success(action, {
        supplierId: id,
        supplierName: result.rows[0].name,
      });
      return result.rows[0];
    } catch (error: any) {
      MyLogger.error(action, error, { supplierId: id });
      if (error.code === "23505") {
        // Unique violation
        throw createError("Supplier with this information already exists", 409);
      }
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new UpdateSupplierInfoMediator();
