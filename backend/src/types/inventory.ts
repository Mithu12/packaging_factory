export interface InventoryItem {
  id: number;
  product_name: string;
  product_sku: string;
  category_name: string;
  subcategory_name?: string;
  supplier_name: string;
  current_stock: number;
  min_stock_level: number;
  max_stock_level?: number;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  wholesale_price?: number;
  total_value: number;
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  last_movement_date?: string;
  last_movement_type?: 'receipt' | 'issue' | 'adjustment' | 'transfer';
  location?: string;
  reserved_stock?: number;
  available_stock?: number;
}

export interface StockMovement {
  id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  movement_type: 'receipt' | 'issue' | 'adjustment' | 'transfer';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  reference?: string;
  notes?: string;
  user_name?: string;
  created_at: string;
  // Additional fields for different movement types
  supplier_name?: string;
  purchase_order_number?: string;
  sales_order_number?: string;
  adjustment_id?: number;
  from_location?: string;
  to_location?: string;
}

export interface InventoryStats {
  total_inventory_value: number;
  total_products: number;
  low_stock_items: number;
  critical_stock_items: number;
  out_of_stock_items: number;
  overstock_items: number;
  total_locations: number;
  recent_movements_count: number;
  monthly_movement_trend: {
    month: string;
    receipts: number;
    issues: number;
    adjustments: number;
  }[];
}

export interface InventoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  subcategory_id?: number;
  supplier_id?: number;
  status?: string;
  stock_status?: 'low' | 'critical' | 'optimal' | 'overstock' | 'out_of_stock';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface StockMovementQueryParams {
  product_id?: number;
  movement_type?: 'receipt' | 'issue' | 'adjustment' | 'transfer';
  start_date?: string;
  end_date?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InventoryLocation {
  id: number;
  name: string;
  description?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateInventoryLocationRequest {
  name: string;
  description?: string;
  address?: string;
}

export interface UpdateInventoryLocationRequest extends Partial<CreateInventoryLocationRequest> {
  is_active?: boolean;
}
