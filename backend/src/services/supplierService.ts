import pool from '../database/connection';
import { 
  Supplier, 
  CreateSupplierRequest, 
  UpdateSupplierRequest, 
  SupplierQueryParams,
  SupplierStats 
} from '../types/supplier';
import { createError } from '../middleware/errorHandler';

export class SupplierService {
  // Generate unique supplier code
  private async generateSupplierCode(): Promise<string> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT COUNT(*) FROM suppliers WHERE supplier_code LIKE $1',
        ['SUP-%']
      );
      const count = parseInt(result.rows[0].count) + 1;
      return `SUP-${count.toString().padStart(3, '0')}`;
    } finally {
      client.release();
    }
  }

  // Create a new supplier
  async createSupplier(data: CreateSupplierRequest): Promise<Supplier> {
    const client = await pool.connect();
    try {
      const supplierCode = await this.generateSupplierCode();
      
      const query = `
        INSERT INTO suppliers (
          supplier_code, name, contact_person, phone, email, website,
          address, city, state, zip_code, country, category, tax_id, vat_id,
          payment_terms, bank_name, bank_account, bank_routing, swift_code, iban,
          status, notes
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22
        ) RETURNING *
      `;

      const values = [
        supplierCode, data.name, data.contact_person, data.phone, data.email,
        data.website, data.address, data.city, data.state, data.zip_code,
        data.country, data.category, data.tax_id, data.vat_id, data.payment_terms,
        data.bank_name, data.bank_account, data.bank_routing, data.swift_code,
        data.iban, data.status || 'active', data.notes
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

  // Get all suppliers with pagination and filtering
  async getSuppliers(params: SupplierQueryParams): Promise<{ suppliers: Supplier[], total: number, page: number, limit: number }> {
    const client = await pool.connect();
    try {
      const {
        page = 1,
        limit = 10,
        search,
        category,
        status,
        sortBy = 'created_at',
        sortOrder = 'desc'
      } = params;

      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Build WHERE conditions
      if (search) {
        whereConditions.push(`(
          name ILIKE $${paramIndex} OR 
          contact_person ILIKE $${paramIndex} OR 
          email ILIKE $${paramIndex} OR
          supplier_code ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (category) {
        whereConditions.push(`category = $${paramIndex}`);
        queryParams.push(category);
        paramIndex++;
      }

      if (status) {
        whereConditions.push(`status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Count total records
      const countQuery = `SELECT COUNT(*) FROM suppliers ${whereClause}`;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].count);

      // Get suppliers
      const suppliersQuery = `
        SELECT * FROM suppliers 
        ${whereClause}
        ORDER BY ${sortBy} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      queryParams.push(limit, offset);
      const suppliersResult = await client.query(suppliersQuery, queryParams);

      return {
        suppliers: suppliersResult.rows,
        total,
        page,
        limit
      };
    } finally {
      client.release();
    }
  }

  // Get supplier by ID
  async getSupplierById(id: number): Promise<Supplier> {
    const client = await pool.connect();
    try {
      const result = await client.query('SELECT * FROM suppliers WHERE id = $1', [id]);
      
      if (result.rows.length === 0) {
        throw createError('Supplier not found', 404);
      }

      return result.rows[0];
    } finally {
      client.release();
    }
  }

  // Update supplier
  async updateSupplier(id: number, data: UpdateSupplierRequest): Promise<Supplier> {
    const client = await pool.connect();
    try {
      // Check if supplier exists
      const existingSupplier = await this.getSupplierById(id);

      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramIndex = 1;

      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramIndex}`);
          values.push(value);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        return existingSupplier;
      }

      const query = `
        UPDATE suppliers 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;
      
      values.push(id);
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

  // Delete supplier
  async deleteSupplier(id: number): Promise<void> {
    const client = await pool.connect();
    try {
      // Check if supplier exists
      await this.getSupplierById(id);

      const result = await client.query('DELETE FROM suppliers WHERE id = $1', [id]);
      
      if (result.rowCount === 0) {
        throw createError('Supplier not found', 404);
      }
    } finally {
      client.release();
    }
  }

  // Toggle supplier status (activate/deactivate)
  async toggleSupplierStatus(id: number): Promise<Supplier> {
    const client = await pool.connect();
    try {
      const supplier = await this.getSupplierById(id);
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

  // Get supplier statistics
  async getSupplierStats(): Promise<SupplierStats> {
    const client = await pool.connect();
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_suppliers,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_suppliers,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_suppliers,
          COUNT(DISTINCT category) as categories_count,
          COALESCE(AVG(rating), 0) as average_rating
        FROM suppliers
      `;

      const result = await client.query(statsQuery);
      const stats = result.rows[0];

      return {
        total_suppliers: parseInt(stats.total_suppliers),
        active_suppliers: parseInt(stats.active_suppliers),
        inactive_suppliers: parseInt(stats.inactive_suppliers),
        categories_count: parseInt(stats.categories_count),
        average_rating: parseFloat(stats.average_rating)
      };
    } finally {
      client.release();
    }
  }

  // Get supplier categories
  async getSupplierCategories(): Promise<string[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        'SELECT DISTINCT category FROM suppliers WHERE category IS NOT NULL ORDER BY category'
      );
      
      return result.rows.map(row => row.category);
    } finally {
      client.release();
    }
  }

  // Search suppliers by name or code
  async searchSuppliers(query: string, limit: number = 10): Promise<Supplier[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(
        `SELECT id, supplier_code, name, contact_person, phone, email, status 
         FROM suppliers 
         WHERE (name ILIKE $1 OR supplier_code ILIKE $1 OR contact_person ILIKE $1)
         AND status = 'active'
         ORDER BY name 
         LIMIT $2`,
        [`%${query}%`, limit]
      );

      return result.rows;
    } finally {
      client.release();
    }
  }
}
