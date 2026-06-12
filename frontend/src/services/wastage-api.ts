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
  status: 'pending' | 'approved' | 'rejected' | 'sold';
  wastage_sale_id?: number | null;
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
  recovered_value: number;
}

export interface WastageSaleItem {
  id: number;
  material_name: string;
  quantity: number;
  cost: number;
}

export interface WastageSale {
  id: number;
  sale_number: string;
  buyer_name: string;
  buyer_phone?: string;
  total_amount: number;
  payment_method: 'cash' | 'bank_transfer';
  payment_reference?: string;
  sale_date: string;
  notes?: string;
  voucher_id?: number | null;
  sold_by: number;
  sold_by_name?: string;
  items: WastageSaleItem[];
  created_at: string;
}

export interface CreateWastageSalePayload {
  wastage_ids: number[];
  buyer_name: string;
  buyer_phone?: string;
  total_amount: number;
  payment_method: 'cash' | 'bank_transfer';
  payment_reference?: string;
  notes?: string;
}

export interface CreateWastagePayload {
  material_id: string;
  quantity: number;
  wastage_reason: string;
  work_order_id?: string;
  batch_number?: string;
  notes?: string;
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
    let queryString = '';

    if (params) {
      const searchParams = new URLSearchParams();

      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          return;
        }

        searchParams.append(key, String(value));
      });

      const serialized = searchParams.toString();
      if (serialized) {
        queryString = `?${serialized}`;
      }
    }
    
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

  static async createWastage(payload: CreateWastagePayload): Promise<MaterialWastage> {
    return makeRequest<MaterialWastage>('/factory/wastage', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
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

  static async createWastageSale(payload: CreateWastageSalePayload): Promise<WastageSale> {
    return makeRequest<WastageSale>('/factory/wastage/sales', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  static async getWastageSales(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{
    sales: WastageSale[];
    total: number;
    page: number;
    limit: number;
  }> {
    const searchParams = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return;
      searchParams.append(key, String(value));
    });
    const serialized = searchParams.toString();

    return makeRequest<{
      sales: WastageSale[];
      total: number;
      page: number;
      limit: number;
    }>(`/factory/wastage/sales${serialized ? `?${serialized}` : ''}`);
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
  sales: () => [...wastageQueryKeys.all, 'sales'] as const,
};

