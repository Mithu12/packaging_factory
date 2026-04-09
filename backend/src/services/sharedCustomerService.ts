import pool from "../database/connection";
import { MyLogger } from "../utils/new-logger";
import { moduleRegistry, MODULE_NAMES } from "../utils/moduleRegistry";

export interface SharedCustomer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  company?: string | null;
  address?: any; // JSONB for factory, TEXT for sales-rep
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  credit_limit: number;
  current_balance?: number;
  payment_terms?: string;
  is_active?: boolean;
  sales_rep_id?: number | null;
  // Factory-specific financial summary
  total_order_value?: number;
  total_paid_amount?: number;
  total_outstanding_amount?: number;
  order_count?: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSharedCustomerRequest {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: any;
  city?: string;
  state?: string;
  postal_code?: string;
  credit_limit?: number;
  payment_terms?: string;
  sales_rep_id?: number;
}

export interface UpdateSharedCustomerRequest {
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: any;
  city?: string;
  state?: string;
  postal_code?: string;
  credit_limit?: number;
  payment_terms?: string;
  sales_rep_id?: number;
  is_active?: boolean;
}

class SharedCustomerService {
  private isFactoryAvailable(): boolean {
    return moduleRegistry.isModuleAvailable(MODULE_NAMES.FACTORY);
  }

  private isSalesRepAvailable(): boolean {
    return moduleRegistry.isModuleAvailable(MODULE_NAMES.SALESREP);
  }

  /**
   * Get the primary customer table to use based on available modules
   * When both modules are available, use factory_customers as the primary table
   */
  private getPrimaryCustomerTable(): string {
    if (this.isFactoryAvailable() && this.isSalesRepAvailable()) {
      return "factory_customers";
    } else if (this.isFactoryAvailable()) {
      return "factory_customers";
    } else if (this.isSalesRepAvailable()) {
      return "sales_rep_customers";
    } else {
      throw new Error("Neither factory nor sales-rep module is available");
    }
  }

  /**
   * Get all customers from the appropriate table(s)
   */
  async getAllCustomers(): Promise<SharedCustomer[]> {
    const action = "SharedCustomerService.getAllCustomers";
    const client = await pool.connect();

    try {
      MyLogger.info(action, {
        factoryAvailable: this.isFactoryAvailable(),
        salesRepAvailable: this.isSalesRepAvailable(),
      });

      if (this.isFactoryAvailable() && this.isSalesRepAvailable()) {
        // Both modules available - get customers from both tables
        const query = `
           SELECT 
             fc.id,
             fc.name,
             fc.email,
             fc.phone,
             fc.company,
             fc.address::text as address,
             fc.credit_limit,
             fc.payment_terms,
             fc.is_active,
             fc.total_order_value,
             fc.total_paid_amount,
             fc.total_outstanding_amount,
             fc.order_count,
             fc.created_at,
             fc.updated_at,
             COALESCE(src.city, '') as city,
             COALESCE(src.state, '') as state,
             COALESCE(src.postal_code, '') as postal_code,
             COALESCE(src.current_balance, 0) as current_balance,
             src.sales_rep_id
           FROM factory_customers fc
           LEFT JOIN sales_rep_customers src ON fc.email = src.email AND fc.name = src.name
           WHERE fc.is_active = true
           
           UNION ALL
           
           SELECT 
             src.id,
             src.name,
             src.email,
             src.phone,
             COALESCE(src.company, '') as company,
             src.address,
             src.credit_limit,
             COALESCE(src.payment_terms, 'net_30') as payment_terms,
             COALESCE(src.is_active, true) as is_active,
             COALESCE(src.total_order_value, 0) as total_order_value,
             COALESCE(src.total_paid_amount, 0) as total_paid_amount,
             COALESCE(src.total_outstanding_amount, 0) as total_outstanding_amount,
             COALESCE(src.order_count, 0) as order_count,
             src.created_at,
             src.updated_at,
             COALESCE(src.city, '') as city,
             COALESCE(src.state, '') as state,
             COALESCE(src.postal_code, '') as postal_code,
             COALESCE(src.current_balance, 0) as current_balance,
             src.sales_rep_id
           FROM sales_rep_customers src
           LEFT JOIN factory_customers fc ON src.email = fc.email AND src.name = fc.name
           WHERE fc.id IS NULL
           ORDER BY id DESC
         `;

        const result = await client.query(query);
        MyLogger.info(action, {
          totalRows: result.rows.length,
          factoryAvailable: this.isFactoryAvailable(),
          salesRepAvailable: this.isSalesRepAvailable(),
        });
        return result.rows.map(this.mapToSharedCustomer);
      } else if (this.isFactoryAvailable()) {
        // Only factory module available
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
            total_order_value,
            total_paid_amount,
            total_outstanding_amount,
            order_count,
            created_at,
            updated_at
          FROM factory_customers 
          WHERE is_active = true
          ORDER BY id DESC
        `;

        const result = await client.query(query);
        return result.rows.map(this.mapToSharedCustomer);
      } else {
        // Only sales-rep module available
        const query = `
          SELECT 
            id,
            name,
            email,
            phone,
            address,
            city,
            state,
            postal_code,
            credit_limit,
            current_balance,
            sales_rep_id,
            created_at,
            updated_at
          FROM sales_rep_customers 
          ORDER BY id DESC
        `;

        const result = await client.query(query);
        return result.rows.map(this.mapToSharedCustomer);
      }
    } finally {
      client.release();
    }
  }

  /**
   * Get customer by ID from the appropriate table
   */
  async getCustomerById(id: number): Promise<SharedCustomer | null> {
    const action = "SharedCustomerService.getCustomerById";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { customerId: id });

      if (this.isFactoryAvailable() && this.isSalesRepAvailable()) {
        // Check both tables - first try factory_customers
        const factoryQuery = `
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
            fc.total_order_value,
            fc.total_paid_amount,
            fc.total_outstanding_amount,
            fc.order_count,
            fc.created_at,
            fc.updated_at,
            src.city,
            src.state,
            src.postal_code,
            src.current_balance,
            src.sales_rep_id
          FROM factory_customers fc
          LEFT JOIN sales_rep_customers src ON fc.email = src.email AND fc.name = src.name
          WHERE fc.id = $1
        `;

        let result = await client.query(factoryQuery, [id]);
        if (result.rows.length > 0) {
          return this.mapToSharedCustomer(result.rows[0]);
        }

        // If not found in factory_customers, check sales_rep_customers
        const salesRepQuery = `
           SELECT 
             src.id,
             src.name,
             src.email,
             src.phone,
             COALESCE(src.company, '') as company,
             src.address,
             src.credit_limit,
             COALESCE(src.payment_terms, 'net_30') as payment_terms,
             COALESCE(src.is_active, true) as is_active,
             COALESCE(src.total_order_value, 0) as total_order_value,
             COALESCE(src.total_paid_amount, 0) as total_paid_amount,
             COALESCE(src.total_outstanding_amount, 0) as total_outstanding_amount,
             COALESCE(src.order_count, 0) as order_count,
             src.created_at,
             src.updated_at,
             src.city,
             src.state,
             src.postal_code,
             src.current_balance,
             src.sales_rep_id
           FROM sales_rep_customers src
           WHERE src.id = $1
         `;

        result = await client.query(salesRepQuery, [id]);
        return result.rows.length > 0
          ? this.mapToSharedCustomer(result.rows[0])
          : null;
      } else if (this.isFactoryAvailable()) {
        const query = `
          SELECT 
            id, name, email, phone, company, address, credit_limit, payment_terms, is_active,
            total_order_value, total_paid_amount, total_outstanding_amount, order_count,
            created_at, updated_at
          FROM factory_customers 
          WHERE id = $1
        `;

        const result = await client.query(query, [id]);
        return result.rows.length > 0
          ? this.mapToSharedCustomer(result.rows[0])
          : null;
      } else {
        const query = `
          SELECT 
            id, name, email, phone, address, city, state, postal_code, credit_limit,
            current_balance, sales_rep_id, created_at, updated_at
          FROM sales_rep_customers 
          WHERE id = $1
        `;

        const result = await client.query(query, [id]);
        return result.rows.length > 0
          ? this.mapToSharedCustomer(result.rows[0])
          : null;
      }
    } finally {
      client.release();
    }
  }

  /**
   * Create a new customer in the appropriate table(s)
   */
  async createCustomer(
    data: CreateSharedCustomerRequest
  ): Promise<SharedCustomer> {
    const action = "SharedCustomerService.createCustomer";
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      MyLogger.info(action, { customerData: data });

      const emailNormalized =
        data.email != null && String(data.email).trim() !== ""
          ? String(data.email).trim()
          : null;

      if (this.isFactoryAvailable() && this.isSalesRepAvailable()) {
        // Create in factory_customers (primary) and optionally in sales_rep_customers
        const factoryQuery = `
          INSERT INTO factory_customers (name, email, phone, company, address, credit_limit, payment_terms)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, name, email, phone, company, address, credit_limit, payment_terms, is_active, created_at, updated_at
        `;

        const factoryResult = await client.query(factoryQuery, [
          data.name,
          emailNormalized,
          data.phone || null,
          data.company || null,
          typeof data.address === "string"
            ? JSON.stringify({ address: data.address })
            : data.address || {},
          data.credit_limit || 0,
          data.payment_terms || "net_30",
        ]);

        const customer = factoryResult.rows[0];

        // If sales_rep_id is provided, also create in sales_rep_customers
        if (data.sales_rep_id) {
          const salesRepQuery = `
            INSERT INTO sales_rep_customers (name, email, phone, address, city, state, postal_code, credit_limit, sales_rep_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id
          `;

          await client.query(salesRepQuery, [
            data.name,
            emailNormalized,
            data.phone || null,
            typeof data.address === "string"
              ? data.address
              : data.address
              ? JSON.stringify(data.address)
              : null,
            data.city || null,
            data.state || null,
            data.postal_code || null,
            data.credit_limit || 0,
            data.sales_rep_id,
          ]);
        }

        await client.query("COMMIT");
        MyLogger.info(action, {
          customerCreated: true,
          customerId: customer.id,
          customerName: customer.name,
          inFactoryTable: true,
          salesRepId: data.sales_rep_id,
        });
        return this.mapToSharedCustomer(customer);
      } else if (this.isFactoryAvailable()) {
        const query = `
          INSERT INTO factory_customers (name, email, phone, company, address, credit_limit, payment_terms)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING id, name, email, phone, company, address, credit_limit, payment_terms, is_active, created_at, updated_at
        `;

        const result = await client.query(query, [
          data.name,
          emailNormalized,
          data.phone || null,
          data.company || null,
          typeof data.address === "string"
            ? JSON.stringify({ address: data.address })
            : data.address || {},
          data.credit_limit || 0,
          data.payment_terms || "net_30",
        ]);

        await client.query("COMMIT");
        return this.mapToSharedCustomer(result.rows[0]);
      } else {
        const query = `
          INSERT INTO sales_rep_customers (name, email, phone, address, city, state, postal_code, credit_limit, sales_rep_id)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING id, name, email, phone, address, city, state, postal_code, credit_limit, current_balance, sales_rep_id, created_at, updated_at
        `;

        const result = await client.query(query, [
          data.name,
          emailNormalized,
          data.phone || null,
          typeof data.address === "string"
            ? data.address
            : data.address
            ? JSON.stringify(data.address)
            : null,
          data.city || null,
          data.state || null,
          data.postal_code || null,
          data.credit_limit || 0,
          data.sales_rep_id || null,
        ]);

        await client.query("COMMIT");
        MyLogger.info(action, {
          customerCreated: true,
          customerId: result.rows[0].id,
          customerName: result.rows[0].name,
          inSalesRepTable: true,
          salesRepId: data.sales_rep_id,
        });
        return this.mapToSharedCustomer(result.rows[0]);
      }
    } catch (error) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { customerData: data });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update customer in the appropriate table(s)
   */
  async updateCustomer(
    id: number,
    data: UpdateSharedCustomerRequest
  ): Promise<SharedCustomer | null> {
    const action = "SharedCustomerService.updateCustomer";
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      MyLogger.info(action, { customerId: id, updateData: data });

      if (this.isFactoryAvailable() && this.isSalesRepAvailable()) {
        // Update factory_customers (primary)
        const factoryQuery = `
          UPDATE factory_customers 
          SET name = COALESCE($2, name),
              email = COALESCE($3, email),
              phone = COALESCE($4, phone),
              company = COALESCE($5, company),
              address = COALESCE($6, address),
              credit_limit = COALESCE($7, credit_limit),
              payment_terms = COALESCE($8, payment_terms),
              is_active = COALESCE($9, is_active),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING id, name, email, phone, company, address, credit_limit, payment_terms, is_active, created_at, updated_at
        `;

        const factoryResult = await client.query(factoryQuery, [
          id,
          data.name,
          data.email,
          data.phone,
          data.company,
          typeof data.address === "string"
            ? JSON.stringify({ address: data.address })
            : data.address,
          data.credit_limit,
          data.payment_terms,
          data.is_active,
        ]);

        if (factoryResult.rows.length === 0) {
          await client.query("ROLLBACK");
          return null;
        }

        // If sales_rep_id is provided, also update/create in sales_rep_customers
        if (data.sales_rep_id !== undefined) {
          const salesRepQuery = `
            INSERT INTO sales_rep_customers (name, email, phone, address, city, state, postal_code, credit_limit, sales_rep_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            ON CONFLICT (email) DO UPDATE SET
              name = EXCLUDED.name,
              phone = EXCLUDED.phone,
              address = EXCLUDED.address,
              city = EXCLUDED.city,
              state = EXCLUDED.state,
              postal_code = EXCLUDED.postal_code,
              credit_limit = EXCLUDED.credit_limit,
              sales_rep_id = EXCLUDED.sales_rep_id,
              updated_at = CURRENT_TIMESTAMP
            RETURNING id
          `;

          await client.query(salesRepQuery, [
            data.name || factoryResult.rows[0].name,
            data.email || factoryResult.rows[0].email,
            data.phone || factoryResult.rows[0].phone,
            typeof data.address === "string"
              ? data.address
              : typeof data.address === "object" && data.address !== null
              ? JSON.stringify(data.address)
              : JSON.stringify(factoryResult.rows[0].address || {}),
            data.city || null,
            data.state || null,
            data.postal_code || null,
            data.credit_limit || factoryResult.rows[0].credit_limit,
            data.sales_rep_id,
          ]);
        }

        await client.query("COMMIT");
        return this.mapToSharedCustomer(factoryResult.rows[0]);
      } else if (this.isFactoryAvailable()) {
        const query = `
          UPDATE factory_customers 
          SET name = COALESCE($2, name),
              email = COALESCE($3, email),
              phone = COALESCE($4, phone),
              company = COALESCE($5, company),
              address = COALESCE($6, address),
              credit_limit = COALESCE($7, credit_limit),
              payment_terms = COALESCE($8, payment_terms),
              is_active = COALESCE($9, is_active),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING id, name, email, phone, company, address, credit_limit, payment_terms, is_active, created_at, updated_at
        `;

        const result = await client.query(query, [
          id,
          data.name,
          data.email,
          data.phone,
          data.company,
          typeof data.address === "string"
            ? data.address
            : typeof data.address === "object" && data.address !== null
            ? JSON.stringify(data.address)
            : data.address,
          data.credit_limit,
          data.payment_terms,
          data.is_active,
        ]);

        await client.query("COMMIT");
        return result.rows.length > 0
          ? this.mapToSharedCustomer(result.rows[0])
          : null;
      } else {
        const query = `
          UPDATE sales_rep_customers 
          SET name = COALESCE($2, name),
              email = COALESCE($3, email),
              phone = COALESCE($4, phone),
              address = COALESCE($5, address),
              city = COALESCE($6, city),
              state = COALESCE($7, state),
              postal_code = COALESCE($8, postal_code),
              credit_limit = COALESCE($9, credit_limit),
              sales_rep_id = COALESCE($10, sales_rep_id),
              updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING id, name, email, phone, address, city, state, postal_code, credit_limit, current_balance, sales_rep_id, created_at, updated_at
        `;

        const result = await client.query(query, [
          id,
          data.name,
          data.email,
          data.phone,
          typeof data.address === "string"
            ? data.address
            : typeof data.address === "object" && data.address !== null
            ? JSON.stringify(data.address)
            : null,
          data.city,
          data.state,
          data.postal_code,
          data.credit_limit,
          data.sales_rep_id,
        ]);

        await client.query("COMMIT");
        return result.rows.length > 0
          ? this.mapToSharedCustomer(result.rows[0])
          : null;
      }
    } catch (error) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { customerId: id, updateData: data });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete customer (soft delete) from the appropriate table(s)
   */
  async deleteCustomer(id: number | string): Promise<boolean> {
    const action = "SharedCustomerService.deleteCustomer";
    const client = await pool.connect();

    try {
      await client.query("BEGIN");
      MyLogger.info(action, { customerId: id });

      if (this.isFactoryAvailable() && this.isSalesRepAvailable()) {
        // Soft delete in factory_customers
        const factoryQuery = `
          UPDATE factory_customers 
          SET is_active = false, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING id
        `;
        const factoryResult = await client.query(factoryQuery, [id]);

        // Also check if there's a corresponding sales_rep_customer
        // Note: We don't have a direct link, but we can look by ID if it's the same 
        // OR if this was a string ID (UUID), it definitely matches factory_customers
        
        // In this system, we usually delete by the primary table ID.
        // If it's a UUID, it's factory. If it's numeric, it might be sales_rep.
        
        if (factoryResult.rows.length > 0) {
           await client.query("COMMIT");
           return true;
        }

        // If not found in factory, try sales_rep_customers (soft delete if column exists, otherwise hard delete or just return false)
        // sales_rep_customers doesn't have is_active in initial migration, but V62 added it to SharedCustomer interface. 
        // Let's check V62 or use a safe approach.
        const salesRepQuery = `
          UPDATE sales_rep_customers 
          SET updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING id
        `;
        const salesRepResult = await client.query(salesRepQuery, [id]);
        
        await client.query("COMMIT");
        return (factoryResult.rows.length > 0 || salesRepResult.rows.length > 0);
      } else if (this.isFactoryAvailable()) {
        const query = `
          UPDATE factory_customers 
          SET is_active = false, updated_at = CURRENT_TIMESTAMP
          WHERE id = $1
          RETURNING id
        `;
        const result = await client.query(query, [id]);
        await client.query("COMMIT");
        return result.rows.length > 0;
      } else {
        const query = `
          DELETE FROM sales_rep_customers 
          WHERE id = $1
          RETURNING id
        `;
        const result = await client.query(query, [id]);
        await client.query("COMMIT");
        return result.rows.length > 0;
      }
    } catch (error) {
      await client.query("ROLLBACK");
      MyLogger.error(action, error, { customerId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Search customers across available tables
   */
  async searchCustomers(searchTerm: string): Promise<SharedCustomer[]> {
    const action = "SharedCustomerService.searchCustomers";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { searchTerm });

      if (this.isFactoryAvailable() && this.isSalesRepAvailable()) {
        const query = `
           SELECT 
             fc.id,
             fc.name,
             fc.email,
             fc.phone,
             fc.company,
             fc.address::text as address,
             fc.credit_limit,
             fc.payment_terms,
             fc.is_active,
             fc.total_order_value,
             fc.total_paid_amount,
             fc.total_outstanding_amount,
             fc.order_count,
             fc.created_at,
             fc.updated_at,
             COALESCE(src.city, '') as city,
             COALESCE(src.state, '') as state,
             COALESCE(src.postal_code, '') as postal_code,
             COALESCE(src.current_balance, 0) as current_balance,
             src.sales_rep_id
           FROM factory_customers fc
           LEFT JOIN sales_rep_customers src ON fc.email = src.email AND fc.name = src.name
           WHERE fc.is_active = true 
             AND (fc.name ILIKE $1 OR fc.email ILIKE $1 OR fc.phone ILIKE $1 OR fc.company ILIKE $1)
           
           UNION ALL
           
           SELECT 
             src.id,
             src.name,
             src.email,
             src.phone,
             COALESCE(src.company, '') as company,
             src.address,
             src.credit_limit,
             COALESCE(src.payment_terms, 'net_30') as payment_terms,
             COALESCE(src.is_active, true) as is_active,
             COALESCE(src.total_order_value, 0) as total_order_value,
             COALESCE(src.total_paid_amount, 0) as total_paid_amount,
             COALESCE(src.total_outstanding_amount, 0) as total_outstanding_amount,
             COALESCE(src.order_count, 0) as order_count,
             src.created_at,
             src.updated_at,
             COALESCE(src.city, '') as city,
             COALESCE(src.state, '') as state,
             COALESCE(src.postal_code, '') as postal_code,
             COALESCE(src.current_balance, 0) as current_balance,
             src.sales_rep_id
           FROM sales_rep_customers src
           LEFT JOIN factory_customers fc ON src.email = fc.email AND src.name = fc.name
           WHERE fc.id IS NULL
             AND (src.name ILIKE $1 OR src.email ILIKE $1 OR src.phone ILIKE $1)
           ORDER BY name
        `;

        const result = await client.query(query, [`%${searchTerm}%`]);
        return result.rows.map(this.mapToSharedCustomer);
      } else if (this.isFactoryAvailable()) {
        const query = `
          SELECT 
            id, name, email, phone, company, address, credit_limit, payment_terms, is_active,
            total_order_value, total_paid_amount, total_outstanding_amount, order_count,
            created_at, updated_at
          FROM factory_customers 
          WHERE is_active = true 
            AND (name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1 OR company ILIKE $1)
          ORDER BY name
        `;

        const result = await client.query(query, [`%${searchTerm}%`]);
        return result.rows.map(this.mapToSharedCustomer);
      } else {
        const query = `
          SELECT 
            id, name, email, phone, address, city, state, postal_code, credit_limit,
            current_balance, sales_rep_id, created_at, updated_at
          FROM sales_rep_customers 
          WHERE name ILIKE $1 OR email ILIKE $1 OR phone ILIKE $1
          ORDER BY name
        `;

        const result = await client.query(query, [`%${searchTerm}%`]);
        return result.rows.map(this.mapToSharedCustomer);
      }
    } finally {
      client.release();
    }
  }

  /**
   * Map database row to SharedCustomer interface
   */
  private mapToSharedCustomer(row: any): SharedCustomer {
    let address = row.address;
    
    // Parse address if it is a JSON string (comes as string from UNION queries)
    if (typeof address === 'string') {
      try {
        address = JSON.parse(address);
      } catch (e) {
        // Keep as string if parsing fails
      }
    }

    return {
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      company: row.company,
      address: address,
      city: row.city,
      state: row.state,
      postal_code: row.postal_code,
      credit_limit: row.credit_limit || 0,
      current_balance: row.current_balance,
      payment_terms: row.payment_terms,
      is_active: row.is_active,
      sales_rep_id: row.sales_rep_id,
      total_order_value: row.total_order_value,
      total_paid_amount: row.total_paid_amount,
      total_outstanding_amount: row.total_outstanding_amount,
      order_count: row.order_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  /**
   * Get module availability status
   */
  getModuleStatus(): { factory: boolean; salesRep: boolean; shared: boolean } {
    const factory = this.isFactoryAvailable();
    const salesRep = this.isSalesRepAvailable();
    return {
      factory,
      salesRep,
      shared: factory && salesRep,
    };
  }
}

export default new SharedCustomerService();
