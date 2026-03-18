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

  // Monthly income (last 12 months from factory_sales_invoices)
  monthly_income: { month: string; income: number }[];

  // Daily income (last 30 days from factory_sales_invoices)
  daily_income: { date: string; income: number }[];
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

      // Get monthly income (last 12 months from factory_sales_invoices)
      const monthlyIncomeQuery = `
        SELECT 
          TO_CHAR(invoice_date, 'YYYY-MM') as month,
          COALESCE(SUM(total_amount), 0)::float as income
        FROM factory_sales_invoices
        WHERE status != 'cancelled'
          AND invoice_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
        GROUP BY TO_CHAR(invoice_date, 'YYYY-MM')
        ORDER BY month ASC
      `;
      const monthlyIncomeResult = await pool.query(monthlyIncomeQuery);

      // Build full 12 months with 0 for months without data
      const incomeByMonth = new Map<string, number>(
        monthlyIncomeResult.rows.map((r: { month: string; income: string | number }) => [
          String(r.month),
          Number(r.income) || 0,
        ])
      );
      const monthlyIncome: { month: string; income: number }[] = [];
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const m = d.getMonth() + 1;
        const month = `${d.getFullYear()}-${m < 10 ? '0' : ''}${m}`;
        monthlyIncome.push({ month, income: incomeByMonth.get(month) ?? 0 });
      }

      // Get daily income (last 30 days from factory_sales_invoices)
      const dailyIncomeQuery = `
        SELECT 
          invoice_date::date::text as date,
          COALESCE(SUM(total_amount), 0)::float as income
        FROM factory_sales_invoices
        WHERE status != 'cancelled'
          AND invoice_date >= CURRENT_DATE - INTERVAL '29 days'
        GROUP BY invoice_date::date
        ORDER BY date ASC
      `;
      const dailyIncomeResult = await pool.query(dailyIncomeQuery);

      const incomeByDate = new Map<string, number>(
        dailyIncomeResult.rows.map((r: { date: string; income: string | number }) => [
          String(r.date),
          Number(r.income) || 0,
        ])
      );
      const dailyIncome: { date: string; income: number }[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const mo = d.getMonth() + 1;
        const day = d.getDate();
        const date = `${d.getFullYear()}-${mo < 10 ? '0' : ''}${mo}-${day < 10 ? '0' : ''}${day}`;
        dailyIncome.push({ date, income: incomeByDate.get(date) ?? 0 });
      }

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

        // Monthly income
        monthly_income: monthlyIncome,

        // Daily income
        daily_income: dailyIncome,
      };

      MyLogger.success(action, stats);

      return stats;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }
}

