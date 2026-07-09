import { NextFunction, Request, Response } from "express";
import pool from "@/database/connection";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";

class ProductionReportController {
    async getProductionSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/factory/production-reports/summary";
        try {
            const { start_date, end_date } = req.query;
            MyLogger.info(action, { start_date, end_date });

            const conditions: string[] = [];
            const queryParams: any[] = [];

            if (start_date) {
                conditions.push(`DATE(wo.created_at) >= $${queryParams.length + 1}`);
                queryParams.push(start_date);
            }
            if (end_date) {
                conditions.push(`DATE(wo.created_at) <= $${queryParams.length + 1}`);
                queryParams.push(end_date);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

            const summaryQuery = `
                SELECT
                    COUNT(*) as total_work_orders,
                    SUM(CASE WHEN wo.status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
                    SUM(CASE WHEN wo.status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_orders,
                    SUM(CASE WHEN wo.status IN ('planned','released') THEN 1 ELSE 0 END) as pending_orders,
                    SUM(CASE WHEN wo.status = 'on_hold' THEN 1 ELSE 0 END) as on_hold_orders,
                    SUM(CASE WHEN wo.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
                    COALESCE(SUM(wo.quantity), 0) as total_target_qty,
                    COALESCE(SUM(wo.estimated_hours), 0) as total_estimated_hours,
                    COALESCE(SUM(wo.actual_hours), 0) as total_actual_hours
                FROM work_orders wo
                ${whereClause}
            `;

            const runsQuery = `
                SELECT
                    COUNT(*) as total_runs,
                    SUM(CASE WHEN pr.status = 'completed' THEN 1 ELSE 0 END) as completed_runs,
                    COALESCE(SUM(pr.produced_quantity), 0) as total_produced,
                    COALESCE(SUM(pr.good_quantity), 0) as total_good,
                    COALESCE(SUM(pr.rejected_quantity), 0) as total_rejected,
                    COALESCE(AVG(CASE WHEN pr.status = 'completed' THEN pr.efficiency_percentage END), 0) as avg_efficiency,
                    COALESCE(AVG(CASE WHEN pr.status = 'completed' THEN pr.quality_percentage END), 0) as avg_quality
                FROM production_runs pr
                JOIN work_orders wo ON pr.work_order_id = wo.id
                ${whereClause}
            `;

            const [summaryResult, runsResult] = await Promise.all([
                pool.query(summaryQuery, queryParams),
                pool.query(runsQuery, queryParams),
            ]);

            const s = summaryResult.rows[0];
            const r = runsResult.rows[0];

            const summary = {
                total_work_orders: parseInt(s.total_work_orders) || 0,
                completed_orders: parseInt(s.completed_orders) || 0,
                in_progress_orders: parseInt(s.in_progress_orders) || 0,
                pending_orders: parseInt(s.pending_orders) || 0,
                on_hold_orders: parseInt(s.on_hold_orders) || 0,
                cancelled_orders: parseInt(s.cancelled_orders) || 0,
                completion_rate: s.total_work_orders > 0
                    ? ((parseInt(s.completed_orders) || 0) / parseInt(s.total_work_orders) * 100)
                    : 0,
                total_target_qty: parseFloat(s.total_target_qty) || 0,
                total_estimated_hours: parseFloat(s.total_estimated_hours) || 0,
                total_actual_hours: parseFloat(s.total_actual_hours) || 0,
                total_runs: parseInt(r.total_runs) || 0,
                completed_runs: parseInt(r.completed_runs) || 0,
                total_produced: parseFloat(r.total_produced) || 0,
                total_good: parseFloat(r.total_good) || 0,
                total_rejected: parseFloat(r.total_rejected) || 0,
                rejection_rate: r.total_produced > 0
                    ? ((parseFloat(r.total_rejected) || 0) / parseFloat(r.total_produced) * 100)
                    : 0,
                avg_efficiency: parseFloat(r.avg_efficiency) || 0,
                avg_quality: parseFloat(r.avg_quality) || 0,
            };

            MyLogger.success(action, { summary });
            serializeSuccessResponse(res, summary, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            next(error);
        }
    }

    async getWorkOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/factory/production-reports/work-orders";
        try {
            const { start_date, end_date, status } = req.query;
            MyLogger.info(action, { start_date, end_date, status });

            const conditions: string[] = [];
            const queryParams: any[] = [];

            if (start_date) {
                conditions.push(`DATE(wo.created_at) >= $${queryParams.length + 1}`);
                queryParams.push(start_date);
            }
            if (end_date) {
                conditions.push(`DATE(wo.created_at) <= $${queryParams.length + 1}`);
                queryParams.push(end_date);
            }
            if (status) {
                conditions.push(`wo.status = $${queryParams.length + 1}`);
                queryParams.push(status);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

            const query = `
                SELECT
                    wo.id,
                    wo.work_order_number,
                    wo.product_name,
                    wo.product_sku,
                    wo.quantity as target_quantity,
                    wo.unit_of_measure,
                    wo.status,
                    wo.priority,
                    wo.progress,
                    wo.estimated_hours,
                    wo.actual_hours,
                    wo.production_line_name,
                    wo.deadline,
                    wo.started_at,
                    wo.completed_at,
                    wo.created_at,
                    COALESCE(SUM(pr.produced_quantity), 0) as produced_quantity,
                    COALESCE(SUM(pr.good_quantity), 0) as good_quantity,
                    COALESCE(SUM(pr.rejected_quantity), 0) as rejected_quantity,
                    COUNT(pr.id) as run_count
                FROM work_orders wo
                LEFT JOIN production_runs pr ON pr.work_order_id = wo.id
                ${whereClause}
                GROUP BY wo.id, wo.work_order_number, wo.product_name, wo.product_sku,
                         wo.quantity, wo.unit_of_measure, wo.status, wo.priority,
                         wo.progress, wo.estimated_hours, wo.actual_hours,
                         wo.production_line_name, wo.deadline, wo.started_at,
                         wo.completed_at, wo.created_at
                ORDER BY wo.created_at DESC
            `;

            const result = await pool.query(query, queryParams);
            const workOrders = result.rows.map((row) => ({
                id: row.id,
                work_order_number: row.work_order_number,
                product_name: row.product_name,
                product_sku: row.product_sku,
                target_quantity: parseFloat(row.target_quantity) || 0,
                unit_of_measure: row.unit_of_measure,
                status: row.status,
                priority: row.priority,
                progress: parseFloat(row.progress) || 0,
                estimated_hours: parseFloat(row.estimated_hours) || 0,
                actual_hours: parseFloat(row.actual_hours) || 0,
                production_line_name: row.production_line_name,
                deadline: row.deadline,
                started_at: row.started_at,
                completed_at: row.completed_at,
                created_at: row.created_at,
                produced_quantity: parseFloat(row.produced_quantity) || 0,
                good_quantity: parseFloat(row.good_quantity) || 0,
                rejected_quantity: parseFloat(row.rejected_quantity) || 0,
                run_count: parseInt(row.run_count) || 0,
            }));

            MyLogger.success(action, { count: workOrders.length });
            serializeSuccessResponse(res, workOrders, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            next(error);
        }
    }

    async getProductionRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/factory/production-reports/runs";
        try {
            const { start_date, end_date } = req.query;
            MyLogger.info(action, { start_date, end_date });

            const conditions: string[] = [];
            const queryParams: any[] = [];

            if (start_date) {
                conditions.push(`DATE(pr.created_at) >= $${queryParams.length + 1}`);
                queryParams.push(start_date);
            }
            if (end_date) {
                conditions.push(`DATE(pr.created_at) <= $${queryParams.length + 1}`);
                queryParams.push(end_date);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

            const query = `
                SELECT
                    pr.id,
                    pr.run_number,
                    pr.status,
                    pr.target_quantity,
                    pr.produced_quantity,
                    pr.good_quantity,
                    pr.rejected_quantity,
                    pr.efficiency_percentage,
                    pr.quality_percentage,
                    pr.total_runtime_minutes,
                    pr.total_downtime_minutes,
                    pr.actual_start_time,
                    pr.actual_end_time,
                    pr.created_at,
                    wo.work_order_number,
                    wo.product_name,
                    pl.name as line_name
                FROM production_runs pr
                JOIN work_orders wo ON pr.work_order_id = wo.id
                LEFT JOIN production_lines pl ON pr.production_line_id = pl.id
                ${whereClause}
                ORDER BY pr.created_at DESC
            `;

            const result = await pool.query(query, queryParams);
            const runs = result.rows.map((row) => ({
                id: row.id,
                run_number: row.run_number,
                status: row.status,
                target_quantity: parseFloat(row.target_quantity) || 0,
                produced_quantity: parseFloat(row.produced_quantity) || 0,
                good_quantity: parseFloat(row.good_quantity) || 0,
                rejected_quantity: parseFloat(row.rejected_quantity) || 0,
                efficiency_percentage: parseFloat(row.efficiency_percentage) || 0,
                quality_percentage: parseFloat(row.quality_percentage) || 0,
                total_runtime_minutes: parseInt(row.total_runtime_minutes) || 0,
                total_downtime_minutes: parseInt(row.total_downtime_minutes) || 0,
                actual_start_time: row.actual_start_time,
                actual_end_time: row.actual_end_time,
                created_at: row.created_at,
                work_order_number: row.work_order_number,
                product_name: row.product_name,
                line_name: row.line_name,
            }));

            MyLogger.success(action, { count: runs.length });
            serializeSuccessResponse(res, runs, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            next(error);
        }
    }

    async getLineUtilization(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/factory/production-reports/line-utilization";
        try {
            const { start_date, end_date } = req.query;
            MyLogger.info(action, { start_date, end_date });

            const prConditions: string[] = [];
            const queryParams: any[] = [];

            if (start_date) {
                prConditions.push(`DATE(pr.created_at) >= $${queryParams.length + 1}`);
                queryParams.push(start_date);
            }
            if (end_date) {
                prConditions.push(`DATE(pr.created_at) <= $${queryParams.length + 1}`);
                queryParams.push(end_date);
            }
            const prWhere = prConditions.length > 0 ? `AND ${prConditions.join(" AND ")}` : "";

            const query = `
                SELECT
                    pl.id,
                    pl.name,
                    pl.code,
                    pl.capacity,
                    pl.current_load,
                    pl.status as line_status,
                    COUNT(pr.id) as total_runs,
                    SUM(CASE WHEN pr.status = 'completed' THEN 1 ELSE 0 END) as completed_runs,
                    COALESCE(SUM(pr.produced_quantity), 0) as total_produced,
                    COALESCE(SUM(pr.good_quantity), 0) as total_good,
                    COALESCE(SUM(pr.rejected_quantity), 0) as total_rejected,
                    COALESCE(SUM(pr.total_runtime_minutes), 0) as total_runtime_minutes,
                    COALESCE(AVG(CASE WHEN pr.status = 'completed' THEN pr.efficiency_percentage END), 0) as avg_efficiency
                FROM production_lines pl
                LEFT JOIN production_runs pr ON pr.production_line_id = pl.id ${prWhere}
                WHERE pl.is_active = true
                GROUP BY pl.id, pl.name, pl.code, pl.capacity, pl.current_load, pl.status
                ORDER BY total_runs DESC
            `;

            const result = await pool.query(query, queryParams);
            const lines = result.rows.map((row) => ({
                id: row.id,
                name: row.name,
                code: row.code,
                capacity: parseInt(row.capacity) || 0,
                current_load: parseInt(row.current_load) || 0,
                line_status: row.line_status,
                total_runs: parseInt(row.total_runs) || 0,
                completed_runs: parseInt(row.completed_runs) || 0,
                total_produced: parseFloat(row.total_produced) || 0,
                total_good: parseFloat(row.total_good) || 0,
                total_rejected: parseFloat(row.total_rejected) || 0,
                total_runtime_minutes: parseInt(row.total_runtime_minutes) || 0,
                avg_efficiency: parseFloat(row.avg_efficiency) || 0,
                utilization_rate: row.capacity > 0 ? (parseInt(row.current_load) / parseInt(row.capacity) * 100) : 0,
            }));

            MyLogger.success(action, { count: lines.length });
            serializeSuccessResponse(res, lines, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            next(error);
        }
    }

    async getWastageSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
        const action = "GET /api/factory/production-reports/wastage";
        try {
            const { start_date, end_date } = req.query;
            MyLogger.info(action, { start_date, end_date });

            const conditions: string[] = [];
            const queryParams: any[] = [];

            if (start_date) {
                conditions.push(`DATE(mw.recorded_date) >= $${queryParams.length + 1}`);
                queryParams.push(start_date);
            }
            if (end_date) {
                conditions.push(`DATE(mw.recorded_date) <= $${queryParams.length + 1}`);
                queryParams.push(end_date);
            }

            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

            const query = `
                SELECT
                    mw.material_name,
                    mw.wastage_reason,
                    mw.status,
                    COUNT(*) as record_count,
                    COALESCE(SUM(mw.quantity), 0) as total_quantity,
                    COALESCE(SUM(mw.cost), 0) as total_cost
                FROM material_wastage mw
                ${whereClause}
                GROUP BY mw.material_name, mw.wastage_reason, mw.status
                ORDER BY total_cost DESC
            `;

            const result = await pool.query(query, queryParams);

            const totalQuery = `
                SELECT
                    COUNT(*) as total_records,
                    COALESCE(SUM(mw.quantity), 0) as total_quantity,
                    COALESCE(SUM(mw.cost), 0) as total_cost,
                    SUM(CASE WHEN mw.status = 'approved' THEN mw.cost ELSE 0 END) as approved_cost,
                    SUM(CASE WHEN mw.status = 'pending' THEN 1 ELSE 0 END) as pending_count
                FROM material_wastage mw
                ${whereClause}
            `;

            const totalResult = await pool.query(totalQuery, queryParams);

            const wastage = result.rows.map((row) => ({
                material_name: row.material_name,
                wastage_reason: row.wastage_reason,
                status: row.status,
                record_count: parseInt(row.record_count) || 0,
                total_quantity: parseFloat(row.total_quantity) || 0,
                total_cost: parseFloat(row.total_cost) || 0,
            }));

            const totals = {
                total_records: parseInt(totalResult.rows[0].total_records) || 0,
                total_quantity: parseFloat(totalResult.rows[0].total_quantity) || 0,
                total_cost: parseFloat(totalResult.rows[0].total_cost) || 0,
                approved_cost: parseFloat(totalResult.rows[0].approved_cost) || 0,
                pending_count: parseInt(totalResult.rows[0].pending_count) || 0,
            };

            MyLogger.success(action, { wastageCount: wastage.length, totalCost: totals.total_cost });
            serializeSuccessResponse(res, { wastage, totals }, "SUCCESS");
        } catch (error: any) {
            MyLogger.error(action, error, { query: req.query });
            next(error);
        }
    }
}

export default new ProductionReportController();
