export interface SalesRepCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  credit_limit: number;
  current_balance: number;
  sales_rep_id: number;
  created_at: string;
  updated_at: string;
}

export interface SalesRepOrder {
  id: number;
  customer_id: number;
  order_number: string;
  order_date: string;
  status:
    | "draft"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  final_amount: number;
  sales_rep_id: number;
  customer?: SalesRepCustomer;
  items: SalesRepOrderItem[];
  created_at: string;
  updated_at: string;
}

export interface SalesRepOrderItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price?: number;
}

export interface SalesRepInvoice {
  id: number;
  order_id: number;
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  sales_rep_id: number;
  order?: SalesRepOrder;
  created_at: string;
  updated_at: string;
}

export interface SalesRepPayment {
  id: number;
  invoice_id: number;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: "cash" | "bank_transfer" | "cheque" | "credit_card";
  reference_number?: string;
  notes?: string;
  sales_rep_id: number;
  invoice?: SalesRepInvoice;
  created_at: string;
  updated_at: string;
}

export interface SalesRepDelivery {
  id: number;
  order_id: number;
  delivery_number: string;
  delivery_date: string;
  status: "pending" | "in_transit" | "delivered" | "cancelled";
  tracking_number?: string;
  courier_service?: string;
  delivery_address: string;
  contact_person: string;
  contact_phone: string;
  notes?: string;
  sales_rep_id: number;
  order?: SalesRepOrder;
  created_at: string;
  updated_at: string;
}

export interface SalesRepNotification {
  id: number;
  title: string;
  message: string;
  type: "info" | "warning" | "error" | "success";
  is_read: boolean;
  related_entity_type?:
    | "customer"
    | "order"
    | "invoice"
    | "payment"
    | "delivery";
  related_entity_id?: number;
  sales_rep_id: number;
  created_at: string;
  updated_at: string;
}

export interface SalesRepDashboardStats {
  total_customers: number;
  active_orders: number;
  pending_invoices: number;
  overdue_payments: number;
  monthly_sales: number;
  monthly_target: number;
  recent_orders: SalesRepOrder[];
  upcoming_deliveries: SalesRepDelivery[];
  unread_notifications: number;
}

export interface SalesRepReport {
  id: number;
  report_type:
    | "sales_summary"
    | "customer_performance"
    | "order_analysis"
    | "payment_collection";
  title: string;
  date_range: {
    from: string;
    to: string;
  };
  data: any;
  generated_by: number;
  generated_at: string;
}

// API Request/Response types
export interface CreateCustomerRequest {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  credit_limit: number;
}

export interface UpdateCustomerRequest extends CreateCustomerRequest {
  id: number;
}

export interface CreateOrderRequest {
  customer_id: number;
  items: {
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    discount: number;
  }[];
  discount_amount?: number;
  notes?: string;
}

export interface UpdateOrderRequest extends CreateOrderRequest {
  id: number;
  status?: string;
}

export interface CreateInvoiceRequest {
  order_id: number;
}

export interface CreatePaymentRequest {
  invoice_id: number;
  amount: number;
  payment_method: string;
  reference_number?: string;
  notes?: string;
}

export interface CreateDeliveryRequest {
  order_id: number;
  delivery_address: string;
  contact_person: string;
  contact_phone: string;
  tracking_number?: string;
  courier_service?: string;
  notes?: string;
}

export interface UpdateDeliveryRequest extends CreateDeliveryRequest {
  id: number;
  status?: string;
}

// Filter and pagination types
export interface CustomerFilters {
  search?: string;
  city?: string;
  state?: string;
  credit_limit_min?: number;
  credit_limit_max?: number;
  balance_min?: number;
  balance_max?: number;
}

export interface OrderFilters {
  search?: string;
  customer_id?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface InvoiceFilters {
  customer_id?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
  overdue_only?: boolean;
}

export interface PaymentFilters {
  customer_id?: number;
  payment_method?: string;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface DeliveryFilters {
  customer_id?: number;
  status?: string;
  date_from?: string;
  date_to?: string;
  courier_service?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SharedCustomerResponse {
  customers: SalesRepCustomer[];
  total: number;
  page: number;
  limit: number;
  shared: boolean;
}

// Form types
export interface CustomerFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postal_code: string;
  credit_limit: number;
}

export interface OrderFormData {
  customer_id: number;
  items: {
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    discount: number;
    total_price?: number; // Optional for frontend calculations only
  }[];
  discount_amount: number;
  notes: string;
}

export interface InvoiceFormData {
  order_id: number;
}

export interface PaymentFormData {
  invoice_id: number;
  amount: number;
  payment_method: "cash" | "bank_transfer" | "cheque" | "credit_card";
  reference_number: string;
  notes: string;
}

export interface DeliveryFormData {
  order_id: number;
  delivery_address: string;
  contact_person: string;
  contact_phone: string;
  tracking_number: string;
  courier_service: string;
  notes: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  selling_price: number;
  cost_price: number;
  current_stock: number;
  status: string;
  category_id?: number;
  brand_id?: number;
  image_url?: string;
}
