// Factory Module Types

export enum QuotationStatus {
    DRAFT = 'draft',
    SENT = 'sent',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    CONVERTED = 'converted',
    EXPIRED = 'expired',
}

export interface Quotation extends FactoryCustomerOrder {
    quotation_number: string;
    quotation_date: string;
}

export type QuotationLineItem = OrderLineItem;

export interface CreateQuotationRequest {
    factory_customer_id: number;
    factory_id: number;
    quotation_date?: string;
    valid_until?: string;
    notes?: string;
    terms?: string;
    reference?: string;
    discount?: number;
    tax_rate?: number;
    line_items: Array<{
        product_id?: number;
        description: string;
        quantity: number;
        unit?: string;
        unit_price: number;
    }>;
}

export interface UpdateQuotationRequest extends Partial<CreateQuotationRequest> {
    status?: QuotationStatus;
}

export interface QuotationQueryParams extends OrderQueryParams {
    status?: QuotationStatus | '';
}

export interface QuotationStats {
    total_quotations: number;
    draft_count: number;
    sent_count: number;
    approved_count: number;
    rejected_count: number;
    converted_count: number;
    total_value: number;
    approved_value: number;
    conversion_rate: number;
}

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
    cost_center_id?: number;
    cost_center_name?: string;
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
    cost_center_id?: number;
}

export interface UpdateFactoryRequest {
    name?: string;
    code?: string;
    description?: string;
    address?: Address;
    phone?: string;
    email?: string;
    manager_id?: number;
    cost_center_id?: number;
    is_active?: boolean;
}

export enum FactoryCustomerOrderStatus {
    DRAFT = 'draft',
    PENDING = 'pending',
    QUOTED = 'quoted',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    IN_PRODUCTION = 'in_production',
    COMPLETED = 'completed',
    PARTIALLY_SHIPPED = 'partially_shipped',
    SHIPPED = 'shipped',
    CANCELLED = 'cancelled',
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
/** Stored when a quoted order is converted; view-only history of lines before final line replace. */
export interface QuotedOrderSnapshot {
    captured_at: string;
    order_number?: string;
    total_value: number;
    currency?: string;
    line_items: Array<{
        product_id: number;
        product_name: string;
        product_sku: string;
        quantity: number;
        unit_price: number;
        line_total: number;
        specifications?: string | null;
    }>;
}

export interface FactoryCustomerOrder {
    id: number;
    order_number: string;
    factory_id?: number;
    factory_name?: string;
    factory_cost_center_id?: number;
    factory_cost_center_name?: string;
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
    paid_amount: number;
    outstanding_amount: number;
    shipping_address: Address;
    billing_address: Address;
    line_items: OrderLineItem[];
    attachments: string[];
    valid_until?: string;
    subtotal?: number;
    tax_rate?: number;
    tax_amount?: number;
    discount_amount_total?: number;
    created_by: string;
    created_at: string;
    updated_by?: string;
    updated_at?: string;
    approved_by?: string;
    approved_at?: string;
    shipped_at?: string;
    shipped_by?: string;
    tracking_number?: string;
    carrier?: string;
    estimated_delivery_date?: string;
    actual_delivery_date?: string;
    shipping_cost?: number;
    delivery_status?: string;
    quoted_snapshot?: QuotedOrderSnapshot | null;
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
    /** Cumulative quantity already shipped via deliveries; defaults to 0. */
    delivered_qty?: number;
    /** Cumulative quantity already invoiced via delivery invoices; defaults to 0. */
    invoiced_qty?: number;
    created_at: string;
    updated_at?: string;
}

export type DeliveryStatus = 'shipped' | 'delivered' | 'returned' | 'cancelled';

export interface DeliveryItem {
    id: number;
    delivery_id: number;
    order_line_item_id: number;
    product_id?: number;
    product_name?: string;
    product_sku?: string;
    description?: string;
    unit_of_measure?: string;
    quantity: number;
    unit_price_snapshot: number;
    line_total: number;
    created_at: string;
}

export interface Delivery {
    id: number;
    delivery_number: string;
    customer_order_id: number;
    customer_order_number?: string;
    invoice_id?: number;
    invoice_number?: string;
    delivery_date: string;
    tracking_number?: string;
    carrier?: string;
    estimated_delivery_date?: string;
    delivery_status: DeliveryStatus;
    notes?: string;
    shipped_by?: number;
    items: DeliveryItem[];
    subtotal: number;
    created_at: string;
    updated_at?: string;
}

export interface CreateDeliveryItemRequest {
    order_line_item_id: number;
    quantity: number;
}

export interface CreateDeliveryRequest {
    items: CreateDeliveryItemRequest[];
    delivery_date?: string;
    tracking_number?: string;
    carrier?: string;
    estimated_delivery_date?: string;
    notes?: string;
}

export interface Address {
    street: string;
    city: string;
    state: string;
    postal_code: string;
    country: string;
    contact_name?: string;
    contact_phone?: string;
    /** Optional single-line shipping (factory customer create UX). */
    shipping_line?: string;
    /** Optional single-line billing (factory customer create UX). */
    billing_line?: string;
}

export interface FactoryCustomer {
    id: number;
    name: string;
    email: string | null;
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
    status?: FactoryCustomerOrderStatus;
    valid_until?: string;
    subtotal?: number;
    tax_rate?: number;
    tax_amount?: number;
    sales_person: string;
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
    status?: FactoryCustomerOrderStatus;
    valid_until?: string;
    subtotal?: number;
    tax_rate?: number;
    tax_amount?: number;
    sales_person?: string;
    /** When true with line_items on a quoted order, persist current lines to quoted_snapshot before replace. */
    capture_quoted_snapshot?: boolean;
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

/** Single request: replace lines + approve (quoted/pending). Idempotent if already approved. */
export interface ConvertOrderWithLinesRequest {
    line_items: UpdateOrderLineItemRequest[];
    notes?: string;
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
    // Quotation specific stats
    total_quotations?: number;
    approved_value?: number;
    conversion_rate?: number;
    total_quoted_value?: number;
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
    factory_id?: number;
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
    customer_order_number?: string;
    product_id: string;
    product_name: string;
    product_sku: string;
    product_primary_category?: string | null;
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
    po_product_ids?: number[];
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

export type MachineStatus = 'active' | 'inactive' | 'under_maintenance';
export type MaintenanceType = 'preventive' | 'corrective';

export interface Machine {
    id: string;
    factory_id?: number | null;
    production_line_id?: number | null;
    name: string;
    code: string;
    model?: string;
    serial_number?: string;
    manufacturer?: string;
    purchase_date?: string;
    location?: string;
    status: MachineStatus;
    next_service_date?: string;
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
    // Populated from joins
    production_line_name?: string;
    factory_name?: string;
}

export interface MachineMaintenanceLog {
    id: string;
    machine_id: string;
    maintenance_type: MaintenanceType;
    start_at: string;
    end_at?: string;
    technician?: string;
    cost: number;
    next_service_date?: string;
    notes?: string;
    created_at: string;
    updated_at?: string;
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

// Machine Management
export interface CreateMachineRequest {
    name: string;
    code: string;
    model?: string;
    serial_number?: string;
    manufacturer?: string;
    purchase_date?: string;
    location?: string;
    production_line_id?: number | null;
    status?: MachineStatus;
    next_service_date?: string;
    notes?: string;
}

export interface UpdateMachineRequest {
    name?: string;
    code?: string;
    model?: string;
    serial_number?: string;
    manufacturer?: string;
    purchase_date?: string;
    location?: string;
    production_line_id?: number | null;
    status?: MachineStatus;
    next_service_date?: string;
    notes?: string;
    is_active?: boolean;
}

export interface CreateMachineMaintenanceLogRequest {
    maintenance_type: MaintenanceType;
    start_at?: string;
    end_at?: string;
    technician?: string;
    cost?: number;
    next_service_date?: string;
    notes?: string;
}

// Operator Management
export interface CreateOperatorRequest {
    user_id: number;
    skill_level: 'beginner' | 'intermediate' | 'expert' | 'master';
    department?: string;
    hourly_rate?: number;
}

export interface UpdateOperatorRequest {
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

export interface FactoryCustomerPayment {
    id: number;
    factory_customer_order_id: string;
    factory_customer_id: string;
    factory_id?: number;
    factory_sales_invoice_id?: number;
    payment_amount: number;
    payment_date: string;
    payment_method: string;
    payment_reference?: string;
    notes?: string;
    recorded_by: number;
    recorded_at: string;
    updated_at?: string;
    additional_metadata?: Record<string, unknown>;
    voucher_id?: number;
    voucher_no?: string;
}

export interface RecordFactoryOrderPaymentRequest {
    payment_amount: number;
    payment_date?: string;
    payment_method: string;
    payment_reference?: string;
    notes?: string;
    factory_sales_invoice_id?: number;
    additional_metadata?: Record<string, unknown>;
}

export interface FactoryOrderPaymentHistoryResponse {
    order: FactoryCustomerOrder;
    payments: FactoryCustomerPayment[];
}
