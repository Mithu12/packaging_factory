import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

export interface ServiceDueItem {
  order_id: number;
  order_number: string;
  customer_name: string | null;
  product_name: string;
  product_id: number;
  order_date: string;
  due_date: string;
  days_until_due: number;
}

export interface MachineMaintenanceDueItem {
  machine_id: number;
  machine_name: string;
  machine_code: string;
  production_line_name: string | null;
  next_service_date: string;
  days_until_due: number;
}

export interface DashboardStats {
  // Financial Metrics
  total_sales: number;
  today_sales: number;
  total_profit: number;
  total_expenses: number;
  today_expenses: number;
  net_profit: number;
  
  // Inventory Metrics
  low_stock_count: number;
  out_of_stock_count: number;
  total_products: number;
  
  // Service Overview
  warranty_due_count: number;
  warranty_due_items: ServiceDueItem[];
  service_due_count: number;
  service_due_items: ServiceDueItem[];
  machine_maintenance_due_count: number;
  machine_maintenance_due_items: MachineMaintenanceDueItem[];
  
  // Customer Metrics
  total_outstanding_dues: number;
  customers_with_dues: number;
  
  // Recent Orders
  total_orders: number;
  today_orders: number;
  pending_orders: number;
}

export interface DateFilter {
  startDate?: string; // YYYY-MM-DD format
  endDate?: string;   // YYYY-MM-DD format
  distribution_center_id?: number; // Filter stats by distribution center
}

export class GetDashboardStatsMediator {
  static async getDashboardStats(filter?: DateFilter): Promise<DashboardStats> {
    const action = 'GetDashboardStatsMediator.getDashboardStats';
    try {
      MyLogger.info(action, { filter });

      // Build date filter conditions
      const hasDateFilter = filter?.startDate && filter?.endDate;
      const dateParams = hasDateFilter ? [filter.startDate, filter.endDate] : [];
      
      // Log date params for debugging
      if (hasDateFilter) {
        MyLogger.info(action + ' - Date filter applied', { 
          startDate: filter.startDate, 
          endDate: filter.endDate 
        });
      }

      // Financial metrics - Total Sales (filtered by date range)
      const salesQuery = hasDateFilter ? `
        SELECT 
          COALESCE(SUM(total_amount), 0) as total_sales,
          COUNT(*) as total_orders
        FROM sales_orders
        WHERE status = 'completed'
        AND order_date::date >= $1::date AND order_date::date <= $2::date
      ` : `
        SELECT 
          COALESCE(SUM(total_amount), 0) as total_sales,
          COUNT(*) as total_orders
        FROM sales_orders
        WHERE status = 'completed'
      `;

      const todaySalesQuery = `
        SELECT 
          COALESCE(SUM(total_amount), 0) as today_sales,
          COUNT(*) as today_orders
        FROM sales_orders
        WHERE status = 'completed' 
        AND DATE(order_date) = CURRENT_DATE
      `;

      // Profit calculation - (selling_price - cost_price) * quantity (filtered by date range)
      const profitQuery = hasDateFilter ? `
        SELECT 
          COALESCE(SUM((soli.unit_price - COALESCE(p.cost_price, 0)) * soli.quantity), 0) as total_profit
        FROM sales_order_line_items soli
        JOIN sales_orders so ON soli.sales_order_id = so.id
        LEFT JOIN products p ON soli.product_id = p.id
        WHERE so.status = 'completed'
        AND so.order_date::date >= $1::date AND so.order_date::date <= $2::date
      ` : `
        SELECT 
          COALESCE(SUM((soli.unit_price - COALESCE(p.cost_price, 0)) * soli.quantity), 0) as total_profit
        FROM sales_order_line_items soli
        JOIN sales_orders so ON soli.sales_order_id = so.id
        LEFT JOIN products p ON soli.product_id = p.id
        WHERE so.status = 'completed'
      `;

      // Expense metrics (filtered by date range)
      const expensesQuery = hasDateFilter ? `
        SELECT 
          COALESCE(SUM(amount), 0) as total_expenses
        FROM expenses
        WHERE status IN ('approved', 'paid')
        AND expense_date::date >= $1::date AND expense_date::date <= $2::date
      ` : `
        SELECT 
          COALESCE(SUM(amount), 0) as total_expenses
        FROM expenses
        WHERE status IN ('approved', 'paid')
      `;

      const todayExpensesQuery = `
        SELECT 
          COALESCE(SUM(amount), 0) as today_expenses
        FROM expenses
        WHERE status IN ('approved', 'paid')
        AND DATE(expense_date) = CURRENT_DATE
      `;

      // Inventory metrics - uses product_locations when DC is specified
      const distributionCenterId = filter?.distribution_center_id;
      const inventoryQuery = distributionCenterId ? `
        SELECT 
          COUNT(DISTINCT pl.product_id) as total_products,
          COUNT(DISTINCT pl.product_id) FILTER (
            WHERE pl.current_stock <= COALESCE(NULLIF(pl.min_stock_level, 0), p.min_stock_level) 
            AND pl.current_stock > 0
          ) as low_stock_count,
          COUNT(DISTINCT pl.product_id) FILTER (WHERE pl.current_stock = 0 OR pl.available_stock <= 0) as out_of_stock_count
        FROM product_locations pl
        JOIN products p ON pl.product_id = p.id
        WHERE p.status = 'active' AND pl.status = 'active' AND pl.distribution_center_id = $1
      ` : `
        SELECT 
          COUNT(*) as total_products,
          COUNT(*) FILTER (WHERE current_stock < min_stock_level AND current_stock > 0) as low_stock_count,
          COUNT(*) FILTER (WHERE current_stock = 0) as out_of_stock_count
        FROM products
        WHERE status = 'active'
      `;
      const inventoryParams = distributionCenterId ? [distributionCenterId] : [];

      // Warranty due items (products sold where order_date + warranty_period is within next 30 days)
      const warrantyDueQuery = `
        SELECT 
          so.id as order_id,
          so.order_number,
          c.name as customer_name,
          soli.product_name,
          soli.product_id,
          so.order_date::text,
          (so.order_date + (p.warranty_period || ' months')::interval)::date::text as due_date,
          EXTRACT(DAY FROM (so.order_date + (p.warranty_period || ' months')::interval) - CURRENT_DATE)::integer as days_until_due
        FROM sales_order_line_items soli
        JOIN sales_orders so ON soli.sales_order_id = so.id
        JOIN products p ON soli.product_id = p.id
        LEFT JOIN customers c ON so.customer_id = c.id
        WHERE so.status = 'completed'
        AND p.warranty_period IS NOT NULL
        AND p.warranty_period > 0
        AND (so.order_date + (p.warranty_period || ' months')::interval)::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        ORDER BY due_date ASC
        LIMIT 10
      `;

      const warrantyDueCountQuery = `
        SELECT COUNT(*) as count
        FROM sales_order_line_items soli
        JOIN sales_orders so ON soli.sales_order_id = so.id
        JOIN products p ON soli.product_id = p.id
        WHERE so.status = 'completed'
        AND p.warranty_period IS NOT NULL
        AND p.warranty_period > 0
        AND (so.order_date + (p.warranty_period || ' months')::interval)::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      `;

      // Service due items (products sold where order_date + service_time is within next 30 days)
      const serviceDueQuery = `
        SELECT 
          so.id as order_id,
          so.order_number,
          c.name as customer_name,
          soli.product_name,
          soli.product_id,
          so.order_date::text,
          (so.order_date + (p.service_time || ' months')::interval)::date::text as due_date,
          EXTRACT(DAY FROM (so.order_date + (p.service_time || ' months')::interval) - CURRENT_DATE)::integer as days_until_due
        FROM sales_order_line_items soli
        JOIN sales_orders so ON soli.sales_order_id = so.id
        JOIN products p ON soli.product_id = p.id
        LEFT JOIN customers c ON so.customer_id = c.id
        WHERE so.status = 'completed'
        AND p.service_time IS NOT NULL
        AND p.service_time > 0
        AND (so.order_date + (p.service_time || ' months')::interval)::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
        ORDER BY due_date ASC
        LIMIT 10
      `;

      const serviceDueCountQuery = `
        SELECT COUNT(*) as count
        FROM sales_order_line_items soli
        JOIN sales_orders so ON soli.sales_order_id = so.id
        JOIN products p ON soli.product_id = p.id
        WHERE so.status = 'completed'
        AND p.service_time IS NOT NULL
        AND p.service_time > 0
        AND (so.order_date + (p.service_time || ' months')::interval)::date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      `;

      // Machine maintenance due: machines with next_service_date already passed or within 30 days
      const machineMaintenanceDueQuery = `
        SELECT
          m.id as machine_id,
          m.name as machine_name,
          m.code as machine_code,
          pl.name as production_line_name,
          m.next_service_date::text,
          (m.next_service_date - CURRENT_DATE)::integer as days_until_due
        FROM machines m
        LEFT JOIN production_lines pl ON m.production_line_id = pl.id
        WHERE m.is_active = true
        AND m.next_service_date IS NOT NULL
        AND m.next_service_date <= CURRENT_DATE + INTERVAL '30 days'
        ORDER BY m.next_service_date ASC
        LIMIT 10
      `;

      const machineMaintenanceDueCountQuery = `
        SELECT COUNT(*) as count
        FROM machines m
        WHERE m.is_active = true
        AND m.next_service_date IS NOT NULL
        AND m.next_service_date <= CURRENT_DATE + INTERVAL '30 days'
      `;

      // Customer dues
      const customerDuesQuery = `
        SELECT 
          COALESCE(SUM(due_amount), 0) as total_outstanding_dues,
          COUNT(*) FILTER (WHERE due_amount > 0) as customers_with_dues
        FROM customers
        WHERE status = 'active'
      `;

      // Pending orders
      const pendingOrdersQuery = `
        SELECT COUNT(*) as pending_orders
        FROM sales_orders
        WHERE status = 'pending'
      `;

      // Execute all queries in parallel
      const [
        salesResult,
        todaySalesResult,
        profitResult,
        expensesResult,
        todayExpensesResult,
        inventoryResult,
        warrantyDueResult,
        warrantyDueCountResult,
        serviceDueResult,
        serviceDueCountResult,
        machineMaintenanceDueResult,
        machineMaintenanceDueCountResult,
        customerDuesResult,
        pendingOrdersResult
      ] = await Promise.all([
        pool.query(salesQuery, dateParams),
        pool.query(todaySalesQuery),
        pool.query(profitQuery, dateParams),
        pool.query(expensesQuery, dateParams),
        pool.query(todayExpensesQuery),
        pool.query(inventoryQuery, inventoryParams),
        pool.query(warrantyDueQuery),
        pool.query(warrantyDueCountQuery),
        pool.query(serviceDueQuery),
        pool.query(serviceDueCountQuery),
        pool.query(machineMaintenanceDueQuery),
        pool.query(machineMaintenanceDueCountQuery),
        pool.query(customerDuesQuery),
        pool.query(pendingOrdersQuery)
      ]);

      const totalSales = parseFloat(salesResult.rows[0].total_sales);
      const totalExpenses = parseFloat(expensesResult.rows[0].total_expenses);
      const totalProfit = parseFloat(profitResult.rows[0].total_profit);

      const stats: DashboardStats = {
        // Financial
        total_sales: totalSales,
        today_sales: parseFloat(todaySalesResult.rows[0].today_sales),
        total_profit: totalProfit,
        total_expenses: totalExpenses,
        today_expenses: parseFloat(todayExpensesResult.rows[0].today_expenses),
        net_profit: totalSales - totalExpenses,
        
        // Inventory
        total_products: parseInt(inventoryResult.rows[0].total_products),
        low_stock_count: parseInt(inventoryResult.rows[0].low_stock_count),
        out_of_stock_count: parseInt(inventoryResult.rows[0].out_of_stock_count),
        
        // Service Overview
        warranty_due_count: parseInt(warrantyDueCountResult.rows[0].count),
        warranty_due_items: warrantyDueResult.rows.map(row => ({
          order_id: row.order_id,
          order_number: row.order_number,
          customer_name: row.customer_name,
          product_name: row.product_name,
          product_id: row.product_id,
          order_date: row.order_date,
          due_date: row.due_date,
          days_until_due: row.days_until_due
        })),
        service_due_count: parseInt(serviceDueCountResult.rows[0].count),
        service_due_items: serviceDueResult.rows.map(row => ({
          order_id: row.order_id,
          order_number: row.order_number,
          customer_name: row.customer_name,
          product_name: row.product_name,
          product_id: row.product_id,
          order_date: row.order_date,
          due_date: row.due_date,
          days_until_due: row.days_until_due
        })),
        machine_maintenance_due_count: parseInt(machineMaintenanceDueCountResult.rows[0].count),
        machine_maintenance_due_items: machineMaintenanceDueResult.rows.map(row => ({
          machine_id: row.machine_id,
          machine_name: row.machine_name,
          machine_code: row.machine_code,
          production_line_name: row.production_line_name,
          next_service_date: row.next_service_date,
          days_until_due: row.days_until_due
        })),

        // Customer
        total_outstanding_dues: parseFloat(customerDuesResult.rows[0].total_outstanding_dues),
        customers_with_dues: parseInt(customerDuesResult.rows[0].customers_with_dues),
        
        // Orders
        total_orders: parseInt(salesResult.rows[0].total_orders),
        today_orders: parseInt(todaySalesResult.rows[0].today_orders),
        pending_orders: parseInt(pendingOrdersResult.rows[0].pending_orders)
      };

      MyLogger.success(action, { 
        totalSales: stats.total_sales, 
        totalProfit: stats.total_profit,
        warrantyDueCount: stats.warranty_due_count,
        serviceDueCount: stats.service_due_count
      });

      return stats;
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }
}
