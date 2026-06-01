import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

export interface FactoryDashboardStats {
  // Overview
  total_orders: number;
  active_orders: number;
  total_work_orders: number;
  active_work_orders: number;
  
  // Production
  active_production_runs: number;
  total_produced_today: number;
  average_efficiency: number;
  average_quality: number;
  
  // Materials
  total_allocations: number;
  pending_material_shortages: number;
  total_wastage_cost: number;
  wastage_pending_approval: number;
  
  // Recent activity
  recent_orders: any[];
  recent_work_orders: any[];
  recent_production_runs: any[];
  
  // Alerts
  material_shortages: number;
  overdue_orders: number;
  quality_issues: number;

  // Inventory (from products)
  low_stock_count: number;
  out_of_stock_count: number;
  total_products: number;

  // Factory customer dues
  total_outstanding_dues: number;
  customers_with_dues: number;

  // Pending orders (factory_customer_orders)
  pending_orders: number;

  // Total ordered quantity across all (non-cancelled) order line items
  total_order_qty: number;

  // Cash-flow snapshots
  daily_revenue: number;        // today's invoiced sales
  daily_expenses: number;       // today's approved/paid expenses
  electricity_bill_month: number; // current-month "Utilities" expenses

  // Manpower (today's attendance vs active headcount)
  present_workers: number;
  total_workers: number;

  // Accounts payable to suppliers
  total_supplier_dues: number;

  // Stock levels for admin-mapped products (null = not configured)
  named_stock: {
    media_paper: number | null;
    liner_paper: number | null;
    silicate_gum: number | null;
    stitching_wire: number | null;
  };
}

export class FactoryDashboardMediator {
  static async getDashboardStats(userId: number): Promise<FactoryDashboardStats> {
    const action = 'Get Factory Dashboard Stats';

    try {
      MyLogger.info(action, { userId });

      // Get order stats
      const orderStatsQuery = `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE status IN ('pending', 'quoted', 'approved', 'in_production')) as active_orders
        FROM factory_customer_orders
      `;
      const orderStats = await pool.query(orderStatsQuery);

      // Get work order stats
      const workOrderStatsQuery = `
        SELECT 
          COUNT(*) as total_work_orders,
          COUNT(*) FILTER (WHERE status IN ('planned', 'released', 'in_progress')) as active_work_orders
        FROM work_orders
      `;
      const workOrderStats = await pool.query(workOrderStatsQuery);

      // Get production stats
      const productionStatsQuery = `
        SELECT 
          COUNT(*) FILTER (WHERE status = 'in_progress') as active_production_runs,
          COALESCE(SUM(produced_quantity) FILTER (WHERE DATE(actual_start_time) = CURRENT_DATE), 0) as total_produced_today,
          COALESCE(AVG(efficiency_percentage), 0) as average_efficiency,
          COALESCE(AVG(quality_percentage), 0) as average_quality
        FROM production_runs
      `;
      const productionStats = await pool.query(productionStatsQuery);

      // Get material stats (separate subqueries to avoid CROSS JOIN and ambiguous column references)
      const materialStatsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM work_order_material_allocations) as total_allocations,
          (SELECT COALESCE(SUM(cost), 0) FROM material_wastage) as total_wastage_cost,
          (SELECT COUNT(*) FROM material_wastage WHERE status = 'pending') as wastage_pending_approval
      `;
      const materialStats = await pool.query(materialStatsQuery);

      // Get material shortages count
      const shortagesQuery = `
        SELECT COUNT(*) as shortages 
        FROM material_shortages 
        WHERE status = 'open'
      `;
      const shortages = await pool.query(shortagesQuery);

      // Get recent orders (last 5)
      const recentOrdersQuery = `
        SELECT 
          id, 
          order_number, 
          factory_customer_name as customer_name, 
          status, 
          total_value as total_amount,
          order_date
        FROM factory_customer_orders
        ORDER BY created_at DESC
        LIMIT 5
      `;
      const recentOrders = await pool.query(recentOrdersQuery);

      // Get recent work orders (last 5)
      const recentWorkOrdersQuery = `
        SELECT 
          id, 
          work_order_number, 
          product_name, 
          status, 
          quantity,
          deadline as start_date
        FROM work_orders
        ORDER BY created_at DESC
        LIMIT 5
      `;
      const recentWorkOrders = await pool.query(recentWorkOrdersQuery);

      // Get recent production runs (last 5 active)
      const recentProductionQuery = `
        SELECT 
          pr.id,
          pr.run_number,
          pr.status,
          pr.produced_quantity,
          pr.target_quantity,
          pr.efficiency_percentage,
          wo.work_order_number
        FROM production_runs pr
        JOIN work_orders wo ON pr.work_order_id = wo.id
        WHERE pr.status IN ('in_progress', 'paused')
        ORDER BY pr.actual_start_time DESC
        LIMIT 5
      `;
      const recentProduction = await pool.query(recentProductionQuery);

      // Get alerts
      const alertsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM material_shortages WHERE status = 'open') as material_shortages,
          (SELECT COUNT(*) FROM factory_customer_orders WHERE required_date::date < CURRENT_DATE AND status NOT IN ('completed', 'shipped', 'cancelled')) as overdue_orders,
          (SELECT COUNT(*) FROM production_runs WHERE quality_percentage < 90 AND status = 'completed') as quality_issues
      `;
      const alerts = await pool.query(alertsQuery);

      // Get inventory stats (from products)
      const inventoryQuery = `
        SELECT 
          COUNT(*) as total_products,
          COUNT(*) FILTER (WHERE current_stock < min_stock_level AND current_stock > 0) as low_stock_count,
          COUNT(*) FILTER (WHERE current_stock = 0) as out_of_stock_count
        FROM products
        WHERE status = 'active'
      `;
      const inventoryResult = await pool.query(inventoryQuery);

      // Get factory customer dues (from factory_customers)
      const customerDuesQuery = `
        SELECT 
          COALESCE(SUM(total_outstanding_amount), 0) as total_outstanding_dues,
          COUNT(*) FILTER (WHERE total_outstanding_amount > 0) as customers_with_dues
        FROM factory_customers
        WHERE is_active = true
      `;
      const customerDuesResult = await pool.query(customerDuesQuery);

      // Get pending orders (factory_customer_orders)
      const pendingOrdersQuery = `
        SELECT COUNT(*) as pending_orders
        FROM factory_customer_orders
        WHERE status IN ('pending', 'quoted')
      `;
      const pendingOrdersResult = await pool.query(pendingOrdersQuery);

      // Total ordered quantity across all non-cancelled orders
      const orderQtyQuery = `
        SELECT COALESCE(SUM(li.quantity), 0)::float as total_order_qty
        FROM factory_customer_order_line_items li
        JOIN factory_customer_orders co ON co.id = li.order_id
        WHERE co.status <> 'cancelled'
      `;
      const orderQtyResult = await pool.query(orderQtyQuery);

      // Today's invoiced sales (daily revenue)
      const dailyRevenueQuery = `
        SELECT COALESCE(SUM(total_amount), 0)::float as daily_revenue
        FROM factory_sales_invoices
        WHERE status <> 'cancelled'
          AND invoice_date::date = CURRENT_DATE
      `;
      const dailyRevenueResult = await pool.query(dailyRevenueQuery);

      // Today's expenses + current-month electricity (Utilities category).
      // Resolve the category by name to avoid hardcoding the seeded id.
      const expensesQuery = `
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE DATE(expense_date) = CURRENT_DATE), 0)::float as daily_expenses,
          COALESCE(SUM(amount) FILTER (
            WHERE DATE_TRUNC('month', expense_date) = DATE_TRUNC('month', CURRENT_DATE)
              AND category_id = (SELECT id FROM expense_categories WHERE name = 'Utilities' LIMIT 1)
          ), 0)::float as electricity_bill_month
        FROM expenses
        WHERE status IN ('approved', 'paid')
      `;
      const expensesResult = await pool.query(expensesQuery);

      // Manpower: present today vs active headcount
      const workersQuery = `
        SELECT
          (SELECT COUNT(*) FROM attendance_records
             WHERE attendance_date = CURRENT_DATE
               AND status IN ('present', 'late', 'half_day')) as present_workers,
          (SELECT COUNT(*) FROM employees WHERE is_active = true) as total_workers
      `;
      const workersResult = await pool.query(workersQuery);

      // Total supplier dues (opening balances + outstanding invoice amounts)
      const supplierDuesQuery = `
        SELECT COALESCE(SUM(s.opening_balance), 0)::float
             + COALESCE(SUM(i.outstanding_amount), 0)::float as total_supplier_dues
        FROM suppliers s
        LEFT JOIN invoices i ON s.id = i.supplier_id AND i.status <> 'cancelled'
        WHERE s.status = 'active'
      `;
      const supplierDuesResult = await pool.query(supplierDuesQuery);

      // Admin-mapped product stock levels (Media/Liner Paper, Silicate Gum,
      // Stitching Wire). Mapping lives in settings(category='factory_dashboard').
      const namedStock = await this.getNamedStock();

      const stats: FactoryDashboardStats = {
        // Overview
        total_orders: parseInt(orderStats.rows[0].total_orders) || 0,
        active_orders: parseInt(orderStats.rows[0].active_orders) || 0,
        total_work_orders: parseInt(workOrderStats.rows[0].total_work_orders) || 0,
        active_work_orders: parseInt(workOrderStats.rows[0].active_work_orders) || 0,

        // Production
        active_production_runs: parseInt(productionStats.rows[0].active_production_runs) || 0,
        total_produced_today: parseFloat(productionStats.rows[0].total_produced_today) || 0,
        average_efficiency: parseFloat(productionStats.rows[0].average_efficiency) || 0,
        average_quality: parseFloat(productionStats.rows[0].average_quality) || 0,

        // Materials
        total_allocations: parseInt(materialStats.rows[0]?.total_allocations) || 0,
        pending_material_shortages: parseInt(shortages.rows[0].shortages) || 0,
        total_wastage_cost: parseFloat(materialStats.rows[0]?.total_wastage_cost) || 0,
        wastage_pending_approval: parseInt(materialStats.rows[0]?.wastage_pending_approval) || 0,

        // Recent activity
        recent_orders: recentOrders.rows,
        recent_work_orders: recentWorkOrders.rows,
        recent_production_runs: recentProduction.rows,

        // Alerts
        material_shortages: parseInt(alerts.rows[0].material_shortages) || 0,
        overdue_orders: parseInt(alerts.rows[0].overdue_orders) || 0,
        quality_issues: parseInt(alerts.rows[0].quality_issues) || 0,

        // Inventory
        low_stock_count: parseInt(inventoryResult.rows[0].low_stock_count) || 0,
        out_of_stock_count: parseInt(inventoryResult.rows[0].out_of_stock_count) || 0,
        total_products: parseInt(inventoryResult.rows[0].total_products) || 0,

        // Factory customer dues
        total_outstanding_dues: parseFloat(customerDuesResult.rows[0].total_outstanding_dues) || 0,
        customers_with_dues: parseInt(customerDuesResult.rows[0].customers_with_dues) || 0,

        // Pending orders
        pending_orders: parseInt(pendingOrdersResult.rows[0].pending_orders) || 0,

        // Total ordered quantity
        total_order_qty: parseFloat(orderQtyResult.rows[0].total_order_qty) || 0,

        // Cash-flow snapshots
        daily_revenue: parseFloat(dailyRevenueResult.rows[0].daily_revenue) || 0,
        daily_expenses: parseFloat(expensesResult.rows[0].daily_expenses) || 0,
        electricity_bill_month: parseFloat(expensesResult.rows[0].electricity_bill_month) || 0,

        // Manpower
        present_workers: parseInt(workersResult.rows[0].present_workers) || 0,
        total_workers: parseInt(workersResult.rows[0].total_workers) || 0,

        // Supplier dues
        total_supplier_dues: parseFloat(supplierDuesResult.rows[0].total_supplier_dues) || 0,

        // Mapped product stock
        named_stock: namedStock,
      };

      MyLogger.success(action, stats);

      return stats;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  /**
   * Resolve the four admin-mapped dashboard products to their current stock.
   * The mapping (product ids) is stored in settings(category='factory_dashboard',
   * key in {media_paper,liner_paper,silicate_gum,stitching_wire}_product_id).
   * Returns null for any slot that is unmapped or whose product no longer exists.
   */
  private static async getNamedStock(): Promise<FactoryDashboardStats['named_stock']> {
    const slots = [
      'media_paper',
      'liner_paper',
      'silicate_gum',
      'stitching_wire',
    ] as const;

    const empty: FactoryDashboardStats['named_stock'] = {
      media_paper: null,
      liner_paper: null,
      silicate_gum: null,
      stitching_wire: null,
    };

    // Read the configured product ids.
    const settingsRes = await pool.query<{ key: string; value: string }>(
      `SELECT key, value FROM settings WHERE category = 'factory_dashboard'`
    );
    const idByKey = new Map<string, number>();
    for (const row of settingsRes.rows) {
      const id = parseInt(row.value, 10);
      if (Number.isFinite(id) && id > 0) idByKey.set(row.key, id);
    }

    const productIds = slots
      .map(s => idByKey.get(`${s}_product_id`))
      .filter((v): v is number => v != null);

    if (productIds.length === 0) return empty;

    const stockRes = await pool.query<{ id: string; current_stock: string }>(
      `SELECT id, current_stock FROM products WHERE id = ANY($1::bigint[])`,
      [productIds]
    );
    const stockById = new Map<number, number>(
      stockRes.rows.map(r => [Number(r.id), parseFloat(r.current_stock) || 0])
    );

    const result = { ...empty };
    for (const s of slots) {
      const id = idByKey.get(`${s}_product_id`);
      if (id != null && stockById.has(id)) {
        result[s] = stockById.get(id)!;
      }
    }
    return result;
  }
}

