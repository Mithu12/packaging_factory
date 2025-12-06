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

