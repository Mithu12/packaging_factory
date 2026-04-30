import pool from "@/database/connection";
import { FactoryCustomerOrderStatus } from "@/types/factory";
import { MyLogger } from "@/utils/new-logger";

const VALID_STATUSES = new Set<string>(Object.values(FactoryCustomerOrderStatus));

export interface StockVsOrderDemandRow {
    product_id: number;
    sku: string;
    product_code: string | null;
    name: string;
    unit_of_measure: string | null;
    category_name: string;
    current_stock: number;
    reserved_stock: number;
    available_stock: number;
    ordered_qty: number;
    order_count: number;
    net_position: number;
}

export interface StockVsOrderDemandSummary {
    total_products: number;
    products_short: number;
    total_current_stock: number;
    total_available_stock: number;
    total_ordered_qty: number;
    statuses: FactoryCustomerOrderStatus[];
}

export interface StockVsOrderDemandParams {
    statuses: FactoryCustomerOrderStatus[];
    search?: string;
}

export class GetStockVsOrderDemandMediator {
    static async getReport(
        params: StockVsOrderDemandParams,
        userId?: number
    ): Promise<{ rows: StockVsOrderDemandRow[]; summary: StockVsOrderDemandSummary }> {
        const action = "GetStockVsOrderDemandMediator.getReport";
        MyLogger.info(action, { params, userId });

        const { statuses, search } = params;

        if (!Array.isArray(statuses) || statuses.length === 0) {
            throw new Error("At least one order status must be selected");
        }
        const invalid = statuses.filter((s) => !VALID_STATUSES.has(s));
        if (invalid.length > 0) {
            throw new Error(`Invalid order status(es): ${invalid.join(", ")}`);
        }

        const userFactoryIds = await getUserAccessibleFactoryIds(userId);

        const queryParams: any[] = [];
        let p = 1;

        // $1: statuses array
        queryParams.push(statuses);
        const statusesParam = `$${p++}::text[]`;

        // optional factory restriction (non-admin users)
        let factoryClause = "";
        if (userFactoryIds !== null) {
            queryParams.push(userFactoryIds);
            factoryClause = `AND co.factory_id = ANY($${p++}::bigint[])`;
        }

        // optional search
        let searchClause = "";
        if (search && search.trim() !== "") {
            queryParams.push(`%${search.trim()}%`);
            searchClause = `AND (p.name ILIKE $${p} OR p.sku ILIKE $${p} OR p.product_code ILIKE $${p})`;
            p++;
        }

        const sql = `
            SELECT
                p.id AS product_id,
                p.sku,
                p.product_code,
                p.name,
                p.unit_of_measure,
                c.name AS category_name,
                COALESCE(p.current_stock, 0) AS current_stock,
                COALESCE(p.reserved_stock, 0) AS reserved_stock,
                (COALESCE(p.current_stock, 0) - COALESCE(p.reserved_stock, 0)) AS available_stock,
                COALESCE(SUM(li.quantity) FILTER (WHERE co.status = ANY(${statusesParam})), 0) AS ordered_qty,
                COALESCE(COUNT(DISTINCT co.id) FILTER (WHERE co.status = ANY(${statusesParam})), 0) AS order_count,
                (COALESCE(p.current_stock, 0) - COALESCE(SUM(li.quantity) FILTER (WHERE co.status = ANY(${statusesParam})), 0)) AS net_position
            FROM products p
            JOIN categories c ON c.id = p.category_id
            LEFT JOIN factory_customer_order_line_items li ON li.product_id = p.id
            LEFT JOIN factory_customer_orders co
                ON co.id = li.order_id
                ${factoryClause}
            WHERE p.status = 'active'
              AND c.name = 'Ready Goods'
              ${searchClause}
            GROUP BY p.id, c.name
            ORDER BY net_position ASC, p.sku ASC
        `;

        const result = await pool.query(sql, queryParams);

        const rows: StockVsOrderDemandRow[] = result.rows.map((r: any) => ({
            product_id: Number(r.product_id),
            sku: r.sku,
            product_code: r.product_code,
            name: r.name,
            unit_of_measure: r.unit_of_measure,
            category_name: r.category_name,
            current_stock: Number(r.current_stock) || 0,
            reserved_stock: Number(r.reserved_stock) || 0,
            available_stock: Number(r.available_stock) || 0,
            ordered_qty: Number(r.ordered_qty) || 0,
            order_count: Number(r.order_count) || 0,
            net_position: Number(r.net_position) || 0,
        }));

        const summary: StockVsOrderDemandSummary = {
            total_products: rows.length,
            products_short: rows.filter((r) => r.net_position < 0).length,
            total_current_stock: rows.reduce((acc, r) => acc + r.current_stock, 0),
            total_available_stock: rows.reduce((acc, r) => acc + r.available_stock, 0),
            total_ordered_qty: rows.reduce((acc, r) => acc + r.ordered_qty, 0),
            statuses,
        };

        MyLogger.success(action, {
            rowCount: rows.length,
            productsShort: summary.products_short,
        });

        return { rows, summary };
    }
}

// Returns null when the user is admin (no factory restriction), otherwise the
// list of factory ids accessible to the user. Returns null when userId is
// missing too — controller-level auth has already ensured a user is present.
async function getUserAccessibleFactoryIds(userId?: number): Promise<string[] | null> {
    if (!userId) return null;

    const roleResult = await pool.query(
        "SELECT role_id FROM users WHERE id = $1",
        [userId]
    );
    if (roleResult.rows.length === 0) return null;
    if (roleResult.rows[0].role_id === 1) return null; // admin sees everything

    const factoriesResult = await pool.query(
        "SELECT factory_id FROM get_user_factories($1)",
        [userId]
    );
    return factoriesResult.rows.map((r: any) => String(r.factory_id));
}
