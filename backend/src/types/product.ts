export interface Product {
  id: number;
  product_code: string;
  sku: string;
  name: string;
  description?: string;
  category_id: number;
  subcategory_id?: number;
  brand_id?: number;
  origin_id?: number;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  min_stock_level: number;
  max_stock_level?: number;
  supplier_id: number;
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  barcode?: string;
  weight?: number;
  dimensions?: string;
  tax_rate?: number;
  warranty_period?: number;
  service_time?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  notes?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  category_name?: string;
  subcategory_name?: string;
  brand_name?: string;
  origin_name?: string;
  supplier_name?: string;
}

export interface CreateProductRequest {
  sku: string;
  name: string;
  description?: string;
  category_id: number;
  subcategory_id?: number;
  brand_id?: number;
  origin_id?: number;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  min_stock_level: number;
  max_stock_level?: number;
  supplier_id: number;
  status?: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  barcode?: string;
  weight?: number;
  dimensions?: string;
  tax_rate?: number;
  warranty_period?: number;
  service_time?: number;
  reorder_point?: number;
  reorder_quantity?: number;
  notes?: string;
  image_url?: string;
}

export interface UpdateProductRequest extends Partial<CreateProductRequest> {}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  subcategory_id?: number;
  brand_id?: number;
  origin_id?: number;
  supplier_id?: number;
  status?: string;
  low_stock?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ProductStats {
  total_products: number;
  active_products: number;
  inactive_products: number;
  discontinued_products: number;
  out_of_stock_products: number;
  low_stock_products: number;
  total_inventory_value: number;
  average_cost_price: number;
  average_selling_price: number;
  categories_count: number;
  suppliers_count: number;
}

export interface ProductWithDetails extends Product {
  category: {
    id: number;
    name: string;
  };
  subcategory?: {
    id: number;
    name: string;
  };
  brand?: {
    id: number;
    name: string;
  };
  origin?: {
    id: number;
    name: string;
  };
  supplier: {
    id: number;
    name: string;
    supplier_code: string;
  };
}

export interface StockAdjustmentRequest {
  product_id: number;
  adjustment_type: 'increase' | 'decrease' | 'set';
  quantity: number;
  reason: string;
  reference?: string;
  notes?: string;
}

export interface StockAdjustment {
  id: number;
  product_id: number;
  adjustment_type: 'increase' | 'decrease' | 'set';
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  reference?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  // Joined fields
  product_name?: string;
  product_sku?: string;
}
