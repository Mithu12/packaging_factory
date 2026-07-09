import { NextFunction, Request, Response } from "express";
import pool from "@/database/connection";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";

class StockReportsController {
    async getStockSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/inventory/reports/stock-summary";
        try {
            MyLogger.info(action, {});

            const query = `
                SELECT
                    COUNT(DISTINCT p.id) as total_products,
                    COUNT(DISTINCT CASE WHEN p.current_stock = 0 THEN p.id END) as out_of_stock,
                    COUNT(DISTINCT CASE WHEN p.current_stock > 0 AND p.current_stock <= p.reorder_point THEN p.id END) as low_stock,
                    COALESCE(SUM(p.current_stock * p.cost_price), 0) as total_stock_value,
                    COALESCE(SUM(p.current_stock), 0) as total_stock_qty,
                    COALESCE(AVG(p.current_stock), 0) as avg_stock_per_product,
                    COUNT(DISTINCT pl.distribution_center_id) as dc_count
                FROM products p
                LEFT JOIN product_locations pl ON pl.product_id = p.id AND pl.current_stock > 0
                WHERE p.status = 'active'
            `;

            const result = await pool.query(query);
            const s = result.rows[0];

            const categoryQuery = `
                SELECT
                    c.name as category_name,
                    COUNT(DISTINCT p.id) as product_count,
                    COALESCE(SUM(p.current_stock), 0) as total_stock,
                    COALESCE(SUM(p.current_stock * p.cost_price), 0) as total_value
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.status = 'active'
                GROUP BY c.name
                ORDER BY total_value DESC
            `;

            const categoryResult = await pool.query(categoryQuery);

            const summary = {
                total_products: parseInt(s.total_products) || 0,
                out_of_stock: parseInt(s.out_of_stock) || 0,
                low_stock: parseInt(s.low_stock) || 0,
                total_stock_value: parseFloat(s.total_stock_value) || 0,
                total_stock_qty: parseFloat(s.total_stock_qty) || 0,
                avg_stock_per_product: parseFloat(s.avg_stock_per_product) || 0,
                dc_count: parseInt(s.dc_count) || 0,
                categories: categoryResult.rows.map((r) => ({
                    category_name: r.category_name || "Uncategorized",
                    product_count: parseInt(r.product_count) || 0,
                    total_stock: parseFloat(r.total_stock) || 0,
                    total_value: parseFloat(r.total_value) || 0,
                })),
            };

            MyLogger.success(action, { summary });
            serializeSuccessResponse(res, summary, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error);
            next(error);
        }
    }

    async getStockOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/inventory/reports/stock-overview";
        try {
            const { category_id, distribution_center_id, search, only_in_stock, low_stock_only } = req.query;
            MyLogger.info(action, { category_id, distribution_center_id, search });

            const conditions: string[] = ["p.status = 'active'"];
            const queryParams: any[] = [];

            if (category_id) {
                conditions.push(`p.category_id = $${queryParams.length + 1}`);
                queryParams.push(category_id);
            }
            if (search) {
                conditions.push(`(p.name ILIKE $${queryParams.length + 1} OR p.sku ILIKE $${queryParams.length + 1} OR p.product_code ILIKE $${queryParams.length + 1})`);
                queryParams.push(`%${search}%`);
            }

            let joinClause = "";
            if (distribution_center_id) {
                joinClause = `JOIN product_locations pl ON pl.product_id = p.id AND pl.distribution_center_id = $${queryParams.length + 1}`;
                queryParams.push(distribution_center_id);
            } else {
                joinClause = `LEFT JOIN product_locations pl ON pl.product_id = p.id`;
            }

            const havingConditions: string[] = [];
            if (only_in_stock === "true") {
                havingConditions.push(`COALESCE(SUM(pl.current_stock), 0) > 0`);
            }
            if (low_stock_only === "true") {
                havingConditions.push(`COALESCE(SUM(pl.current_stock), 0) <= p.reorder_point AND p.reorder_point > 0`);
            }

            const whereClause = `WHERE ${conditions.join(" AND ")}`;
            const havingClause = havingConditions.length > 0 ? `HAVING ${havingConditions.join(" AND ")}` : "";

            const query = `
                SELECT
                    p.id,
                    p.product_code,
                    p.sku,
                    p.name,
                    c.name as category_name,
                    p.unit_of_measure,
                    p.cost_price,
                    p.selling_price,
                    p.reorder_point,
                    p.min_stock_level,
                    p.max_stock_level,
                    p.current_stock as total_stock,
                    COALESCE(SUM(pl.current_stock), 0) as stock_qty,
                    COALESCE(SUM(pl.reserved_stock), 0) as reserved_qty,
                    COALESCE(SUM(pl.current_stock), 0) - COALESCE(SUM(pl.reserved_stock), 0) as available_qty,
                    COALESCE(SUM(pl.current_stock), 0) * p.cost_price as stock_value,
                    CASE WHEN p.reorder_point > 0 AND COALESCE(SUM(pl.current_stock), 0) <= p.reorder_point THEN true ELSE false END as is_low_stock,
                    CASE WHEN COALESCE(SUM(pl.current_stock), 0) = 0 THEN true ELSE false END as is_out_of_stock
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                ${joinClause}
                ${whereClause}
                GROUP BY p.id, p.product_code, p.sku, p.name, c.name, p.unit_of_measure,
                         p.cost_price, p.selling_price, p.reorder_point, p.min_stock_level,
                         p.max_stock_level, p.current_stock
                ${havingClause}
                ORDER BY stock_value DESC
            `;

            const result = await pool.query(query, queryParams);
            const products = result.rows.map((row) => ({
                id: row.id,
                product_code: row.product_code,
                sku: row.sku,
                name: row.name,
                category_name: row.category_name || "Uncategorized",
                unit_of_measure: row.unit_of_measure,
                cost_price: parseFloat(row.cost_price) || 0,
                selling_price: parseFloat(row.selling_price) || 0,
                reorder_point: parseFloat(row.reorder_point) || 0,
                min_stock_level: parseFloat(row.min_stock_level) || 0,
                max_stock_level: parseFloat(row.max_stock_level) || 0,
                stock_qty: parseFloat(row.stock_qty) || 0,
                reserved_qty: parseFloat(row.reserved_qty) || 0,
                available_qty: parseFloat(row.available_qty) || 0,
                stock_value: parseFloat(row.stock_value) || 0,
                is_low_stock: row.is_low_stock,
                is_out_of_stock: row.is_out_of_stock,
            }));

            MyLogger.success(action, { count: products.length });
            serializeSuccessResponse(res, products, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error);
            next(error);
        }
    }

    async getStockByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/inventory/reports/stock-by-category";
        try {
            MyLogger.info(action, {});

            const query = `
                SELECT
                    COALESCE(c.name, 'Uncategorized') as category_name,
                    COUNT(DISTINCT p.id) as product_count,
                    COALESCE(SUM(p.current_stock), 0) as total_stock,
                    COALESCE(SUM(p.current_stock * p.cost_price), 0) as total_value,
                    COALESCE(SUM(p.current_stock * p.selling_price), 0) as potential_revenue,
                    COUNT(DISTINCT CASE WHEN p.current_stock = 0 THEN p.id END) as out_of_stock_count,
                    COUNT(DISTINCT CASE WHEN p.current_stock > 0 AND p.current_stock <= p.reorder_point THEN p.id END) as low_stock_count
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                WHERE p.status = 'active'
                GROUP BY c.name
                ORDER BY total_value DESC
            `;

            const result = await pool.query(query);
            const categories = result.rows.map((row) => ({
                category_name: row.category_name,
                product_count: parseInt(row.product_count) || 0,
                total_stock: parseFloat(row.total_stock) || 0,
                total_value: parseFloat(row.total_value) || 0,
                potential_revenue: parseFloat(row.potential_revenue) || 0,
                out_of_stock_count: parseInt(row.out_of_stock_count) || 0,
                low_stock_count: parseInt(row.low_stock_count) || 0,
            }));

            MyLogger.success(action, { count: categories.length });
            serializeSuccessResponse(res, categories, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error);
            next(error);
        }
    }

    async getLowStockProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/inventory/reports/low-stock";
        try {
            MyLogger.info(action, {});

            const query = `
                SELECT
                    p.id,
                    p.product_code,
                    p.sku,
                    p.name,
                    c.name as category_name,
                    p.unit_of_measure,
                    p.cost_price,
                    p.current_stock as total_stock,
                    p.reorder_point,
                    p.min_stock_level,
                    p.max_stock_level,
                    CASE
                        WHEN p.current_stock = 0 THEN 0
                        WHEN p.reorder_point > 0 THEN ROUND((p.current_stock / p.reorder_point * 100)::numeric, 1)
                        ELSE 100
                    END as stock_percentage,
                    s.name as supplier_name,
                    s.phone as supplier_phone
                FROM products p
                LEFT JOIN categories c ON p.category_id = c.id
                LEFT JOIN suppliers s ON p.supplier_id = s.id
                WHERE p.status = 'active'
                    AND (
                        p.current_stock = 0
                        OR (p.reorder_point > 0 AND p.current_stock <= p.reorder_point)
                    )
                ORDER BY
                    CASE WHEN p.current_stock = 0 THEN 0 ELSE 1 END,
                    (CASE WHEN p.reorder_point > 0 THEN p.current_stock / p.reorder_point ELSE 1 END) ASC
            `;

            const result = await pool.query(query);
            const products = result.rows.map((row) => ({
                id: row.id,
                product_code: row.product_code,
                sku: row.sku,
                name: row.name,
                category_name: row.category_name || "Uncategorized",
                unit_of_measure: row.unit_of_measure,
                cost_price: parseFloat(row.cost_price) || 0,
                total_stock: parseFloat(row.total_stock) || 0,
                reorder_point: parseFloat(row.reorder_point) || 0,
                min_stock_level: parseFloat(row.min_stock_level) || 0,
                max_stock_level: parseFloat(row.max_stock_level) || 0,
                stock_percentage: parseFloat(row.stock_percentage) || 0,
                supplier_name: row.supplier_name || null,
                supplier_phone: row.supplier_phone || null,
                shortage: Math.max(0, (parseFloat(row.reorder_point) || 0) - (parseFloat(row.total_stock) || 0)),
            }));

            MyLogger.success(action, { count: products.length });
            serializeSuccessResponse(res, products, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error);
            next(error);
        }
    }
}

export default new StockReportsController();
