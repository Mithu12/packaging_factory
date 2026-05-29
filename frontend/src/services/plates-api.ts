// =====================================================
// Plates Frontend API Service
// Tracks physical printing plates, their usage, and unpredictable breakage.
// =====================================================

import { makeRequest } from '@/services/api-utils';

// =====================================================
// Types
// =====================================================

export type PlateStatus = 'active' | 'broken' | 'retired';
export type PlateUseOutcome = 'used' | 'broke';

export interface PlateType {
  id: string;
  name: string;
  code?: string;
  description?: string;
  expected_lifespan_uses?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  // Lifespan analytics
  plate_count?: number;
  active_count?: number;
  broken_count?: number;
  avg_uses_at_break?: number;
  min_uses_at_break?: number;
  max_uses_at_break?: number;
}

export interface Plate {
  id: string;
  plate_type_id: string;
  plate_type_name?: string;
  plate_code?: string;
  total_uses: number;
  status: PlateStatus;
  broke_at_use_count?: number;
  broken_at?: string;
  broken_reason?: string;
  expected_lifespan_uses?: number;
  factory_id?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface ProductionRunPlate {
  id: string;
  production_run_id: string;
  plate_id: string;
  plate_code?: string;
  plate_type_name?: string;
  outcome: PlateUseOutcome;
  use_number?: number;
  used_at?: string;
  notes?: string;
  created_at: string;
  run_number?: string;
}

export interface CreatePlateTypeRequest {
  name: string;
  code?: string;
  description?: string;
  expected_lifespan_uses?: number;
}

export interface UpdatePlateTypeRequest {
  name?: string;
  code?: string | null;
  description?: string | null;
  expected_lifespan_uses?: number | null;
  is_active?: boolean;
}

export interface CreatePlateRequest {
  plate_type_id: number;
  plate_code?: string;
  expected_lifespan_uses?: number;
  factory_id?: number;
  notes?: string;
}

export interface UpdatePlateRequest {
  plate_type_id?: number;
  plate_code?: string | null;
  status?: PlateStatus;
  broken_reason?: string | null;
  expected_lifespan_uses?: number | null;
  factory_id?: number | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface PlateQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: PlateStatus;
  plate_type_id?: number;
  factory_id?: number;
  is_active?: boolean;
  sort_by?: 'plate_code' | 'total_uses' | 'status' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface PlatesListResult {
  plates: Plate[];
  total: number;
  page: number;
  totalPages: number;
}

// =====================================================
// API Service
// =====================================================

export class PlatesApiService {
  // ---------------- Plate Types ----------------

  static async getPlateTypes(includeStats = true): Promise<PlateType[]> {
    return makeRequest<PlateType[]>(
      `/factory/plates/types${includeStats ? '' : '?stats=false'}`
    );
  }

  static async createPlateType(data: CreatePlateTypeRequest): Promise<PlateType> {
    return makeRequest<PlateType>('/factory/plates/types', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updatePlateType(
    id: string,
    data: UpdatePlateTypeRequest
  ): Promise<PlateType> {
    return makeRequest<PlateType>(`/factory/plates/types/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deletePlateType(id: string): Promise<{ deleted: boolean }> {
    return makeRequest<{ deleted: boolean }>(`/factory/plates/types/${id}`, {
      method: 'DELETE',
    });
  }

  static async getLifespanStats(): Promise<PlateType[]> {
    return makeRequest<PlateType[]>('/factory/plates/stats');
  }

  // ---------------- Plates ----------------

  static async getPlates(params?: PlateQueryParams): Promise<PlatesListResult> {
    let queryString = '';
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        searchParams.append(key, String(value));
      });
      const serialized = searchParams.toString();
      if (serialized) queryString = `?${serialized}`;
    }
    return makeRequest<PlatesListResult>(`/factory/plates${queryString}`);
  }

  static async getPlateById(id: string): Promise<Plate> {
    return makeRequest<Plate>(`/factory/plates/${id}`);
  }

  static async createPlate(data: CreatePlateRequest): Promise<Plate> {
    return makeRequest<Plate>('/factory/plates', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async updatePlate(id: string, data: UpdatePlateRequest): Promise<Plate> {
    return makeRequest<Plate>(`/factory/plates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  static async deletePlate(id: string): Promise<{ deleted: boolean }> {
    return makeRequest<{ deleted: boolean }>(`/factory/plates/${id}`, {
      method: 'DELETE',
    });
  }

  static async getPlateUsageHistory(id: string): Promise<ProductionRunPlate[]> {
    return makeRequest<ProductionRunPlate[]>(`/factory/plates/${id}/usage`);
  }
}

// =====================================================
// Query Keys for React Query
// =====================================================

export const platesQueryKeys = {
  all: ['plates'] as const,
  lists: () => [...platesQueryKeys.all, 'list'] as const,
  list: (params?: PlateQueryParams) => [...platesQueryKeys.lists(), params] as const,
  detail: (id: string) => [...platesQueryKeys.all, 'detail', id] as const,
  usage: (id: string) => [...platesQueryKeys.all, 'usage', id] as const,
  types: () => [...platesQueryKeys.all, 'types'] as const,
  stats: () => [...platesQueryKeys.all, 'stats'] as const,
};
