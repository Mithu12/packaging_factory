import pool from "@/database/connection";
import {
  CreateSupplierRequest,
  Supplier,
} from "@/types/supplier";
import { createError } from "@/middleware/errorHandler";
import { MyLogger } from "@/utils/new-logger";
import { InvoiceMediator } from "../payments/InvoiceMediator";


class AddSupplierMediator {
  // Generate unique supplier code
  private async generateSupplierCode(): Promise<string> {
    let action = "Get Supplier Code";
    try {
      MyLogger.info(action);
      const result = await pool.query(
        `select nextval('supplier_code_suppliers') as code;`,
        []
      );
      const count = parseInt(result.rows[0].code);
      let code = `SUP-${count.toString().padStart(3, "0")}`;
      MyLogger.success(action, { code });
      return code;
    } catch (e) {
      MyLogger.error(action, e);
      throw e;
    }
  }

  // Create a new supplier
  async createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
    let action = "Create Supplier";
    const client = await pool.connect();
    try {
      MyLogger.info(action, { supplierName: data.name });

      const {
        name,
        contact_person,
        phone,
        email,
        whatsapp_number,
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
        opening_balance,
      } = data;
      const supplierCode = await this.generateSupplierCode();

      const query = `
                INSERT INTO suppliers (supplier_code, name, contact_person, phone, email, whatsapp_number, website,
                                       address, city, state, zip_code, country, category, tax_id, vat_id,
                                       payment_terms, bank_name, bank_account, bank_routing, swift_code, iban,
                                       status, notes, opening_balance)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
                        $22, $23, $24)
                RETURNING *
            `;

      const values = [
        supplierCode,
        name,
        contact_person,
        phone,
        email,
        whatsapp_number,
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
        status || "active",
        notes,
        opening_balance || 0,
      ];

      const result = await client.query(query, values);
      const supplier = result.rows[0];

      // Create opening balance invoice if needed
      if (opening_balance && opening_balance > 0) {
        const obInvoiceData = {
          supplier_id: supplier.id,
          total_amount: opening_balance,
          invoice_date: new Date().toISOString().split("T")[0],
          due_date: new Date().toISOString().split("T")[0], // Default to today for onboarding
          notes: "Opening balance from system onboarding",
          terms: "Opening Balance",
        };

        try {
          // We use a custom number for OB invoices
          const invoiceNumber = `OB-INV-${supplier.supplier_code}`;
          
          const obQuery = `
            INSERT INTO invoices (
              invoice_number, supplier_id, invoice_date, due_date,
              total_amount, outstanding_amount, terms, notes, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          `;
          const obValues = [
            invoiceNumber,
            supplier.id,
            obInvoiceData.invoice_date,
            obInvoiceData.due_date,
            obInvoiceData.total_amount,
            obInvoiceData.total_amount,
            obInvoiceData.terms,
            obInvoiceData.notes,
            'pending'
          ];
          await client.query(obQuery, obValues);
          MyLogger.info("Created Opening Balance Invoice", { supplierId: supplier.id, amount: opening_balance });
        } catch (invoiceError) {
          MyLogger.error("Failed to create Opening Balance Invoice", invoiceError, { supplierId: supplier.id });
          // We don't throw here to avoid failing supplier creation, but maybe we should?
          // Since it's in the same transaction, throwing will rollback supplier creation.
          // For now, let's keep it in the transaction.
          throw invoiceError;
        }
      }

      MyLogger.success(action, { supplierId: supplier.id, supplierCode });
      return supplier;
    } catch (error: any) {
      MyLogger.error(action, error, { supplierName: data.name });
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

export default new AddSupplierMediator();
