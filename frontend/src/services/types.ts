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
  whatsapp_number?: string;
  category: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  notes: string;
  postal_code: string;
  country: string;
  tax_id: string;
  payment_terms: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  bank_name: string;
  bank_account: string;
  swift_code: string;
  bank_routing: string;
  iban: string;
  rating: string;
  total_orders: string;
  last_order_date: string;
}

export interface CreateSupplierRequest {
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  whatsapp_number?: string;
  website?: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  tax_id?: string;
  vat_id?: string;
  payment_terms?: string;
  bank_name?: string;
  bank_account?: string;
  bank_routing?: string;
  swift_code?: string;
  iban?: string;
  notes?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateSupplierRequest {
  name?: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  whatsapp_number?: string;
  website?: string;
  category?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  tax_id?: string;
  vat_id?: string;
  payment_terms?: string;
  bank_name?: string;
  bank_account?: string;
  bank_routing?: string;
  swift_code?: string;
  iban?: string;
  notes?: string;
  status?: 'active' | 'inactive';
  rating?: number;
  total_orders?: number;
  last_order_date?: string;
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

// Brand types
export interface Brand {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
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
  brand_id?: number;
  origin_id?: number;
  unit_of_measure: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
  min_stock_level: number;
  max_stock_level?: number;
  reorder_point?: number;
  reserved_stock?: number;
  supplier_id: number;
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  barcode?: string;
  weight?: number;
  dimensions?: string;
  tax_rate?: number;
  warranty_period?: number;
  service_time?: number;
  supplier_name?: number;
  subcategory_name?: number;
  brand_name?: string;
  origin_name?: string;
  notes?: string;
  image_url?: string;
  category_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Origin {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
}

export interface ProductWithDetails extends Product {
  category: Category;
  subcategory?: Subcategory;
  brand?: Brand;
  origin?: Origin;
  supplier: Supplier;
}

export interface CreateProductRequest {
  name: string;
  sku: string;
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
  reorder_point?: number;
  supplier_id: number;
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock';
  barcode?: string;
  weight?: number;
  dimensions?: string;
  tax_rate?: number;
  warranty_period?: number;
  service_time?: number;
  notes?: string;
  image_url?: string;
}

export interface UpdateProductRequest {
  name?: string;
  sku?: string;
  description?: string;
  category_id?: number;
  subcategory_id?: number;
  brand_id?: number;
  origin_id?: number;
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
  brand_id?: number;
  origin_id?: number;
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
  distribution_center_id?: number;
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

// Purchase Order types
export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  order_date: string;
  expected_delivery_date: string;
  actual_delivery_date?: string;
  status: 'draft' | 'pending' | 'approved' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  total_amount: number;
  currency: string;
  payment_terms: string;
  delivery_terms: string;
  department?: string;
  project?: string;
  notes?: string;
  created_by: string;
  approved_by?: string;
  approved_date?: string;
  // New approval fields
  submitted_at?: string;
  submitted_by?: number;
  approved_at?: string;
  approved_by_id?: number;
  approval_status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approval_notes?: string;
  created_at: string;
  updated_at: string;
  supplier_name?: string;
}

export interface PurchaseOrderLineItem {
  id: number;
  purchase_order_id: number;
  product_id: number;
  product_sku: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  received_quantity: number;
  pending_quantity: number;
  unit_of_measure: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderWithDetails extends PurchaseOrder {
  supplier_name: string;
  supplier_code: string;
  supplier_contact: string;
  supplier_email: string;
  supplier_phone: string;
  supplier_address: string;
  line_items: PurchaseOrderLineItem[];
  timeline: PurchaseOrderTimeline[];
}

export interface PurchaseOrderTimeline {
  id: number;
  purchase_order_id: number;
  event: string;
  description?: string;
  user: string;
  status: 'completed' | 'pending' | 'cancelled';
  created_at: string;
}

export interface CreatePurchaseOrderRequest {
  supplier_id: number;
  expected_delivery_date: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  payment_terms?: string;
  delivery_terms?: string;
  department?: string;
  project?: string;
  notes?: string;
  line_items: CreatePurchaseOrderLineItemRequest[];
}

export interface CreatePurchaseOrderLineItemRequest {
  product_id: number;
  quantity: number;
  unit_price: number;
  description?: string;
}

export interface UpdatePurchaseOrderRequest {
  supplier_id?: number;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  payment_terms?: string;
  delivery_terms?: string;
  department?: string;
  project?: string;
  notes?: string;
  line_items?: UpdatePurchaseOrderLineItemRequest[];
}

export interface UpdatePurchaseOrderLineItemRequest {
  id?: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  description?: string;
}

export interface UpdatePurchaseOrderStatusRequest {
  status: 'draft' | 'pending' | 'approved' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  notes?: string;
}

export interface PurchaseOrderQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'draft' | 'pending' | 'approved' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  supplier_id?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  start_date?: string;
  end_date?: string;
  sortBy?: 'id' | 'po_number' | 'order_date' | 'expected_delivery_date' | 'total_amount' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface PurchaseOrderStats {
  total_orders: number;
  draft_orders: number;
  pending_orders: number;
  approved_orders: number;
  received_orders: number;
  cancelled_orders: number;
  total_value: number;
  average_order_value: number;
  orders_this_month: number;
  orders_overdue: number;
}

export interface ReceiveGoodsRequest {
  line_items: {
    line_item_id: number;
    received_quantity: number;
    notes?: string;
  }[];
  received_date?: string;
  notes?: string;
}

// Inventory Types
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

// Payment Types
export interface Invoice {
  id: number;
  invoice_number: string;
  purchase_order_id?: number;
  supplier_id: number;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  terms?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  supplier_name?: string;
  supplier_code?: string;
  po_number?: string;
}

export interface Payment {
  id: number;
  payment_number: string;
  invoice_id?: number;
  supplier_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  approval_status: 'draft' | 'submitted' | 'approved' | 'rejected';
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  submitted_at?: string;
  submitted_by?: number;
  approved_at?: string;
  approved_by?: number;
  approval_notes?: string;
  // Joined fields
  supplier_name?: string;
  supplier_code?: string;
  invoice_number?: string;
}

export interface PaymentHistory {
  id: number;
  payment_id?: number;
  invoice_id?: number;
  event: string;
  description?: string;
  old_value?: string;
  new_value?: string;
  user_name?: string;
  created_at: string;
  payment_number?: string;
}

export interface CreateInvoiceRequest {
  purchase_order_id?: number;
  supplier_id: number;
  invoice_date: string;
  due_date: string;
  total_amount: number;
  terms?: string;
  notes?: string;
}

export interface UpdateInvoiceRequest extends Partial<CreateInvoiceRequest> {
  status?: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
}

export interface CreatePaymentRequest {
  invoice_id?: number;
  supplier_id: number;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference?: string;
  notes?: string;
  created_by?: string;
}

export interface UpdatePaymentRequest extends Partial<CreatePaymentRequest> {
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
}

export interface InvoiceQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  supplier_id?: number;
  purchase_order_id?: number;
  status?: 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
  start_date?: string;
  end_date?: string;
  due_date_from?: string;
  due_date_to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  supplier_id?: number;
  invoice_id?: number;
  status?: 'pending' | 'completed' | 'failed' | 'cancelled';
  payment_method?: string;
  start_date?: string;
  end_date?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaymentStats {
  total_invoices: number;
  pending_invoices: number;
  partial_invoices: number;
  paid_invoices: number;
  overdue_invoices: number;
  total_outstanding_amount: number;
  total_paid_amount: number;
  overdue_amount: number;
  recent_movements_count: number;
  monthly_movement_trend: {
    month: string;
    receipts: number;
    issues: number;
    adjustments: number;
  }[];
}

export interface InvoiceWithDetails extends Invoice {
  supplier: {
    id: number;
    name: string;
    supplier_code: string;
  };
  purchase_order?: {
    id: number;
    po_number: string;
  };
  payments?: Payment[];
  payment_history?: PaymentHistory[];
}

export interface PaymentWithDetails extends Payment {
  supplier: {
    id: number;
    name: string;
    supplier_code: string;
  };
  invoice?: {
    id: number;
    invoice_number: string;
  };
}

// POS Types
export interface Customer {
  id: number;
  customer_code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  customer_type: 'regular' | 'vip' | 'wholesale' | 'retail' | 'walk_in';
  status: 'active' | 'inactive' | 'blocked';
  total_purchases: number;
  loyalty_points: number;
  due_amount?: number;
  credit_limit?: number;
  last_purchase_date?: string;
  last_payment_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  customer_type?: 'regular' | 'vip' | 'wholesale' | 'retail' | 'walk_in';
  credit_limit?: number;
  notes?: string;
}

export interface UpdateCustomerRequest {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  customer_type?: 'regular' | 'vip' | 'wholesale' | 'retail' | 'walk_in';
  status?: 'active' | 'inactive' | 'blocked';
  credit_limit?: number;
  notes?: string;
}

export interface CustomerQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  customer_type?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CustomerStats {
  total_customers: number;
  active_customers: number;
  new_customers_today: number;
  new_customers_this_month: number;
  customer_types: Array<{
    customer_type: string;
    count: number;
  }>;
  top_customers: Array<{
    customer_id: number;
    customer_name: string;
    total_purchases: number;
    total_orders: number;
  }>;
}

export interface SalesOrder {
  id: number;
  order_number: string;
  customer_id?: number;
  distribution_center_id?: number;
  order_date: string;
  status: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  payment_status: 'pending' | 'paid' | 'partially_paid' | 'refunded';
  payment_method?: 'cash' | 'card' | 'credit' | 'check' | 'bank_transfer';
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  cash_received: number;
  change_given: number;
  cashier_id?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  // Joined fields
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  cashier_name?: string;
  product_count?: number;
  center_name?: string;
  center_code?: string;
}

export interface SalesOrderLineItem {
  id: number;
  sales_order_id: number;
  product_id: number;
  product_sku: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  line_total: number;
  created_at: string;
  // Joined fields
  product_description?: string;
  product_image_url?: string;
}

export interface SalesOrderWithDetails extends SalesOrder {
  line_items: SalesOrderLineItem[];
}

export interface CreateSalesOrderRequest {
  customer_id?: number;
  distribution_center_id?: number;
  payment_method: 'cash' | 'card' | 'credit' | 'check' | 'bank_transfer';
  cash_received?: number;
  notes?: string;
  discount_amount?: number;
  discount_percentage?: number;
  cashier_id?: number;
  line_items: {
    product_id: number;
    quantity: number;
    unit_price: number;
    total_price?: number;
    discount_amount?: number;
    discount_percentage?: number;
  }[];
}

export interface UpdateSalesOrderRequest {
  status?: 'pending' | 'processing' | 'completed' | 'cancelled' | 'refunded';
  payment_status?: 'pending' | 'paid' | 'partially_paid' | 'refunded';
  payment_method?: 'cash' | 'card' | 'credit' | 'check' | 'bank_transfer';
  cash_received?: number;
  notes?: string;
}

export interface SalesOrderQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  customer_id?: number;
  distribution_center_id?: number;
  status?: string;
  payment_status?: string;
  payment_method?: string;
  start_date?: string;
  end_date?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface POSStats {
  total_sales: number;
  total_orders: number;
  total_customers: number;
  average_order_value: number;
  today_sales: number;
  today_orders: number;
  top_selling_products: Array<{
    product_id: number;
    product_name: string;
    total_quantity: number;
    total_revenue: number;
  }>;
  payment_methods: Array<{
    payment_method: string;
    count: number;
    total_amount: number;
  }>;
}

// Expense Types
export interface ExpenseCategory {
  id: number;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: number;
  expense_number: string;
  title: string;
  description?: string;
  category_id: number;
  amount: number;
  currency: string;
  expense_date: string;
  payment_method: string;
  vendor_name?: string;
  vendor_contact?: string;
  receipt_number?: string;
  receipt_url?: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  approved_by?: number;
  approved_at?: string;
  paid_by?: number;
  paid_at?: string;
  department?: string;
  project?: string;
  tags?: string[];
  notes?: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  category_name?: string;
  created_by_name?: string;
  approved_by_name?: string;
  paid_by_name?: string;
}

export interface CreateExpenseRequest {
  title: string;
  description?: string;
  category_id: number;
  amount: number;
  currency?: string;
  expense_date: string;
  payment_method?: string;
  vendor_name?: string;
  vendor_contact?: string;
  receipt_number?: string;
  receipt_url?: string;
  department?: string;
  project?: string;
  tags?: string[];
  notes?: string;
}

export interface UpdateExpenseRequest {
  title?: string;
  description?: string;
  category_id?: number;
  amount?: number;
  currency?: string;
  expense_date?: string;
  payment_method?: string;
  vendor_name?: string;
  vendor_contact?: string;
  receipt_number?: string;
  receipt_url?: string;
  department?: string;
  project?: string;
  tags?: string[];
  notes?: string;
}

export interface ExpenseQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category_id?: number;
  status?: 'pending' | 'approved' | 'rejected' | 'paid';
  payment_method?: string;
  department?: string;
  project?: string;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  created_by?: number;
  sortBy?: 'id' | 'expense_number' | 'title' | 'amount' | 'expense_date' | 'status' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface ExpenseStats {
  total_expenses: number;
  pending_expenses: number;
  approved_expenses: number;
  rejected_expenses: number;
  paid_expenses: number;
  total_amount: number;
  pending_amount: number;
  approved_amount: number;
  paid_amount: number;
  expenses_this_month: number;
  expenses_this_year: number;
  average_expense_amount: number;
  top_categories: Array<{
    category_id: number;
    category_name: string;
    count: number;
    total_amount: number;
  }>;
  monthly_trends: Array<{
    month: string;
    count: number;
    total_amount: number;
  }>;
}

export interface CreateExpenseCategoryRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateExpenseCategoryRequest {
  name?: string;
  description?: string;
  color?: string;
  is_active?: boolean;
}

export interface ExpenseCategoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
  sortBy?: 'id' | 'name' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface ExpenseCategoryListResponse {
  categories: ExpenseCategory[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ExpenseListResponse {
  expenses: Expense[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}
