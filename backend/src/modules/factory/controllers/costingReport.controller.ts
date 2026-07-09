import { NextFunction, Request, Response } from "express";
import pool from "@/database/connection";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";

class CostingReportController {
    async getCostingSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/factory/costing-reports/summary";
        try {
            MyLogger.info(action, {});

            const query = `
                SELECT
                    COUNT(DISTINCT bom.id) as total_boms,
                    COUNT(DISTINCT bom.parent_product_id) as products_with_bom,
                    COALESCE(SUM(bom.total_cost), 0) as total_bom_cost,
                    COALESCE(AVG(bom.total_cost), 0) as avg_bom_cost,
                    COALESCE(MAX(bom.total_cost), 0) as max_bom_cost,
                    COALESCE(MIN(bom.total_cost), 0) as min_bom_cost,
                    COUNT(DISTINCT bc.component_product_id) as unique_materials,
                    COALESCE(SUM(bc.total_cost), 0) as total_material_cost
                FROM bill_of_materials bom
                LEFT JOIN bom_components bc ON bc.bom_id = bom.id
                WHERE bom.is_active = true
            `;

            const result = await pool.query(query);
            const s = result.rows[0];

            const topCostProductsQuery = `
                SELECT
                    p.name as product_name,
                    p.sku,
                    bom.total_cost,
                    bom.version,
                    (SELECT COUNT(*) FROM bom_components WHERE bom_id = bom.id) as component_count
                FROM bill_of_materials bom
                JOIN products p ON bom.parent_product_id = p.id
                WHERE bom.is_active = true
                ORDER BY bom.total_cost DESC
                LIMIT 10
            `;

            const topCostResult = await pool.query(topCostProductsQuery);

            const summary = {
                total_boms: parseInt(s.total_boms) || 0,
                products_with_bom: parseInt(s.products_with_bom) || 0,
                total_bom_cost: parseFloat(s.total_bom_cost) || 0,
                avg_bom_cost: parseFloat(s.avg_bom_cost) || 0,
                max_bom_cost: parseFloat(s.max_bom_cost) || 0,
                min_bom_cost: parseFloat(s.min_bom_cost) || 0,
                unique_materials: parseInt(s.unique_materials) || 0,
                total_material_cost: parseFloat(s.total_material_cost) || 0,
                top_cost_products: topCostResult.rows.map((r) => ({
                    product_name: r.product_name,
                    sku: r.sku,
                    total_cost: parseFloat(r.total_cost) || 0,
                    version: r.version,
                    component_count: parseInt(r.component_count) || 0,
                })),
            };

            MyLogger.success(action, { summary });
            serializeSuccessResponse(res, summary, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error);
            next(error);
        }
    }

    async getBomDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/factory/costing-reports/bom-details";
        try {
            const { product_id } = req.query;
            MyLogger.info(action, { product_id });

            const conditions: string[] = ["bom.is_active = true"];
            const queryParams: any[] = [];

            if (product_id) {
                conditions.push(`bom.parent_product_id = $${queryParams.length + 1}`);
                queryParams.push(product_id);
            }

            const whereClause = `WHERE ${conditions.join(" AND ")}`;

            const query = `
                SELECT
                    bom.id as bom_id,
                    p.id as product_id,
                    p.name as product_name,
                    p.sku,
                    p.cost_price,
                    p.selling_price,
                    bom.version,
                    bom.effective_date,
                    bom.total_cost,
                    bom.notes as bom_notes
                FROM bill_of_materials bom
                JOIN products p ON bom.parent_product_id = p.id
                ${whereClause}
                ORDER BY p.name, bom.version DESC
            `;

            const result = await pool.query(query, queryParams);
            const boms = result.rows.map((row) => ({
                bom_id: row.bom_id,
                product_id: row.product_id,
                product_name: row.product_name,
                sku: row.sku,
                cost_price: parseFloat(row.cost_price) || 0,
                selling_price: parseFloat(row.selling_price) || 0,
                version: row.version,
                effective_date: row.effective_date,
                total_cost: parseFloat(row.total_cost) || 0,
                bom_notes: row.bom_notes,
                margin: row.selling_price > 0 && row.total_cost > 0
                    ? ((parseFloat(row.selling_price) - parseFloat(row.total_cost)) / parseFloat(row.selling_price) * 100)
                    : 0,
            }));

            MyLogger.success(action, { count: boms.length });
            serializeSuccessResponse(res, boms, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error);
            next(error);
        }
    }

    async getMaterialCosts(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/factory/costing-reports/material-costs";
        try {
            MyLogger.info(action, {});

            const query = `
                SELECT
                    cp.id as material_id,
                    cp.name as material_name,
                    cp.sku,
                    cp.cost_price,
                    cp.unit_of_measure,
                    s.name as supplier_name,
                    COUNT(DISTINCT bc.bom_id) as used_in_boms,
                    COALESCE(SUM(bc.quantity_required), 0) as total_required,
                    COALESCE(SUM(bc.total_cost), 0) as total_cost_in_boms,
                    COALESCE(AVG(bc.unit_cost), 0) as avg_unit_cost
                FROM products cp
                LEFT JOIN bom_components bc ON bc.component_product_id = cp.id
                LEFT JOIN bill_of_materials bom ON bc.bom_id = bom.id AND bom.is_active = true
                LEFT JOIN suppliers s ON cp.supplier_id = s.id
                WHERE cp.status = 'active'
                GROUP BY cp.id, cp.name, cp.sku, cp.cost_price, cp.unit_of_measure, s.name
                HAVING COUNT(DISTINCT bc.bom_id) > 0
                ORDER BY total_cost_in_boms DESC
            `;

            const result = await pool.query(query);
            const materials = result.rows.map((row) => ({
                material_id: row.material_id,
                material_name: row.material_name,
                sku: row.sku,
                cost_price: parseFloat(row.cost_price) || 0,
                unit_of_measure: row.unit_of_measure,
                supplier_name: row.supplier_name,
                used_in_boms: parseInt(row.used_in_boms) || 0,
                total_required: parseFloat(row.total_required) || 0,
                total_cost_in_boms: parseFloat(row.total_cost_in_boms) || 0,
                avg_unit_cost: parseFloat(row.avg_unit_cost) || 0,
            }));

            MyLogger.success(action, { count: materials.length });
            serializeSuccessResponse(res, materials, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error);
            next(error);
        }
    }
}

export default new CostingReportController();
