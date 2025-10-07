// =====================================================
// Material Consumptions Frontend API Service
// =====================================================

import { makeRequest } from '@/services/api-utils';

// =====================================================
// Types
// =====================================================

export interface MaterialConsumption {
  id: string;
  work_order_requirement_id: string;
  work_order_id: string;
  work_order_number: string;
  material_id: string;
  material_name: string;
  material_sku: string;
  consumed_quantity: number;
  wastage_quantity: number;
  wastage_reason?: string;
  unit_of_measure: string;
  consumption_date: string;
  production_line_id?: string;
  operator_id?: string;
  batch_number?: string;
  consumed_by: number;
  consumed_by_name?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateMaterialConsumptionRequest {
  work_order_requirement_id: string;
  material_id: string;
  consumed_quantity: number;
  wastage_quantity?: number;
  wastage_reason?: string;
  consumption_date: string;
  production_line_id?: string;
  operator_id?: string;
  batch_number?: string;
  notes?: string;
}

export interface MaterialConsumptionQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  work_order_id?: string;
  production_line_id?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface MaterialConsumptionStats {
  total_consumptions: number;
  total_materials_consumed: number;
  total_wastage: number;
  average_wastage_percentage: number;
  total_consumption_value: number;
}

// =====================================================
// API Service
// =====================================================

export class MaterialConsumptionsApiService {
  static async getConsumptions(
    params?: MaterialConsumptionQueryParams
  ): Promise<{
    consumptions: MaterialConsumption[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryString = params
      ? '?' + new URLSearchParams(params as any).toString()
      : '';
    
    return makeRequest<{
      consumptions: MaterialConsumption[];
      total: number;
      page: number;
      limit: number;
    }>(`/factory/material-consumptions${queryString}`);
  }

  static async getConsumptionById(id: string): Promise<MaterialConsumption> {
    return makeRequest<MaterialConsumption>(`/factory/material-consumptions/${id}`);
  }

  static async createConsumption(
    data: CreateMaterialConsumptionRequest
  ): Promise<MaterialConsumption> {
    return makeRequest<MaterialConsumption>('/factory/material-consumptions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async getConsumptionStats(): Promise<MaterialConsumptionStats> {
    return makeRequest<MaterialConsumptionStats>('/factory/material-consumptions/stats');
  }
}

// =====================================================
// Query Keys for React Query
// =====================================================

export const materialConsumptionsQueryKeys = {
  all: ['material-consumptions'] as const,
  lists: () => [...materialConsumptionsQueryKeys.all, 'list'] as const,
  list: (params: MaterialConsumptionQueryParams) =>
    [...materialConsumptionsQueryKeys.lists(), params] as const,
  details: () => [...materialConsumptionsQueryKeys.all, 'detail'] as const,
  detail: (id: string) =>
    [...materialConsumptionsQueryKeys.details(), id] as const,
  stats: () => [...materialConsumptionsQueryKeys.all, 'stats'] as const,
};

