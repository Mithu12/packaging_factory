export interface StockAdjustment {
  id: number
  product_id: number
  adjustment_type: 'increase' | 'decrease' | 'set'
  quantity: number
  previous_stock: number
  new_stock: number
  reason: string
  reference?: string
  notes?: string
  adjusted_by?: string
  created_at: string
}

export type StockAdjustmentMode = 'units' | 'uses'

export interface CreateStockAdjustmentRequest {
  product_id: number
  adjustment_type: 'increase' | 'decrease' | 'set'
  quantity: number
  reason: string
  reference?: string
  notes?: string
  adjusted_by?: string
  /** For reusable products: 'uses' consumes the active unit's remaining uses; 'units' (default) changes physical stock. */
  adjustment_mode?: StockAdjustmentMode
}

export interface StockAdjustmentQueryParams {
  product_id?: number
  adjustment_type?: 'increase' | 'decrease' | 'set'
  limit?: number
  offset?: number
  start_date?: string
  end_date?: string
}

export interface StockAdjustmentStats {
  total_adjustments: number
  total_increases: number
  total_decreases: number
  total_quantity_adjusted: number
  recent_adjustments: StockAdjustment[]
}
