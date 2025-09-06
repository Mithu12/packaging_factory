import {Supplier, SupplierQueryParams, SupplierStats, UpdateSupplierRequest} from "@/types/supplier";
import {MediatorInterface} from "../../types";
import pool from "@/database/connection";
import {createError} from "@/middleware/errorHandler";


class GetSupplierInfoMediator implements MediatorInterface {
    async process(data: any): Promise<any> {
        throw new Error("Not Implemented")
    }

    // Get all suppliers with pagination and filtering
    async getSupplierList(params: SupplierQueryParams): Promise<{
        suppliers: Supplier[],
        total: number,
        page: number,
        limit: number
    }> {
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
            const countQuery = `SELECT COUNT(*)
                                FROM suppliers ${whereClause}`;
            const countResult = await client.query(countQuery, queryParams);
            const total = parseInt(countResult.rows[0].count);

            // Get suppliers
            const suppliersQuery = `
                SELECT *
                FROM suppliers ${whereClause}
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



    // Get supplier statistics
    async getSupplierStats(): Promise<SupplierStats> {
        const client = await pool.connect();
        try {
            const statsQuery = `
                SELECT COUNT(*)                                        as total_suppliers,
                       COUNT(CASE WHEN status = 'active' THEN 1 END)   as active_suppliers,
                       COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_suppliers,
                       COUNT(DISTINCT category)                        as categories_count,
                       COALESCE(AVG(rating), 0)                        as average_rating
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

export default new GetSupplierInfoMediator();