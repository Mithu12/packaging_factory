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
  factory_id?: number;
  factory_name?: string;
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
  factory_id?: number;
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
  factory_id?: number;
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
  factory_id?: number;
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

// =====================================================
// Work Order Types
// =====================================================

export type WorkOrderStatus =
  | 'draft'
  | 'planned'
  | 'released'
  | 'in_progress'
  | 'completed'
  | 'on_hold'
  | 'cancelled';

export type WorkOrderPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface WorkOrder {
  id: string;
  work_order_number: string;
  customer_order_id?: number;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_of_measure: string;
  deadline: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  progress: number;
  estimated_hours: number;
  actual_hours: number;
  production_line_id?: string;
  production_line_name?: string;
  assigned_operator_ids: number[];
  created_by: number;
  created_at: string;
  updated_by?: number;
  updated_at?: string;
  started_at?: string;
  completed_at?: string;
  notes?: string;
  specifications?: string;
  // Material requirements integration
  material_requirements?: WorkOrderMaterialRequirement[];
  material_requirements_count?: number;
  total_material_cost?: number;
  has_material_shortages?: boolean;
  // Populated from joins
  created_by_name?: string;
  updated_by_name?: string;
}

export interface ProductionLine {
  id: string;
  name: string;
  code: string;
  description?: string;
  capacity: number;
  current_load: number;
  status: 'available' | 'busy' | 'maintenance' | 'offline';
  location?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface Operator {
  id: string;
  user_id: number;
  employee_id: string;
  skill_level: 'beginner' | 'intermediate' | 'expert' | 'master';
  department?: string;
  current_work_order_id?: string;
  availability_status: 'available' | 'busy' | 'off_duty' | 'on_leave';
  hourly_rate?: number;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
  // Populated from users table join
  user_name?: string;
  user_email?: string;
}

export interface WorkOrderAssignment {
  id: string;
  work_order_id: string;
  production_line_id: string;
  operator_id: string;
  assigned_at: string;
  assigned_by: number;
  estimated_start_time?: string;
  actual_start_time?: string;
  estimated_completion_time?: string;
  actual_completion_time?: string;
  notes?: string;
  // Populated from joins
  operator_name?: string;
  production_line_name?: string;
}

// Request/Response Types for Work Orders
export interface CreateWorkOrderRequest {
  customer_order_id?: number;
  product_id: string;
  quantity: number;
  deadline: string;
  priority: WorkOrderPriority;
  estimated_hours: number;
  production_line_id?: string;
  assigned_operators?: number[];
  notes?: string;
  specifications?: string;
}

export interface UpdateWorkOrderRequest {
  quantity?: number;
  deadline?: string;
  priority?: WorkOrderPriority;
  estimated_hours?: number;
  production_line_id?: string;
  assigned_operators?: number[];
  notes?: string;
  specifications?: string;
  progress?: number;
  actual_hours?: number;
}

export interface WorkOrderQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  production_line_id?: string;
  assigned_operator_id?: number;
  customer_order_id?: number;
  created_date_from?: string;
  created_date_to?: string;
  deadline_from?: string;
  deadline_to?: string;
  sort_by?: 'created_at' | 'deadline' | 'priority' | 'status' | 'progress';
  sort_order?: 'asc' | 'desc';
}

export interface WorkOrderStats {
  total_work_orders: number;
  draft_work_orders: number;
  planned_work_orders: number;
  in_progress_work_orders: number;
  completed_work_orders: number;
  on_hold_work_orders: number;
  total_estimated_hours: number;
  total_actual_hours: number;
  average_completion_rate: number;
  on_time_delivery_rate: number;
}

// Production Line Management
export interface CreateProductionLineRequest {
  name: string;
  code: string;
  description?: string;
  capacity: number;
  location?: string;
}

export interface UpdateProductionLineRequest {
  name?: string;
  code?: string;
  description?: string;
  capacity?: number;
  location?: string;
  status?: 'available' | 'busy' | 'maintenance' | 'offline';
  is_active?: boolean;
}

// Operator Management
export interface CreateOperatorRequest {
  employee_id: string;
  name: string;
  skill_level: 'beginner' | 'intermediate' | 'expert' | 'master';
  department?: string;
  hourly_rate?: number;
}

export interface UpdateOperatorRequest {
  employee_id?: string;
  name?: string;
  skill_level?: 'beginner' | 'intermediate' | 'expert' | 'master';
  department?: string;
  availability_status?: 'available' | 'busy' | 'off_duty' | 'on_leave';
  hourly_rate?: number;
  is_active?: boolean;
}

// Work Order Assignment
export interface CreateWorkOrderAssignmentRequest {
  work_order_id: number;
  production_line_id: number;
  operator_ids: number[];
  estimated_start_time?: string;
  notes?: string;
}

export interface UpdateWorkOrderAssignmentRequest {
  operator_ids?: number[];
  estimated_start_time?: string;
  actual_start_time?: string;
  estimated_completion_time?: string;
  actual_completion_time?: string;
  notes?: string;
}

// Work Order Material Requirements Types
export interface WorkOrderMaterialRequirement {
  id: string;
  work_order_id: string;
  material_id: string;
  material_name: string;
  material_sku: string;
  required_quantity: number;
  allocated_quantity: number;
  consumed_quantity: number;
  unit_of_measure: string;
  status: 'pending' | 'allocated' | 'short' | 'fulfilled' | 'cancelled';
  priority: number;
  required_date: string;
  bom_component_id?: string;
  supplier_id?: string;
  supplier_name?: string;
  unit_cost: number;
  total_cost: number;
  lead_time_days: number;
  is_critical: boolean;
  notes?: string;
  created_at: string;
  updated_at?: string;
}
