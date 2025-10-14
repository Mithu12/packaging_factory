import { Request, Response, NextFunction } from "express";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import pool from "@/database/connection";

class CustomersController {
  // Get all customers
  async getAllCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/customers";
      MyLogger.info(action);
      
      const query = `
        SELECT 
          fc.id,
          fc.name,
          fc.email,
          fc.phone,
          fc.company,
          fc.address,
          fc.credit_limit,
          fc.payment_terms,
          fc.is_active,
          fc.created_at,
          fc.updated_at,
          COALESCE(SUM(fco.total_value), 0) as total_order_value,
          COALESCE(SUM(fco.paid_amount), 0) as total_paid_amount,
          COALESCE(SUM(fco.outstanding_amount), 0) as total_outstanding_amount,
          COUNT(fco.id) as order_count
        FROM factory_customers fc
        LEFT JOIN factory_customer_orders fco ON fc.id = fco.factory_customer_id
        WHERE fc.is_active = true
        GROUP BY fc.id, fc.name, fc.email, fc.phone, fc.company, fc.address, 
                 fc.credit_limit, fc.payment_terms, fc.is_active, fc.created_at, fc.updated_at
        ORDER BY fc.id desc
      `;
      
      const result = await pool.query(query);
      
      MyLogger.success(action, { count: result.rows.length });
      serializeSuccessResponse(res, result.rows, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Search customers
  async searchCustomers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/customers/search";
      const { q } = req.query;
      MyLogger.info(action, { query: q });
      
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
          updated_at
        FROM factory_customers 
        WHERE is_active = true
          AND (name ILIKE $1 OR email ILIKE $1 OR company ILIKE $1)
        ORDER BY name
        LIMIT 20
      `;
      
      const result = await pool.query(query, [`%${q}%`]);
      
      MyLogger.success(action, { query: q, count: result.rows.length });
      serializeSuccessResponse(res, result.rows, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Get customer by ID
  async getCustomerById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/customers/:id";
      const { id } = req.params;
      MyLogger.info(action, { customerId: id });
      
      const query = `
        SELECT 
          fc.id,
          fc.name,
          fc.email,
          fc.phone,
          fc.company,
          fc.address,
          fc.credit_limit,
          fc.payment_terms,
          fc.is_active,
          fc.created_at,
          fc.updated_at,
          COALESCE(SUM(fco.total_value), 0) as total_order_value,
          COALESCE(SUM(fco.paid_amount), 0) as total_paid_amount,
          COALESCE(SUM(fco.outstanding_amount), 0) as total_outstanding_amount,
          COUNT(fco.id) as order_count
        FROM factory_customers fc
        LEFT JOIN factory_customer_orders fco ON fc.id = fco.factory_customer_id
        WHERE fc.id = $1
        GROUP BY fc.id, fc.name, fc.email, fc.phone, fc.company, fc.address, 
                 fc.credit_limit, fc.payment_terms, fc.is_active, fc.created_at, fc.updated_at
      `;
      
      const result = await pool.query(query, [id]);
      
      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "Customer not found",
          data: null
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
  async createCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/customers";
      MyLogger.info(action, { customerData: req.body });
      
      const { name, email, phone, company, address, credit_limit, payment_terms } = req.body;
      
      const query = `
        INSERT INTO factory_customers (name, email, phone, company, address, credit_limit, payment_terms)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, name, email, phone, company, address, credit_limit, payment_terms, is_active, created_at, updated_at
      `;
      
      const result = await pool.query(query, [
        name,
        email,
        phone || null,
        company || null,
        address || {},
        credit_limit || null,
        payment_terms || 'net_30'
      ]);
      
      MyLogger.success(action, { customerId: result.rows[0].id, name });
      serializeSuccessResponse(res, result.rows[0], "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Update customer
  async updateCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "PUT /api/factory/customers/:id";
      const { id } = req.params;
      MyLogger.info(action, { customerId: id, updateData: req.body });
      
      const { name, email, phone, company, address, credit_limit, payment_terms, is_active } = req.body;
      
      const query = `
        UPDATE factory_customers 
        SET name = $1, email = $2, phone = $3, company = $4, address = $5, 
            credit_limit = $6, payment_terms = $7, is_active = $8, updated_at = CURRENT_TIMESTAMP
        WHERE id = $9
        RETURNING id, name, email, phone, company, address, credit_limit, payment_terms, is_active, created_at, updated_at
      `;
      
      const result = await pool.query(query, [
        name,
        email,
        phone || null,
        company || null,
        address || {},
        credit_limit || null,
        payment_terms || 'net_30',
        is_active !== undefined ? is_active : true,
        id
      ]);
      
      if (result.rows.length === 0) {
        res.status(404).json({
          success: false,
          message: "Customer not found",
          data: null
        });
        return;
      }
      
      MyLogger.success(action, { customerId: id, updated: true });
      serializeSuccessResponse(res, result.rows[0], "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Delete customer (soft delete)
  async deleteCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "DELETE /api/factory/customers/:id";
      const { id } = req.params;
      MyLogger.info(action, { customerId: id });
      
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
          data: null
        });
        return;
      }
      
      MyLogger.success(action, { customerId: id, deleted: true });
      serializeSuccessResponse(res, { deleted: true }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }
}

export default new CustomersController();
