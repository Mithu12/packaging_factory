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
  consumed_rolls: number;
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
  consumed_rolls?: number;
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

export interface FinishedProductFilterResult {
  products: PreProductionProductOption[];
  /** True when the products are tagged with the production type's sub-category. */
  matchesSubcategory: boolean;
}

const normalizeName = (value?: string | null) => (value ?? '').trim().toLowerCase();

/**
 * Pick the Ready Raw Materials to offer as the finished product for a
 * production type. Prefer products tagged with the matching sub-category;
 * otherwise fall back to products not claimed by a sibling production type
 * (untagged or tagged with an unrelated sub-category such as
 * "Pre-Production (Corrugation)"), and as a last resort show everything —
 * an empty dropdown makes the form unusable.
 */
export function filterPreProductionFinished(
  products: PreProductionProductOption[],
  productionType: PreProductionType
): FinishedProductFilterResult {
  const wanted = normalizeName(PRODUCTION_TYPE_SUBCATEGORY[productionType]);
  const tagged = products.filter((p) => normalizeName(p.subcategory_name) === wanted);
  if (tagged.length > 0) return { products: tagged, matchesSubcategory: true };

  const siblingTags = Object.values(PRODUCTION_TYPE_SUBCATEGORY).map(normalizeName);
  const unclaimed = products.filter(
    (p) => !siblingTags.includes(normalizeName(p.subcategory_name))
  );
  return {
    products: unclaimed.length > 0 ? unclaimed : products,
    matchesSubcategory: false,
  };
}

export default PreProductionApiService;
