// =====================================================
// Production Execution Frontend API Service
// =====================================================

import { makeRequest } from '@/services/api-utils';

// =====================================================
// Types
// =====================================================

export interface ProductionRun {
  id: string;
  run_number: string;
  work_order_id: string;
  work_order_number: string;
  production_line_id?: string;
  production_line_name?: string;
  operator_id?: string;
  operator_name?: string;
  status: 'scheduled' | 'in_progress' | 'paused' | 'completed' | 'cancelled';
  scheduled_start_time?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  total_runtime_minutes: number;
  total_downtime_minutes: number;
  target_quantity: number;
  produced_quantity: number;
  good_quantity: number;
  rejected_quantity: number;
  planned_cycle_time_seconds?: number;
  actual_cycle_time_seconds?: number;
  efficiency_percentage: number;
  quality_percentage: number;
  notes?: string;
  started_by?: number;
  completed_by?: number;
  created_at: string;
  updated_at?: string;
  events?: ProductionRunEvent[];
  downtime?: ProductionDowntime[];
}

export interface ProductionRunEvent {
  id: string;
  production_run_id: string;
  event_type: string;
  event_status?: string;
  event_timestamp: string;
  quantity_at_event?: number;
  notes?: string;
  metadata?: any;
  performed_by?: number;
  created_at: string;
}

export interface ProductionDowntime {
  id: string;
  production_run_id: string;
  downtime_reason: string;
  downtime_category: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  is_planned: boolean;
  cost_impact?: number;
  notes?: string;
  resolution_notes?: string;
  resolved_by?: number;
  recorded_by: number;
  created_at: string;
  updated_at?: string;
}

export interface CreateProductionRunRequest {
  work_order_id: string;
  production_line_id?: string;
  operator_id?: string;
  scheduled_start_time?: string;
  target_quantity: number;
  planned_cycle_time_seconds?: number;
  notes?: string;
}

export interface CompleteProductionRunRequest {
  produced_quantity?: number;
  good_quantity?: number;
  rejected_quantity?: number;
  notes?: string;
}

export interface RecordDowntimeRequest {
  production_run_id: string;
  downtime_reason: string;
  downtime_category: string;
  start_time: string;
  end_time?: string;
  is_planned?: boolean;
  cost_impact?: number;
  notes?: string;
}

export interface ProductionRunQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  work_order_id?: string;
  production_line_id?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ProductionRunStats {
  total_runs: number;
  active_runs: number;
  completed_runs: number;
  total_produced: number;
  average_efficiency: number;
  average_quality: number;
  total_downtime_hours: number;
}

// =====================================================
// API Service
// =====================================================

export class ProductionExecutionApiService {
  static async getProductionRuns(
    params?: ProductionRunQueryParams
  ): Promise<{
    production_runs: ProductionRun[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryString = params
      ? '?' + new URLSearchParams(params as any).toString()
      : '';
    
    return makeRequest<{
      production_runs: ProductionRun[];
      total: number;
      page: number;
      limit: number;
    }>(`/factory/production-runs${queryString}`);
  }

  static async getProductionRunById(id: string): Promise<ProductionRun> {
    return makeRequest<ProductionRun>(`/factory/production-runs/${id}`);
  }

  static async createProductionRun(
    data: CreateProductionRunRequest
  ): Promise<ProductionRun> {
    return makeRequest<ProductionRun>('/factory/production-runs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async startProductionRun(
    id: string
  ): Promise<{ success: boolean; message: string }> {
    return makeRequest<{ success: boolean; message: string }>(
      `/factory/production-runs/${id}/start`,
      {
        method: 'POST',
      }
    );
  }

  static async pauseProductionRun(
    id: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    return makeRequest<{ success: boolean; message: string }>(
      `/factory/production-runs/${id}/pause`,
      {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }
    );
  }

  static async completeProductionRun(
    id: string,
    data: CompleteProductionRunRequest
  ): Promise<{ success: boolean; message: string }> {
    return makeRequest<{ success: boolean; message: string }>(
      `/factory/production-runs/${id}/complete`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      }
    );
  }

  static async recordDowntime(
    data: RecordDowntimeRequest
  ): Promise<ProductionDowntime> {
    return makeRequest<ProductionDowntime>('/factory/production-runs/downtime', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getProductionRunStats(): Promise<ProductionRunStats> {
    return makeRequest<ProductionRunStats>('/factory/production-runs/stats');
  }
}

// =====================================================
// Query Keys for React Query
// =====================================================

export const productionExecutionQueryKeys = {
  all: ['production-runs'] as const,
  lists: () => [...productionExecutionQueryKeys.all, 'list'] as const,
  list: (params: ProductionRunQueryParams) =>
    [...productionExecutionQueryKeys.lists(), params] as const,
  details: () => [...productionExecutionQueryKeys.all, 'detail'] as const,
  detail: (id: string) =>
    [...productionExecutionQueryKeys.details(), id] as const,
  stats: () => [...productionExecutionQueryKeys.all, 'stats'] as const,
};

