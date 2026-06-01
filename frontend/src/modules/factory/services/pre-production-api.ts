// =====================================================
// Pre-Production Manual Entry API Service
// =====================================================

import { makeRequest } from '@/services/api-utils';

export type PreProductionType =
  | 'printing'
  | 'corrugation_media'
  | 'corrugation_liner';

export interface PreProductionMaterial {
  raw_material_id: number;
  raw_material_name?: string;
  raw_material_sku?: string;
  consumed_quantity: number;
}

export interface PreProductionManualEntry {
  id: number;
  entry_number: string;
  production_type: PreProductionType;
  raw_materials: PreProductionMaterial[];
  finished_product_id: number;
  finished_product_name?: string;
  finished_product_sku?: string;
  finished_produced_quantity: number;
  distribution_center_id?: number | null;
  distribution_center_name?: string | null;
  stock_adjustment_batch_id?: number | null;
  notes?: string | null;
  created_by?: number | null;
  created_by_name?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface CreatePreProductionMaterialInput {
  raw_material_id: number;
  consumed_quantity: number;
}

export interface CreatePreProductionEntryRequest {
  production_type: PreProductionType;
  raw_materials: CreatePreProductionMaterialInput[];
  finished_product_id: number;
  finished_produced_quantity: number;
  distribution_center_id?: number;
  notes?: string;
}

export interface PreProductionEntryListResponse {
  entries: PreProductionManualEntry[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/** Product option used by the manual-entry dropdowns. */
export interface PreProductionProductOption {
  id: number;
  sku: string;
  name: string;
  unit_of_measure?: string;
  cost_price?: number;
  current_stock?: number;
  category_name?: string;
  subcategory_id?: number | null;
  subcategory_name?: string | null;
  brand_id?: number | null;
  brand_name?: string | null;
}

export class PreProductionApiService {
  private static readonly BASE_URL = '/factory/pre-production-entries';

  static async createEntry(
    data: CreatePreProductionEntryRequest
  ): Promise<PreProductionManualEntry> {
    return makeRequest<PreProductionManualEntry>(this.BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static async listEntries(params?: {
    page?: number;
    limit?: number;
    production_type?: PreProductionType;
    distribution_center_id?: number;
  }): Promise<PreProductionEntryListResponse> {
    const queryString = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params).reduce((acc, [key, value]) => {
            if (value !== undefined && value !== null) acc[key] = String(value);
            return acc;
          }, {} as Record<string, string>)
        ).toString()
      : '';
    return makeRequest<PreProductionEntryListResponse>(`${this.BASE_URL}${queryString}`);
  }

  /** Ready Raw Materials with subcategory (Printing / Media / Liner). */
  static async getFinishedProducts(): Promise<PreProductionProductOption[]> {
    return makeRequest<PreProductionProductOption[]>(
      '/factory/products/pre-production-finished'
    );
  }

  /** Raw Materials with brand info (paper brands). */
  static async getRawMaterialProducts(): Promise<PreProductionProductOption[]> {
    return makeRequest<PreProductionProductOption[]>('/factory/products/raw-materials');
  }
}

/** Maps a production type to the Ready Raw Material subcategory used for filtering. */
export const PRODUCTION_TYPE_SUBCATEGORY: Record<PreProductionType, string> = {
  printing: 'Printing',
  corrugation_media: 'Media',
  corrugation_liner: 'Liner',
};

export const PRODUCTION_TYPE_LABEL: Record<PreProductionType, string> = {
  printing: 'Printing',
  corrugation_media: 'Corrugation — Media',
  corrugation_liner: 'Corrugation — Liner',
};

export default PreProductionApiService;
