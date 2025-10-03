// Factory Module Types

// Factory Types
export interface Factory {
  id: string;
  name: string;
  code: string;
  description?: string;
  address: Address;
  phone?: string;
  email?: string;
  manager_id?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateFactoryRequest {
  name: string;
  code: string;
  description?: string;
  address: Address;
  phone?: string;
  email?: string;
  manager_id?: number;
}

export interface UpdateFactoryRequest {
  name?: string;
  code?: string;
  description?: string;
  address?: Address;
  phone?: string;
  email?: string;
  manager_id?: number;
  is_active?: boolean;
}

export enum FactoryCustomerOrderStatus {
  DRAFT = 'draft',
  PENDING = 'pending',
  QUOTED = 'quoted',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum FactoryCustomerOrderPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum FactoryCustomerOrderPaymentTerms {
  NET_15 = 'net_15',
  NET_30 = 'net_30',
  NET_45 = 'net_45',
  NET_60 = 'net_60',
  CASH = 'cash',
  ADVANCE = 'advance',
}
export interface FactoryCustomerOrder {
  id: number;
  order_number: string;
  factory_customer_id: number;
  factory_customer_name: string;
  factory_customer_email: string;
  factory_customer_phone: string;
  order_date: string;
  required_date: string;
  status: FactoryCustomerOrderStatus;
  priority: FactoryCustomerOrderPriority;
  total_value: number;
  currency: string;
  sales_person: string;
  notes?: string;
  terms?: string;
  payment_terms: FactoryCustomerOrderPaymentTerms;
  shipping_address: Address;
  billing_address: Address;
  line_items: OrderLineItem[];
  attachments: string[];
  created_by: string;
  created_at: string;
  updated_by?: string;
  updated_at?: string;
  approved_by?: string;
  approved_at?: string;
}

export interface OrderLineItem {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  discount_amount?: number;
  line_total: number;
  unit_of_measure: string;
  specifications?: string;
  delivery_date?: string;
  is_optional: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  contact_name?: string;
  contact_phone?: string;
}

export interface FactoryCustomer {
  id: number;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address: Address;
  credit_limit?: number;
  payment_terms: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface FactoryProduct {
  id: number;
  name: string;
  sku: string;
  description?: string;
  unit_price: number;
  unit_of_measure: string;
  is_active: boolean;
  stock_quantity?: number;
  lead_time_days?: number;
  created_at: string;
  updated_at?: string;
}

// Request/Response Types
export interface CreateCustomerOrderRequest {
  factory_customer_id: number;
  required_date: string;
  priority: FactoryCustomerOrderPriority;
  notes?: string;
  terms?: string;
  payment_terms: FactoryCustomerOrderPaymentTerms;
  shipping_address: Address;
  billing_address: Address;
  line_items: CreateOrderLineItemRequest[];
}

export interface CreateOrderLineItemRequest {
  product_id: number;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  specifications?: string;
  delivery_date?: string;
  is_optional?: boolean;
}

export interface UpdateCustomerOrderRequest {
  required_date?: string;
  priority?: FactoryCustomerOrderPriority;
  notes?: string;
  terms?: string;
  payment_terms?: FactoryCustomerOrderPaymentTerms;
  shipping_address?: Address;
  billing_address?: Address;
  line_items?: UpdateOrderLineItemRequest[];
}

export interface UpdateOrderLineItemRequest {
  id?: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  specifications?: string;
  delivery_date?: string;
  is_optional?: boolean;
}

export interface OrderStats {
  total_orders: number;
  pending_orders: number;
  quoted_orders: number;
  approved_orders: number;
  in_production_orders: number;
  completed_orders: number;
  total_value: number;
  average_order_value: number;
  on_time_delivery: number;
}

export interface OrderFilter {
  status?: string;
  priority?: string;
  factory_customer_id?: number;
  date_from?: string;
  date_to?: string;
  sales_person?: string;
}

export interface OrderQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  priority?: string;
  factory_customer_id?: number;
  date_from?: string;
  date_to?: string;
  sales_person?: string;
  sort_by?: 'order_date' | 'required_date' | 'total_value' | 'factory_customer_name';
  sort_order?: 'asc' | 'desc';
}

export interface ApproveOrderRequest {
  order_id: number;
  approved: boolean;
  notes?: string;
}

export interface UpdateOrderStatusRequest {
  order_id: number;
  status: FactoryCustomerOrderStatus;
  notes?: string;
}

// Database result types
export interface CustomerOrderRow {
  id: number;
  order_number: string;
  factory_customer_id: number;
  factory_customer_name: string;
  factory_customer_email: string;
  factory_customer_phone: string;
  order_date: Date;
  required_date: Date;
  status: string;
  priority: string;
  total_value: number;
  currency: string;
  sales_person: string;
  notes?: string;
  terms?: string;
  payment_terms: string;
  shipping_address: string; // JSON string
  billing_address: string; // JSON string
  attachments: string; // JSON string
  created_by: string;
  created_at: Date;
  updated_by?: string;
  updated_at?: Date;
  approved_by?: string;
  approved_at?: Date;
}

export interface OrderLineItemRow {
  id: number;
  order_id: number;
  product_id: number;
  product_name: string;
  product_sku: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount_percentage?: number;
  discount_amount?: number;
  line_total: number;
  unit_of_measure: string;
  specifications?: string;
  delivery_date?: Date;
  is_optional: boolean;
  created_at: Date;
  updated_at?: Date;
}
