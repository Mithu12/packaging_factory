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

      // Get material stats
      const materialStatsQuery = `
        SELECT 
          COUNT(*) as total_allocations,
          COALESCE(SUM(cost), 0) as total_wastage_cost,
          COUNT(*) FILTER (WHERE status = 'pending') as wastage_pending_approval
        FROM work_order_material_allocations
        CROSS JOIN (SELECT * FROM material_wastage) mw
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
          customer_name, 
          status, 
          total_amount,
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
          start_date
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
          (SELECT COUNT(*) FROM factory_customer_orders WHERE delivery_date < CURRENT_DATE AND status NOT IN ('completed', 'shipped', 'cancelled')) as overdue_orders,
          (SELECT COUNT(*) FROM production_runs WHERE quality_percentage < 90 AND status = 'completed') as quality_issues
      `;
      const alerts = await pool.query(alertsQuery);

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
      };

      MyLogger.success(action, stats);

      return stats;
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    }
  }
}

