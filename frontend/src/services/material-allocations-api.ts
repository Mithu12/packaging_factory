// =====================================================
// Material Allocations Frontend API Service
// =====================================================

import { makeRequest } from '@/services/api-utils';

// =====================================================
// Types
// =====================================================

export interface MaterialAllocation {
  id: number;
  work_order_requirement_id: string;
  inventory_item_id: number;
  material_name: string;
  material_sku: string;
  allocated_quantity: number;
  allocated_from_location: string;
  allocated_date: string;
  allocated_by: number;
  allocated_by_name?: string;
  status: 'allocated' | 'consumed' | 'returned' | 'short';
  expiry_date?: string;
  batch_number?: string;
  notes?: string;
  unit_of_measure: string;
  work_order_id: string;
  work_order_number: string;
  created_at: string;
  updated_at?: string;
}

export interface CreateMaterialAllocationRequest {
  work_order_requirement_id: string;
  inventory_item_id: number;
  allocated_quantity: number;
  allocated_from_location: string;
  expiry_date?: string;
  batch_number?: string;
  notes?: string;
}

export interface UpdateMaterialAllocationRequest {
  allocated_quantity?: number;
  allocated_from_location?: string;
  expiry_date?: string;
  batch_number?: string;
  notes?: string;
  status?: 'allocated' | 'consumed' | 'returned' | 'short';
}

export interface MaterialAllocationQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  work_order_id?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface MaterialAllocationStats {
  total_allocations: number;
  active_allocations: number;
  consumed_allocations: number;
  returned_allocations: number;
  total_value: number;
  average_allocation_time: number;
  on_time_allocation: number;
  allocation_efficiency: number;
}

// =====================================================
// API Service
// =====================================================

export class MaterialAllocationsApiService {
  static async getAllocations(
    params?: MaterialAllocationQueryParams
  ): Promise<{
    allocations: MaterialAllocation[];
    total: number;
    page: number;
    limit: number;
  }> {
    const queryString = params
      ? '?' + new URLSearchParams(params as any).toString()
      : '';
    
    return makeRequest<{
      allocations: MaterialAllocation[];
      total: number;
      page: number;
      limit: number;
    }>(`/factory/material-allocations${queryString}`);
  }

  static async getAllocationById(id: string): Promise<MaterialAllocation> {
    return makeRequest<MaterialAllocation>(`/factory/material-allocations/${id}`);
  }

  static async createAllocation(
    data: CreateMaterialAllocationRequest
  ): Promise<MaterialAllocation> {
    return makeRequest<MaterialAllocation>('/factory/material-allocations', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updateAllocation(
    id: string,
    data: UpdateMaterialAllocationRequest
  ): Promise<MaterialAllocation> {
    return makeRequest<MaterialAllocation>(`/factory/material-allocations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async returnAllocation(
    id: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    return makeRequest<{ success: boolean; message: string }>(
      `/factory/material-allocations/${id}/return`,
      {
        method: 'POST',
        body: JSON.stringify({ notes }),
      }
    );
  }

  static async getAllocationStats(): Promise<MaterialAllocationStats> {
    return makeRequest<MaterialAllocationStats>('/factory/material-allocations/stats');
  }
}

// =====================================================
// Query Keys for React Query
// =====================================================

export const materialAllocationsQueryKeys = {
  all: ['material-allocations'] as const,
  lists: () => [...materialAllocationsQueryKeys.all, 'list'] as const,
  list: (params: MaterialAllocationQueryParams) =>
    [...materialAllocationsQueryKeys.lists(), params] as const,
  details: () => [...materialAllocationsQueryKeys.all, 'detail'] as const,
  detail: (id: string) =>
    [...materialAllocationsQueryKeys.details(), id] as const,
  stats: () => [...materialAllocationsQueryKeys.all, 'stats'] as const,
};
