// Shared types for all API modules

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// Supplier types
export interface Supplier {
  id: number;
  supplier_code: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  category: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  tax_id: string;
  payment_terms: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierRequest {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  category?: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  tax_id?: string;
  payment_terms?: string;
}

export interface UpdateSupplierRequest {
  name?: string;
  contact_person?: string;
  email: string;
  phone: string;
  category: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  tax_id: string;
  payment_terms: string;
}

export interface SupplierQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'active' | 'inactive';
  sortBy?: 'id' | 'name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface SupplierStats {
  total_suppliers: number;
  active_suppliers: number;
  inactive_suppliers: number;
  recent_suppliers: Supplier[];
}

// Category types
export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
}

export interface CreateSubcategoryRequest {
  category_id: number;
  name: string;
  description?: string;
}

export interface UpdateSubcategoryRequest {
  name?: string;
  description?: string;
}

export interface CategoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'id' | 'name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface SubcategoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  sortBy?: 'id' | 'name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface CategoryStats {
  total_categories: number;
  total_subcategories: number;
  recent_categories: Category[];
  recent_subcategories: Subcategory[];
}

// Product types
export interface Product {
  id: number;
  product_code: string;
  sku: string;
  name: string;
  description?: string;
  category_id: number;
  subcategory_id?: number;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  min_stock_level: number;
  max_stock_level?: number;
  reorder_point?: number;
  supplier_id: number;
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  barcode?: string;
  weight?: number;
  dimensions?: string;
  tax_rate?: number;
  notes?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ProductWithDetails extends Product {
  category: Category;
  subcategory?: Subcategory;
  supplier: Supplier;
}

export interface CreateProductRequest {
  name: string;
  sku: string;
  description?: string;
  category_id: number;
  subcategory_id?: number;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  min_stock_level: number;
  max_stock_level?: number;
  reorder_point?: number;
  supplier_id: number;
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  barcode?: string;
  weight?: number;
  dimensions?: string;
  tax_rate?: number;
  notes?: string;
  image_url?: string;
}

export interface UpdateProductRequest {
  name?: string;
  sku?: string;
  description?: string;
  category_id?: number;
  subcategory_id?: number;
  unit_of_measure?: string;
  cost_price?: number;
  selling_price?: number;
  current_stock?: number;
  min_stock_level?: number;
  max_stock_level?: number;
  reorder_point?: number;
  supplier_id?: number;
  status?: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  barcode?: string;
  weight?: number;
  dimensions?: string;
  tax_rate?: number;
  notes?: string;
  image_url?: string;
}

export interface ProductQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  subcategory_id?: number;
  supplier_id?: number;
  status?: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  low_stock?: boolean;
  sortBy?: 'id' | 'name' | 'sku' | 'cost_price' | 'selling_price' | 'current_stock' | 'created_at' | 'updated_at';
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

export interface StockAdjustmentRequest {
  product_id: number;
  adjustment_type: 'increase' | 'decrease' | 'set';
  quantity: number;
  reason: string;
  reference?: string;
  notes?: string;
}

// Stock Adjustment types
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
  product_name?: string
  product_sku?: string
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
