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
    /** Customer Purchase Request / Reference number printed on invoice. */
    pr_no?: string;
    /** Customer's purchase order number (used on challan + bill). */
    po_number?: string;
    /** Customer's purchase order date (ISO date string). */
    po_date?: string;
    /** Latest linked work order number (read-only, joined for invoice rendering). */
    latest_work_order_number?: string;
    /** Creation timestamp of the latest linked work order (read-only). */
    latest_work_order_date?: string;
    /** Customer's company name (joined from factory_customers; blank for individuals). */
    customer_company?: string;
    /** Customer's VAT number (joined from factory_customers). */
    customer_vat_number?: string;
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
    /** Joined from products: carton corrugation layers, rendered on the challan. */
    ply?: number | null;
    /** Joined from products: buyer-supplied item code (V142). Shown in the New Delivery dialog. */
    customer_item_code?: string | null;
    created_at: string;
    updated_at?: string;
}

export type DeliveryStatus = 'shipped' | 'delivered' | 'returned' | 'cancelled';

/**
 * One row per order that contributed items to a delivery (multi-order shipments).
 * Derived from delivery_items -> order_line_items -> orders.
 */
export interface TouchedOrder {
    order_id: number;
    order_number: string;
    po_number?: string | null;
    po_date?: string | null;
}

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
    /** Joined from products: carton corrugation layers, rendered on the challan. */
    ply?: number | null;
    /** Free-text bundle layout (e.g. "20 x 50") for this delivery line. Challan only. */
    bundles?: string | null;
    /** Per-shipment item code override (V133). Defaults from products.customer_item_code on the UI side. */
    item_code?: string | null;
    created_at: string;
}

export interface Delivery {
    id: number;
    delivery_number: string;
    /** Authoritative scope: customer this delivery is for (V145+). */
    factory_customer_id: number;
    factory_customer_name?: string;
    /** Primary/opened-from order. Optional for customer-level deliveries. */
    customer_order_id?: number;
    customer_order_number?: string;
    /** All orders whose lines are in this delivery (multi-order shipments). */
    touched_orders: TouchedOrder[];
    invoice_id?: number;
    invoice_number?: string;
    delivery_date: string;
    tracking_number?: string;
    carrier?: string;
    estimated_delivery_date?: string;
    delivery_status: DeliveryStatus;
    notes?: string;
    shipped_by?: number;
    /** Per-shipment VAT registration; defaults from factory_customers.vat_number. */
    vat_number?: string;
    /** Challan-only: text printed after "Master Carton For:". */
    master_carton_for?: string | null;
    /** Challan-only: sub-label printed under the carton-for line (e.g. brand "Hanicom"). */
    master_carton_sub_label?: string | null;
    items: DeliveryItem[];
    subtotal: number;
    created_at: string;
    updated_at?: string;
}

export interface CreateDeliveryItemRequest {
    order_line_item_id: number;
    quantity: number;
    bundles?: string | null;
    item_code?: string | null;
}

export interface CreateDeliveryRequest {
    items: CreateDeliveryItemRequest[];
    delivery_date?: string;
    tracking_number?: string;
    carrier?: string;
    estimated_delivery_date?: string;
    notes?: string;
    vat_number?: string;
    master_carton_for?: string | null;
    master_carton_sub_label?: string | null;
    /** Customer-level entry point only. Order-level routes set this from the path param. */
    factory_customer_id?: number;
    /** Source DC the shipment is picked from. Defaults to the primary DC. */
    distribution_center_id?: number;
}

// =====================================================
// Delivery Returns (challan returns)
// =====================================================

export type DeliveryReturnStatus = 'draft' | 'approved' | 'rejected' | 'cancelled';

export interface DeliveryReturnItem {
    id: number;
    return_id: number;
    delivery_item_id: number;
    order_line_item_id: number;
    product_id?: number;
    product_name?: string;
    returned_quantity: number;
    unit_price: number;
    line_total: number;
    condition?: string;
    notes?: string;
    created_at: string;
}

export interface DeliveryReturn {
    id: number;
    return_number: string;
    delivery_id: number;
    delivery_number?: string;
    factory_customer_id: number;
    factory_customer_name?: string;
    customer_order_id?: number;
    /** DC whose product_locations stock is credited on approval. */
    distribution_center_id?: number;
    return_date: string;
    return_reason: string;
    status: DeliveryReturnStatus;
    total_return_value: number;
    currency?: string;
    reversal_voucher_id?: number;
    credit_note_voucher_id?: number;
    accounting_integrated: boolean;
    created_by?: number;
    approved_by?: number;
    approved_at?: string;
    notes?: string;
    items: DeliveryReturnItem[];
    created_at: string;
    updated_at?: string;
}

export interface CreateDeliveryReturnItemRequest {
    /** The delivery line being returned (factory_customer_order_delivery_items.id). */
    delivery_item_id: number;
    returned_quantity: number;
    condition?: string;
    notes?: string;
}

export interface CreateDeliveryReturnRequest {
    items: CreateDeliveryReturnItemRequest[];
    return_date?: string;
    return_reason?: string;
    notes?: string;
    /** DC to restock on approval. Defaults to the primary DC when omitted. */
    distribution_center_id?: number;
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
    pr_no?: string;
    po_number?: string;
    po_date?: string;
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
    pr_no?: string;
    po_number?: string;
    po_date?: string;
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
    /** DC the produced finished goods are credited into. Defaults to the primary DC. */
    distribution_center_id?: number;
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

// Machine Parts
export type MachinePartStatus = 'active' | 'replaced' | 'retired';
export type ReplacementReason = 'preventive' | 'failure' | 'upgrade' | 'other';

export interface MachinePart {
    id: string;
    machine_id: string;
    name: string;
    part_code?: string;
    position?: string;
    quantity: number;
    manufacturer?: string;
    model_number?: string;
    installed_at?: string;
    expected_lifespan_days?: number;
    last_replaced_at?: string;
    next_replacement_date?: string;
    status: MachinePartStatus;
    notes?: string;
    is_active: boolean;
    // Optional link to an inventory product (spare-part stock source)
    product_id?: string;
    product_name?: string;
    product_sku?: string;
    created_at: string;
    updated_at?: string;
}

export interface MachinePartReplacement {
    id: string;
    machine_part_id: string;
    maintenance_log_id?: string;
    replaced_at: string;
    reason: ReplacementReason;
    technician?: string;
    cost: number;
    next_replacement_date?: string;
    notes?: string;
    // Stock consumption + traceability (set when the part is product-linked)
    product_id?: string;
    quantity?: number;
    distribution_center_id?: string;
    stock_adjustment_id?: string;
    product_name?: string;
    product_sku?: string;
    created_at: string;
    updated_at?: string;
}

export interface CreateMachinePartRequest {
    name: string;
    part_code?: string;
    position?: string;
    quantity?: number;
    manufacturer?: string;
    model_number?: string;
    installed_at?: string;
    expected_lifespan_days?: number;
    last_replaced_at?: string;
    next_replacement_date?: string;
    status?: MachinePartStatus;
    notes?: string;
    product_id?: number | null;
}

export interface UpdateMachinePartRequest {
    name?: string;
    part_code?: string | null;
    position?: string | null;
    quantity?: number;
    manufacturer?: string | null;
    model_number?: string | null;
    installed_at?: string | null;
    expected_lifespan_days?: number | null;
    last_replaced_at?: string | null;
    next_replacement_date?: string | null;
    status?: MachinePartStatus;
    notes?: string | null;
    is_active?: boolean;
    product_id?: number | null;
}

export interface CreateMachinePartReplacementRequest {
    reason: ReplacementReason;
    replaced_at?: string;
    technician?: string;
    cost?: number;
    next_replacement_date?: string;
    notes?: string;
    maintenance_log_id?: number | null;
    // When provided (and the part is product-linked), the replacement issues a
    // stock decrease of `quantity` units from `distribution_center_id` (defaults
    // to the primary distribution center).
    product_id?: number | null;
    quantity?: number;
    distribution_center_id?: number | null;
}

export interface MachinePartQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: MachinePartStatus;
    is_active?: boolean;
    overdue_only?: boolean;
    sort_by?: 'name' | 'part_code' | 'status' | 'next_replacement_date' | 'created_at';
    sort_order?: 'asc' | 'desc';
}

export type SpareStockAlertStatus = 'low' | 'critical' | 'out_of_stock';

export interface MachinePartListItem extends MachinePart {
    machine_name: string;
    machine_code?: string;
    product_current_stock?: number;
    product_min_stock_level?: number;
    alert_status?: SpareStockAlertStatus;
}

export interface MachinePartListQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: MachinePartStatus;
    machine_id?: string;
    linked_only?: boolean;
    overdue_only?: boolean;
    sort_by?: 'name' | 'part_code' | 'status' | 'next_replacement_date' | 'created_at';
    sort_order?: 'asc' | 'desc';
}

export interface SpareStockAlert {
    part_id: string;
    part_name: string;
    part_code?: string;
    machine_id: string;
    machine_name: string;
    product_id: string;
    product_name: string;
    product_sku: string;
    current_stock: number;
    min_stock_level: number;
    alert_status: SpareStockAlertStatus;
}

export interface MachinePartConsumptionRow {
    replacement_id: string;
    replaced_at: string;
    machine_id: string;
    machine_name: string;
    part_id: string;
    part_name: string;
    product_id?: string;
    product_name?: string;
    product_sku?: string;
    quantity?: number;
    cost: number;
    stock_adjustment_id?: string;
    reason: ReplacementReason;
}

export interface MachinePartConsumptionReport {
    rows: MachinePartConsumptionRow[];
    total_quantity: number;
    total_cost: number;
}

// Plates (printing-plate usage & breakage tracking)
export type PlateStatus = 'active' | 'broken' | 'retired';
export type PlateUseOutcome = 'used' | 'broke';

export interface PlateType {
    id: string;
    name: string;
    code?: string;
    description?: string;
    expected_lifespan_uses?: number;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
    // Lifespan analytics (populated by getLifespanStats / list joins where available)
    plate_count?: number;
    active_count?: number;
    broken_count?: number;
    avg_uses_at_break?: number;
    min_uses_at_break?: number;
    max_uses_at_break?: number;
}

export interface Plate {
    id: string;
    plate_type_id: string;
    plate_type_name?: string;
    plate_code?: string;
    total_uses: number;
    status: PlateStatus;
    broke_at_use_count?: number;
    broken_at?: string;
    broken_reason?: string;
    expected_lifespan_uses?: number;
    factory_id?: string;
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
}

export interface ProductionRunPlate {
    id: string;
    production_run_id: string;
    plate_id: string;
    plate_code?: string;
    plate_type_name?: string;
    outcome: PlateUseOutcome;
    use_number?: number;
    used_at?: string;
    notes?: string;
    created_at: string;
    run_number?: string;
}

export interface CreatePlateTypeRequest {
    name: string;
    code?: string;
    description?: string;
    expected_lifespan_uses?: number;
}

export interface UpdatePlateTypeRequest {
    name?: string;
    code?: string | null;
    description?: string | null;
    expected_lifespan_uses?: number | null;
    is_active?: boolean;
}

export interface CreatePlateRequest {
    plate_type_id: number;
    plate_code?: string;
    expected_lifespan_uses?: number;
    factory_id?: number;
    notes?: string;
}

export interface UpdatePlateRequest {
    plate_type_id?: number;
    plate_code?: string | null;
    status?: PlateStatus;
    broken_reason?: string | null;
    expected_lifespan_uses?: number | null;
    factory_id?: number | null;
    notes?: string | null;
    is_active?: boolean;
}

export interface PlateQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: PlateStatus;
    plate_type_id?: number;
    factory_id?: number;
    is_active?: boolean;
    sort_by?: 'plate_code' | 'total_uses' | 'status' | 'created_at';
    sort_order?: 'asc' | 'desc';
}

// One plate's outcome within a production run, as submitted on run completion.
export interface PlateUsageInput {
    plate_id: number;
    outcome?: PlateUseOutcome;
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
