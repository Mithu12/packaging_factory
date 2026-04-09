import { Request, Response, NextFunction } from "express";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import pool from "@/database/connection";
import sharedCustomerService from "@/services/sharedCustomerService";
import { moduleRegistry, MODULE_NAMES } from "@/utils/moduleRegistry";

class CustomersController {
  // Get all customers
  async getAllCustomers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const action = "GET /api/factory/customers";
      MyLogger.info(action);

      // Check if both factory and sales-rep modules are available for shared customers
      const isSalesRepAvailable = moduleRegistry.isModuleAvailable(
        MODULE_NAMES.SALESREP
      );

      if (isSalesRepAvailable) {
        // Use shared customer service when both modules are available
        const customers = await sharedCustomerService.getAllCustomers();
        MyLogger.success(action, { count: customers.length, shared: true });
        serializeSuccessResponse(res, customers, "SUCCESS");
      } else {
        // Use factory-specific query when only factory module is available
        const query = `
          SELECT 
            id,
            name,
            email,
            phone,
            company,
            address,
            credit_limit,
            payment_terms,
            is_active,
            created_at,
            updated_at,
            total_order_value,
            total_paid_amount,
            total_outstanding_amount,
            order_count
          FROM factory_customers 
          WHERE is_active = true
          ORDER BY id DESC
        `;

        const result = await pool.query(query);
        MyLogger.success(action, { count: result.rows.length, shared: false });
        serializeSuccessResponse(res, result.rows, "SUCCESS");
      }
    } catch (error) {
      next(error);
    }
  }

  // Search customers
  async searchCustomers(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const action = "GET /api/factory/customers/search";
      const { q } = req.query;
      MyLogger.info(action, { query: q });

      // Check if both factory and sales-rep modules are available for shared customers
      const isSalesRepAvailable = moduleRegistry.isModuleAvailable(
        MODULE_NAMES.SALESREP
      );

      if (isSalesRepAvailable) {
        // Use shared customer service when both modules are available
        const customers = await sharedCustomerService.searchCustomers(
          q as string
        );
        MyLogger.success(action, {
          count: customers.length,
          query: q,
          shared: true,
        });
        serializeSuccessResponse(res, customers, "SUCCESS");
      } else {
        // Use factory-specific query when only factory module is available
        const query = `
          SELECT 
            id,
            name,
            email,
            phone,
            company,
            address,
            credit_limit,
            payment_terms,
            is_active,
            created_at,
            updated_at,
            total_order_value,
            total_paid_amount,
            total_outstanding_amount,
            order_count
          FROM factory_customers 
          WHERE is_active = true
            AND (name ILIKE $1 OR email ILIKE $1 OR company ILIKE $1)
          ORDER BY name
          LIMIT 20
        `;

        const result = await pool.query(query, [`%${q}%`]);
        MyLogger.success(action, {
          count: result.rows.length,
          query: q,
          shared: false,
        });
        serializeSuccessResponse(res, result.rows, "SUCCESS");
      }
    } catch (error) {
      next(error);
    }
  }

  // Get customer by ID
  async getCustomerById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const action = "GET /api/factory/customers/:id";
      const { id } = req.params;
      MyLogger.info(action, { customerId: id });

      const query = `
        SELECT 
          id,
          name,
          email,
          phone,
          company,
          address,
          credit_limit,
          payment_terms,
          is_active,
          created_at,
          updated_at,
          total_order_value,
          total_paid_amount,
          total_outstanding_amount,
          order_count
        FROM factory_customers 
        WHERE id = $1
      `;

      const result = await pool.query(query, [id]);

      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "Customer not found",
          data: null,
        });
        return;
      }

      MyLogger.success(action, { customerId: id, found: true });
      serializeSuccessResponse(res, result.rows[0], "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Create new customer
  async createCustomer(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const action = "POST /api/factory/customers";
      MyLogger.info(action, { customerData: req.body });

      // Check if both factory and sales-rep modules are available for shared customers
      const isSalesRepAvailable = moduleRegistry.isModuleAvailable(
        MODULE_NAMES.SALESREP
      );

      if (isSalesRepAvailable) {
        const customer = await sharedCustomerService.createCustomer(req.body);
        MyLogger.success(action, { customerId: customer.id, shared: true });
        serializeSuccessResponse(res, customer, "SUCCESS");
      } else {
        const {
          name,
          email,
          phone,
          company,
          address,
          credit_limit,
          payment_terms,
        } = req.body;

        const normalizedEmail =
          email != null && String(email).trim() !== ""
            ? String(email).trim()
            : null;

        const query = `
          INSERT INTO factory_customers (name, email, phone, company, address, credit_limit, payment_terms)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, name, email, phone, company, address, credit_limit, payment_terms, is_active, created_at, updated_at
        `;

        const result = await pool.query(query, [
          name,
          normalizedEmail,
          phone || null,
          company || null,
          address || {},
          credit_limit || null,
          payment_terms || "net_30",
        ]);

        MyLogger.success(action, { customerId: result.rows[0].id, name, shared: false });
        serializeSuccessResponse(res, result.rows[0], "SUCCESS");
      }
    } catch (error) {
      next(error);
    }
  }

  // Update customer
  async updateCustomer(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const action = "PUT /api/factory/customers/:id";
      const { id } = req.params;
      MyLogger.info(action, { customerId: id, updateData: req.body });

      // Check if both factory and sales-rep modules are available for shared customers
      const isSalesRepAvailable = moduleRegistry.isModuleAvailable(
        MODULE_NAMES.SALESREP
      );

      if (isSalesRepAvailable) {
        // Shared update logic - ID might be a number (if coming from sales_rep) or UUID
        const numericId = !isNaN(Number(id)) ? Number(id) : id as any;
        const customer = await sharedCustomerService.updateCustomer(numericId, req.body);
        
        if (!customer) {
          res.status(404).json({
            success: false,
            message: "Customer not found",
            data: null,
          });
          return;
        }

        MyLogger.success(action, { customerId: id, updated: true, shared: true });
        serializeSuccessResponse(res, customer, "SUCCESS");
      } else {
        const {
          name,
          email,
          phone,
          company,
          address,
          credit_limit,
          payment_terms,
          is_active,
        } = req.body;

        const normalizedEmail =
          email != null && String(email).trim() !== ""
            ? String(email).trim()
            : null;

        const query = `
          UPDATE factory_customers 
          SET name = $1, email = $2, phone = $3, company = $4, address = $5, 
              credit_limit = $6, payment_terms = $7, is_active = $8, updated_at = CURRENT_TIMESTAMP
          WHERE id = $9
          RETURNING id, name, email, phone, company, address, credit_limit, payment_terms, is_active, created_at, updated_at
        `;

        const result = await pool.query(query, [
          name,
          normalizedEmail,
          phone || null,
          company || null,
          address || {},
          credit_limit || null,
          payment_terms || "net_30",
          is_active !== undefined ? is_active : true,
          id,
        ]);

        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            message: "Customer not found",
            data: null,
          });
          return;
        }

        MyLogger.success(action, { customerId: id, updated: true, shared: false });
        serializeSuccessResponse(res, result.rows[0], "SUCCESS");
      }
    } catch (error) {
      next(error);
    }
  }

  // Delete customer (soft delete)
  async deleteCustomer(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const action = "DELETE /api/factory/customers/:id";
      const { id } = req.params;
      MyLogger.info(action, { customerId: id });

      // Check if both factory and sales-rep modules are available for shared customers
      const isSalesRepAvailable = moduleRegistry.isModuleAvailable(
        MODULE_NAMES.SALESREP
      );

      if (isSalesRepAvailable) {
        const result = await sharedCustomerService.deleteCustomer(id);
        
        if (!result) {
          res.status(404).json({
            success: false,
            message: "Customer not found",
            data: null,
          });
          return;
        }

        MyLogger.success(action, { customerId: id, deleted: true, shared: true });
        serializeSuccessResponse(res, { deleted: true }, "SUCCESS");
      } else {
        const query = `
          UPDATE factory_customers 
          SET is_active = false, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING id
        `;

        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
          res.status(404).json({
            success: false,
            message: "Customer not found",
            data: null,
          });
          return;
        }

        MyLogger.success(action, { customerId: id, deleted: true, shared: false });
        serializeSuccessResponse(res, { deleted: true }, "SUCCESS");
      }
    } catch (error) {
      next(error);
    }
  }
}

export default new CustomersController();
