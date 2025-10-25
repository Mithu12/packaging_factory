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
  status:
    | "draft"
    | "submitted_for_approval"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "approved"
    | "rejected"
    | "factory_accepted"
    | "partially_accepted"
    | "partially_rejected";
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
  // Draft Order Approval Workflow Fields
  submitted_for_approval_at?: Date;
  submitted_for_approval_by?: string;
  admin_approved_by?: string;
  admin_approved_at?: Date;
  admin_rejection_reason?: string;
  assigned_factory_id?: number;
  assigned_factory_name?: string;
  factory_manager_accepted_by?: string;
  factory_manager_accepted_at?: Date;
  factory_manager_rejection_reason?: string;
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
  // Per-product factory assignment fields
  assigned_factory_id?: number | null;
  assigned_factory_name?: string;
  factory_assigned_by?: number | null;
  factory_assigned_at?: Date;
  // NEW: Per-item status tracking
  item_status?: "pending" | "factory_accepted" | "factory_rejected";
  item_factory_accepted_by?: number | null;
  item_factory_accepted_at?: Date;
  item_factory_rejection_reason?: string | null;
}

export interface SalesRepInvoice {
  id: number;
  order_id: number;
  invoice_number: string;
  invoice_date: Date;
  due_date: Date;
  status: "draft" | "sent" | "paid" | "overdue" | "cancelled";
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
  payment_method: "cash" | "bank_transfer" | "cheque" | "credit_card";
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
  status: "pending" | "in_transit" | "delivered" | "cancelled";
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
  type: "info" | "warning" | "error" | "success";
  is_read: boolean;
  related_entity_type:
    | "customer"
    | "order"
    | "invoice"
    | "payment"
    | "delivery"
    | null;
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
  order_date?: string;
  items: Omit<
    SalesRepOrderItem,
    "id" | "order_id" | "created_at" | "updated_at"
  >[];
  discount_amount?: number;
  tax_amount?: number;
  status?: string;
  notes?: string;
}

export interface UpdateOrderRequest extends CreateOrderRequest {
  id: number;
}

export interface CreateInvoiceRequest {
  order_id: number;
}

export interface CreatePaymentRequest {
  invoice_id: number;
  amount: number;
  payment_method: "cash" | "bank_transfer" | "cheque" | "credit_card";
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
  page?: number;
  limit?: number;
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
  page?: number;
  limit?: number;
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

// Draft Order Approval Workflow Request Types
export interface SubmitDraftOrderRequest {
  order_id: number;
}

export interface AdminApprovalRequest {
  order_id: number;
  approved: boolean;
  assigned_factory_id?: number;
  rejection_reason?: string;
}

export interface FactoryManagerAcceptanceRequest {
  order_id: number;
  accepted: boolean;
  rejection_reason?: string;
}

// Per-product factory assignment types
export interface ProductFactoryAssignment {
  item_id: number;
  assigned_factory_id: number;
}

export interface AdminApprovalWithProductFactoryRequest {
  order_id: number;
  approved: boolean;
  // Legacy field for backward compatibility - will be used if no product_assignments provided
  assigned_factory_id?: number;
  // New field for per-product factory assignment
  product_assignments?: ProductFactoryAssignment[];
  rejection_reason?: string;
}

// NEW: Request for per-item factory acceptance
export interface FactoryManagerItemAcceptanceRequest {
  order_id: number;
  item_ids: number[]; // Items to accept/reject
  accepted: boolean;
  rejection_reason?: string;
}
