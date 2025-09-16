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
  customer_type: 'regular' | 'vip' | 'wholesale' | 'walk_in';
  status: 'active' | 'inactive' | 'blocked';
  total_purchases: number;
  loyalty_points: number;
  last_purchase_date?: string;
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
  customer_type?: 'regular' | 'vip' | 'wholesale' | 'walk_in';
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
  customer_type?: 'regular' | 'vip' | 'wholesale' | 'walk_in';
  status?: 'active' | 'inactive' | 'blocked';
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

export interface SalesOrder {
  id: number;
  order_number: string;
  customer_id?: number;
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
  payment_method: 'cash' | 'card' | 'credit' | 'check' | 'bank_transfer';
  cash_received?: number;
  notes?: string;
  discount_amount?: number;
  discount_percentage?: number;
  tax_amount?: number;
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
  status?: string;
  payment_status?: string;
  payment_method?: string;
  start_date?: string;
  end_date?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SalesReceipt {
  id: number;
  receipt_number: string;
  sales_order_id: number;
  receipt_date: string;
  receipt_type: 'sale' | 'refund' | 'exchange';
  total_amount: number;
  payment_method: string;
  cashier_id?: number;
  notes?: string;
  created_at: string;
  // Joined fields
  customer_name?: string;
  cashier_name?: string;
}

export interface CreateSalesReceiptRequest {
  sales_order_id: number;
  receipt_type?: 'sale' | 'refund' | 'exchange';
  notes?: string;
}

export interface PricingRule {
  id: number;
  name: string;
  description?: string;
  product_id?: number;
  category_id?: number;
  rule_type: 'discount' | 'markup' | 'fixed_price';
  rule_value: number;
  rule_percentage?: number;
  min_quantity: number;
  max_quantity?: number;
  start_date: string;
  end_date?: string;
  customer_type?: 'regular' | 'vip' | 'wholesale' | 'walk_in';
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  product_name?: string;
  category_name?: string;
}

export interface CreatePricingRuleRequest {
  name: string;
  description?: string;
  product_id?: number;
  category_id?: number;
  rule_type: 'discount' | 'markup' | 'fixed_price';
  rule_value: number;
  rule_percentage?: number;
  min_quantity?: number;
  max_quantity?: number;
  start_date: string;
  end_date?: string;
  customer_type?: 'regular' | 'vip' | 'wholesale' | 'walk_in';
  priority?: number;
}

export interface UpdatePricingRuleRequest {
  name?: string;
  description?: string;
  product_id?: number;
  category_id?: number;
  rule_type?: 'discount' | 'markup' | 'fixed_price';
  rule_value?: number;
  rule_percentage?: number;
  min_quantity?: number;
  max_quantity?: number;
  start_date?: string;
  end_date?: string;
  customer_type?: 'regular' | 'vip' | 'wholesale' | 'walk_in';
  is_active?: boolean;
  priority?: number;
}

export interface PricingRuleQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  product_id?: number;
  category_id?: number;
  rule_type?: string;
  customer_type?: string;
  is_active?: boolean;
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
