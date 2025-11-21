// Supplier Types
export interface Supplier {
  id: number;
  supplier_code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  whatsapp_number?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  category?: string;
  tax_id?: string;
  vat_id?: string;
  payment_terms?: string;
  bank_name?: string;
  bank_account?: string;
  bank_routing?: string;
  swift_code?: string;
  iban?: string;
  status: 'active' | 'inactive';
  rating: number;
  total_orders: number;
  last_order_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateSupplierRequest {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  whatsapp_number?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  category?: string;
  tax_id?: string;
  vat_id?: string;
  payment_terms?: string;
  bank_name?: string;
  bank_account?: string;
  bank_routing?: string;
  swift_code?: string;
  iban?: string;
  status?: 'active' | 'inactive';
  notes?: string;
}

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {
  rating?: number;
  total_orders?: number;
  last_order_date?: string;
}

// Product Types
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
    reserved_stock: number;
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

// Category Types
export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  subcategories?: Subcategory[];
}

export interface Subcategory {
  id: number;
  name: string;
  description?: string;
  category_id: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryRequest {
  name: string;
  description?: string;
}

export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {}

export interface CreateSubcategoryRequest {
  name: string;
  description?: string;
  category_id: number;
}

export interface UpdateSubcategoryRequest extends Partial<CreateSubcategoryRequest> {}

// Stats Types
export interface SupplierStats {
  total_suppliers: number;
  active_suppliers: number;
  inactive_suppliers: number;
  categories_count: number;
  average_rating: number;
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

export interface CategoryStats {
  total_categories: number;
  total_subcategories: number;
  categories_with_subcategories: number;
  average_subcategories_per_category: number;
}

// Stock Adjustment Types
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
  product_name?: string;
  product_sku?: string;
}

// Brand Types
export interface Brand {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  product_count?: number;
}

// Purchase Order Types
export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  supplier_name?: string;
  order_date: string;
  expected_delivery_date: string;
  total_amount: number;
  currency: string;
  status: 'draft' | 'pending' | 'approved' | 'received' | 'partially_received' | 'cancelled';
  approval_status?: 'draft' | 'submitted' | 'approved' | 'rejected';
  approved_by?: string;
  priority: 'low' | 'normal' | 'high';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePurchaseOrderRequest {
  supplier_id: number;
  order_date: string;
  expected_delivery_date: string;
  total_amount: number;
  currency: string;
  priority?: 'low' | 'normal' | 'high';
  notes?: string;
}

export interface UpdatePurchaseOrderStatusRequest {
  status: 'pending' | 'approved' | 'received' | 'partially_received' | 'cancelled';
  notes?: string;
}

export interface PurchaseOrderStats {
  total_orders: number;
  draft_orders: number;
  pending_orders: number;
  approved_orders: number;
  received_orders: number;
  orders_this_month: number;
  total_value: number;
}
