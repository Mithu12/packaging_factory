// =====================================================
// Material Wastage Frontend API Service
// =====================================================

import { makeRequest } from '@/services/api-utils';

// =====================================================
// Types
// =====================================================

export interface MaterialWastage {
  id: number;
  work_order_id: string;
  work_order_number: string;
  material_id: string;
  material_name: string;
  material_sku: string;
  quantity: number;
  unit_of_measure: string;
  wastage_reason: string;
  cost: number;
  recorded_date: string;
  recorded_by: number;
  recorded_by_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: number;
  approved_by_name?: string;
  approved_date?: string;
  batch_number?: string;
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface MaterialWastageQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  work_order_id?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface WastageStats {
  total_wastage: number;
  pending_approvals: number;
  total_cost: number;
  average_wastage: number;
  top_reason: string;
  monthly_trend: number;
}

// =====================================================
// API Service
// =====================================================

export class WastageApiService {
  static async getWastageRecords(
    params?: MaterialWastageQueryParams
  ): Promise<{
    wastage_records: MaterialWastage[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryString = params
      ? '?' + new URLSearchParams(params as any).toString()
      : '';
    
    return makeRequest<{
      wastage_records: MaterialWastage[];
      total: number;
      page: number;
      limit: number;
    }>(`/factory/wastage${queryString}`);
  }

  static async getWastageById(id: string): Promise<MaterialWastage> {
    return makeRequest<MaterialWastage>(`/factory/wastage/${id}`);
  }

  static async approveWastage(
    id: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    return makeRequest<{ success: boolean; message: string }>(
      `/factory/wastage/${id}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }
    );
  }

  static async rejectWastage(
    id: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    return makeRequest<{ success: boolean; message: string }>(
      `/factory/wastage/${id}/reject`,
      {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }
    );
  }

  static async getWastageStats(): Promise<WastageStats> {
    return makeRequest<WastageStats>('/factory/wastage/stats');
  }
}

// =====================================================
// Query Keys for React Query
// =====================================================

export const wastageQueryKeys = {
  all: ['wastage'] as const,
  lists: () => [...wastageQueryKeys.all, 'list'] as const,
  list: (params: MaterialWastageQueryParams) =>
    [...wastageQueryKeys.lists(), params] as const,
  details: () => [...wastageQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...wastageQueryKeys.details(), id] as const,
  stats: () => [...wastageQueryKeys.all, 'stats'] as const,
};

