// Pre-Production Manual Entry types

export type PreProductionType =
  | "printing"
  | "corrugation_media"
  | "corrugation_liner";

export interface PreProductionManualEntry {
  id: number;
  entry_number: string;
  production_type: PreProductionType;
  raw_material_id: number;
  raw_material_name?: string;
  raw_material_sku?: string;
  raw_consumed_quantity: number;
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

export interface CreatePreProductionEntryRequest {
  production_type: PreProductionType;
  raw_material_id: number;
  raw_consumed_quantity: number;
  finished_product_id: number;
  finished_produced_quantity: number;
  distribution_center_id?: number;
  notes?: string;
}

export interface PreProductionEntryQueryParams {
  page?: number;
  limit?: number;
  production_type?: PreProductionType;
  distribution_center_id?: number;
}
