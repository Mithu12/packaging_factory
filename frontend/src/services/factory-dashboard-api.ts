// =====================================================
// Factory Dashboard Frontend API Service
// =====================================================

import { makeRequest } from '@/services/api-utils';

// =====================================================
// Types
// =====================================================

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
  daily_revenue: number;          // today's invoiced sales
  daily_expenses: number;         // today's approved/paid expenses
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

// =====================================================
// API Service
// =====================================================

export class FactoryDashboardApiService {
  static async getDashboardStats(): Promise<FactoryDashboardStats> {
    return makeRequest<FactoryDashboardStats>('/factory/dashboard/stats');
  }
}

// =====================================================
// Query Keys for React Query
// =====================================================

export const factoryDashboardQueryKeys = {
  all: ['factory-dashboard'] as const,
  stats: () => [...factoryDashboardQueryKeys.all, 'stats'] as const,
};

