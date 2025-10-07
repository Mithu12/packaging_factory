import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export interface MaterialAllocation {
  id: string;
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

export class MaterialAllocationsApiService {
  private static getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  static async getAllocations(
    params?: MaterialAllocationQueryParams
  ): Promise<{
    allocations: MaterialAllocation[];
    total: number;
    page: number;
    limit: number;
  }> {
    const response = await axios.get(
      `${API_BASE_URL}/api/factory/material-allocations`,
      {
        params,
        headers: this.getAuthHeaders(),
      }
    );
    return response.data.data;
  }

  static async getAllocationById(id: string): Promise<MaterialAllocation> {
    const response = await axios.get(
      `${API_BASE_URL}/api/factory/material-allocations/${id}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
    return response.data.data;
  }

  static async createAllocation(
    data: CreateMaterialAllocationRequest
  ): Promise<MaterialAllocation> {
    const response = await axios.post(
      `${API_BASE_URL}/api/factory/material-allocations`,
      data,
      {
        headers: this.getAuthHeaders(),
      }
    );
    return response.data.data;
  }

  static async updateAllocation(
    id: string,
    data: UpdateMaterialAllocationRequest
  ): Promise<MaterialAllocation> {
    const response = await axios.put(
      `${API_BASE_URL}/api/factory/material-allocations/${id}`,
      data,
      {
        headers: this.getAuthHeaders(),
      }
    );
    return response.data.data;
  }

  static async returnAllocation(
    id: string,
    notes?: string
  ): Promise<{ success: boolean; message: string }> {
    const response = await axios.post(
      `${API_BASE_URL}/api/factory/material-allocations/${id}/return`,
      { notes },
      {
        headers: this.getAuthHeaders(),
      }
    );
    return response.data.data;
  }

  static async getAllocationStats(): Promise<MaterialAllocationStats> {
    const response = await axios.get(
      `${API_BASE_URL}/api/factory/material-allocations/stats`,
      {
        headers: this.getAuthHeaders(),
      }
    );
    return response.data.data;
  }
}

// Query keys for React Query
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

