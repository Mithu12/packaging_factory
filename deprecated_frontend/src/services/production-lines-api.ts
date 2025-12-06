import { makeRequest } from '@/services/api-utils';

// Production Line Types
export interface ProductionLine {
  id: string;
  name: string;
  code: string;
  description?: string;
  capacity: number;
  current_load: number;
  status: 'available' | 'busy' | 'maintenance' | 'offline';
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  factory_name?: string;
}

export interface CreateProductionLineRequest {
  name: string;
  code: string;
  description?: string;
  capacity: number;
  location?: string;
}

export interface UpdateProductionLineRequest {
  name?: string;
  code?: string;
  description?: string;
  capacity?: number;
  location?: string;
  status?: 'available' | 'busy' | 'maintenance' | 'offline';
  is_active?: boolean;
}

export interface ProductionLineStats {
  total_lines: number;
  available_lines: number;
  busy_lines: number;
  maintenance_lines: number;
  offline_lines: number;
  total_capacity: number;
  current_load: number;
  utilization_rate: number;
}

export interface ProductionLineQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  is_active?: boolean;
  factory_id?: number;
  sort_by?: 'name' | 'code' | 'capacity' | 'current_load' | 'status' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

// API Service Class
export class ProductionLinesApiService {
  private static readonly BASE_URL = '/factory/production-lines';

  // =====================================================
  // Production Line CRUD Operations
  // =====================================================

  // Get all production lines with pagination and filtering
  static async getProductionLines(params?: ProductionLineQueryParams): Promise<{
    production_lines: ProductionLine[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';

    return makeRequest<{
      production_lines: ProductionLine[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`${this.BASE_URL}${queryString}`);
  }

  // Get production line by ID
  static async getProductionLineById(id: string): Promise<ProductionLine> {
    return makeRequest<ProductionLine>(`${this.BASE_URL}/${id}`);
  }

  // Create new production line
  static async createProductionLine(data: CreateProductionLineRequest): Promise<ProductionLine> {
    return makeRequest<ProductionLine>(this.BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update production line
  static async updateProductionLine(
    id: string,
    data: UpdateProductionLineRequest
  ): Promise<ProductionLine> {
    return makeRequest<ProductionLine>(`${this.BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete production line
  static async deleteProductionLine(id: string): Promise<{ deleted: boolean }> {
    return makeRequest<{ deleted: boolean }>(`${this.BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  }

  // Update production line load
  static async updateProductionLineLoad(
    id: string,
    load_change: number
  ): Promise<ProductionLine> {
    return makeRequest<ProductionLine>(`${this.BASE_URL}/${id}/load`, {
      method: 'PATCH',
      body: JSON.stringify({ load_change }),
    });
  }

  // Get production line statistics
  static async getProductionLineStats(factory_id?: number): Promise<ProductionLineStats> {
    const queryString = factory_id ? `?factory_id=${factory_id}` : '';
    return makeRequest<ProductionLineStats>(`${this.BASE_URL}/stats${queryString}`);
  }
}

// =====================================================
// React Query Keys
// =====================================================

export const productionLinesQueryKeys = {
  all: ['production-lines'] as const,
  lists: () => [...productionLinesQueryKeys.all, 'list'] as const,
  list: (params?: ProductionLineQueryParams) => [...productionLinesQueryKeys.lists(), params] as const,
  details: () => [...productionLinesQueryKeys.all, 'detail'] as const,
  detail: (id: string) => [...productionLinesQueryKeys.details(), id] as const,
  stats: () => [...productionLinesQueryKeys.all, 'stats'] as const,
};
