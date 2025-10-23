// Sales Rep Module Types - Backend
export interface SalesRepCustomer {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  credit_limit: number;
  current_balance: number;
  sales_rep_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface SalesRepOrder {
  id: number;
  customer_id: number;
  order_number: string;
  order_date: Date;
  status: 'draft' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  total_amount: number;
  discount_amount: number;
  tax_amount: number;
  final_amount: number;
  sales_rep_id: number | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  customer?: SalesRepCustomer;
  items?: SalesRepOrderItem[];
}

export interface SalesRepOrderItem {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount: number;
  total_price: number;
  created_at: Date;
  updated_at: Date;
}

export interface SalesRepInvoice {
  id: number;
  order_id: number;
  invoice_number: string;
  invoice_date: Date;
  due_date: Date;
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  sales_rep_id: number | null;
  created_at: Date;
  updated_at: Date;
  order?: SalesRepOrder;
}

export interface SalesRepPayment {
  id: number;
  invoice_id: number;
  payment_number: string;
  payment_date: Date;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'credit_card';
  reference_number: string | null;
  notes: string | null;
  sales_rep_id: number | null;
  created_at: Date;
  updated_at: Date;
  invoice?: SalesRepInvoice;
}

export interface SalesRepDelivery {
  id: number;
  order_id: number;
  delivery_number: string;
  delivery_date: Date;
  status: 'pending' | 'in_transit' | 'delivered' | 'cancelled';
  tracking_number: string | null;
  courier_service: string | null;
  delivery_address: string;
  contact_person: string;
  contact_phone: string;
  notes: string | null;
  sales_rep_id: number | null;
  created_at: Date;
  updated_at: Date;
  order?: SalesRepOrder;
}

export interface SalesRepNotification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  is_read: boolean;
  related_entity_type: 'customer' | 'order' | 'invoice' | 'payment' | 'delivery' | null;
  related_entity_id: number | null;
  sales_rep_id: number | null;
  created_at: Date;
  updated_at: Date;
}

export interface SalesRepReport {
  id: number;
  report_type: string;
  title: string;
  date_range_from: Date;
  date_range_to: Date;
  data: any;
  generated_by: number | null;
  generated_at: Date;
  created_at: Date;
  updated_at: Date;
}

// Request/Response types
export interface CreateCustomerRequest {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  credit_limit?: number;
}

export interface UpdateCustomerRequest extends CreateCustomerRequest {
  id: number;
}

export interface CreateOrderRequest {
  customer_id: number;
  items: Omit<SalesRepOrderItem, 'id' | 'order_id' | 'created_at' | 'updated_at'>[];
  discount_amount?: number;
  tax_amount?: number;
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
  payment_method: 'cash' | 'bank_transfer' | 'cheque' | 'credit_card';
  reference_number?: string;
  notes?: string;
}

export interface CreateDeliveryRequest {
  order_id: number;
  delivery_date?: Date;
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
  delivery_date?: Date;
}

// Filter types
export interface CustomerFilters {
  search?: string;
  city?: string;
  state?: string;
  page?: number;
  limit?: number;
  credit_limit_min?: number;
  credit_limit_max?: number;
  balance_min?: number;
  balance_max?: number;
}

export interface OrderFilters {
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
  limit?: number;
  page?: number;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
  overdue_only?: boolean;
}

export interface PaymentFilters {
  customer_id?: number;
  payment_method?: string;
  limit?: number;
  page?: number;
  date_from?: string;
  date_to?: string;
  min_amount?: number;
  max_amount?: number;
}

export interface DeliveryFilters {
  customer_id?: number;
  status?: string;
  limit?: number;
  page?: number;
  date_from?: string;
  date_to?: string;
  courier_service?: string;
}

export interface NotificationFilters {
  unread_only?: boolean;
  type?: string;
}

// Pagination types
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

// Dashboard stats
export interface DashboardStats {
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

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

