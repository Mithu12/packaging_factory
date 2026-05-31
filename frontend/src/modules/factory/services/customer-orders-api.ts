// =====================================================
// Customer Orders API Service
// =====================================================

import { makeRequest } from '@/services/api-utils';

// =====================================================
// Types (matching backend types)
// =====================================================

export type FactoryCustomerOrderStatus =
    | 'draft'
    | 'pending'
    | 'quoted'
    | 'approved'
    | 'rejected'
    | 'in_production'
    | 'completed'
    | 'partially_shipped'
    | 'shipped'
    | 'cancelled';

export type OrderPriority = 'low' | 'medium' | 'high' | 'urgent';

/** DB JSONB `quoted_snapshot`; set when converting from quotation (view only). */
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
    factory_customer_id: number;
    factory_customer_name: string;
    factory_customer_email: string;
    factory_customer_phone?: string;
    factory_id?: number;
    factory_name?: string;
    order_date: string;
    required_date: string;
    status: FactoryCustomerOrderStatus;
    priority: OrderPriority;
    total_value: number;
    paid_amount: number;
    outstanding_amount: number;
    currency: string;
    sales_person: string;
    notes?: string;
    terms?: string;
    valid_until?: string;
    subtotal: number;
    tax_rate: number;
    tax_amount: number;
    billing_address?: Address;
    shipping_address?: Address;
    line_items: FactoryCustomerOrderLineItem[];
    created_at: string;
    updated_at: string;
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
    /** Customer's purchase order number (shown on challan + bill). */
    po_number?: string;
    /** Customer's purchase order date (ISO date string). */
    po_date?: string;
    /** Latest linked work order number (read-only, populated by backend join). */
    latest_work_order_number?: string;
    /** Creation timestamp of the latest linked work order (read-only). */
    latest_work_order_date?: string;
    /** Customer's company (joined from factory_customers). */
    customer_company?: string;
    /** Customer's VAT number (joined from factory_customers, V139). Used to pre-fill the delivery dialog. */
    customer_vat_number?: string | null;
}

export interface FactoryCustomerOrderLineItem {
    id: string;
    order_id: string;
    product_id: string;
    product_name: string;
    product_sku: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    /** Present on some API responses (maps to DB `line_total`). */
    line_total?: number;
    /** Cumulative qty already shipped via deliveries (V131+). */
    delivered_qty?: number;
    /** Cumulative qty already invoiced via delivery invoices (V131+). */
    invoiced_qty?: number;
    /** Joined from products: buyer's item code (V142). */
    customer_item_code?: string | null;
    notes?: string;
    specifications?: string;
    created_at: string;
    updated_at: string;
}

// =====================================================
// Deliveries (challans) — partial-delivery feature (V131)
// =====================================================

export type DeliveryStatus = 'shipped' | 'delivered' | 'returned' | 'cancelled';

/** One order contributing items to a delivery (multi-order shipments, V145+). */
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
    /** Joined from products: corrugation layers for cartons. */
    ply?: number | null;
    /** Free-text bundle layout (e.g. "20 x 50") shipped for this line. */
    bundles?: string | null;
    /** Per-shipment item code override; falls back to products.customer_item_code (V133). */
    item_code?: string | null;
    created_at: string;
}

export interface Delivery {
    id: number;
    delivery_number: string;
    /** Authoritative scope: customer this delivery is for (V145+). */
    factory_customer_id: number;
    factory_customer_name?: string;
    /** Primary/opened-from order — optional for customer-level deliveries (V145+). */
    customer_order_id?: number;
    customer_order_number?: string;
    /** All orders whose lines are in this delivery (V145+). */
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
    /** Per-shipment VAT registration override (V132). */
    vat_number?: string;
    /** Challan-only carton label printed after "Master Carton For:". */
    master_carton_for?: string | null;
    /** Challan-only sub-label printed under the carton-for line (e.g. brand "Hanicom"). */
    master_carton_sub_label?: string | null;
    items: DeliveryItem[];
    subtotal: number;
    created_at: string;
    updated_at?: string;
}

export interface CreateDeliveryItemRequest {
    order_line_item_id: number | string;
    quantity: number;
    /** Free-text bundle layout (e.g. "20 x 50"). */
    bundles?: string | null;
    /** Item code override for this shipment line (V133). */
    item_code?: string | null;
}

export interface CreateDeliveryRequest {
    items: CreateDeliveryItemRequest[];
    delivery_date?: string;
    tracking_number?: string;
    carrier?: string;
    estimated_delivery_date?: string;
    notes?: string;
    /** Per-shipment VAT registration override (V132). */
    vat_number?: string;
    /** Challan-only carton label printed after "Master Carton For:". */
    master_carton_for?: string | null;
    /** Challan-only sub-label printed under the carton-for line. */
    master_carton_sub_label?: string | null;
    /** Customer-level entry point only (V145+). Order-level routes derive it from the path. */
    factory_customer_id?: number;
}

export interface DeliveryQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: DeliveryStatus;
    factory_customer_id?: string | number;
    date_from?: string;
    date_to?: string;
    sort_by?: 'delivery_date' | 'created_at' | 'delivery_number';
    sort_order?: 'asc' | 'desc';
}

export interface DeliveryListResponse {
    deliveries: Delivery[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// ---------------------------------------------------------------------------
// Delivery (challan) returns (V156)
// ---------------------------------------------------------------------------

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
}

export interface DeliveryReturnQueryParams {
    page?: number;
    limit?: number;
    status?: DeliveryReturnStatus;
    factory_customer_id?: string | number;
}

export interface DeliveryReturnListResponse {
    returns: DeliveryReturn[];
    total: number;
    page: number;
    limit: number;
}

export interface Address {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
    shipping_line?: string;
    billing_line?: string;
}

export interface FactoryCustomer {
    id: number;
    name: string;
    email: string | null;
    phone?: string;
    company?: string;
    address?: Address;
    credit_limit?: number;
    payment_terms?: string;
    opening_balance?: number;
    vat_number?: string | null;
    is_active?: boolean;
    created_at: string;
    updated_at: string;
    total_order_value?: number;
    total_paid_amount?: number;
    total_outstanding_amount?: number;
    order_count?: number;
}

export interface CreateCustomerRequest {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    address?: Address;
    credit_limit?: number;
    payment_terms?: string;
    opening_balance?: number;
    vat_number?: string;
}

export interface UpdateCustomerRequest {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    address?: Address;
    credit_limit?: number;
    payment_terms?: string;
    opening_balance?: number;
    vat_number?: string;
    is_active?: boolean;
}

export interface FactoryProduct {
    id: number;
    name: string;
    sku: string;
    description?: string;
    unit_price: number;
    currency: string;
    current_stock?: number;
    status?: string;
    category_name?: string;
    created_at: string;
    updated_at: string;
}

// BOM-eligible component product — includes cost/UoM/supplier fields needed by BOMEditor.
export interface BomComponentProduct extends FactoryProduct {
    cost_price: number;
    unit_of_measure: string;
    supplier_id?: number | null;
    uses_per_unit?: number | null;
}

// Request/Response Types
export interface CreateCustomerOrderRequest {
    factory_customer_id: number;
    factory_customer_name: string;
    factory_customer_email: string;
    factory_customer_phone?: string;
    payment_terms?: string;
    /** API Joi schema expects string (numeric id as string). */
    factory_id?: string;
    order_date: string;
    required_date: string;
    priority: OrderPriority;
    currency?: string;
    sales_person: string;
    notes?: string;
    terms?: string;
    status?: FactoryCustomerOrderStatus;
    valid_until?: string;
    subtotal?: number;
    tax_rate?: number;
    tax_amount?: number;
    pr_no?: string;
    po_number?: string;
    po_date?: string;
    billing_address?: Address;
    shipping_address?: Address;
    line_items: CreateOrderLineItemRequest[];
}

export interface CreateOrderLineItemRequest {
    product_id: number;
    // product_name: string;
    // product_sku: string;
    quantity: number;
    unit_price: number;
    notes?: string;
}

export interface UpdateCustomerOrderRequest {
    factory_customer_name?: string;
    factory_customer_email?: string;
    factory_customer_phone?: string;
    payment_terms?: string;
    factory_id?: string;
    order_date?: string;
    required_date?: string;
    priority?: OrderPriority;
    currency?: string;
    sales_person?: string;
    notes?: string;
    terms?: string;
    pr_no?: string;
    po_number?: string;
    po_date?: string;
    billing_address?: Address;
    shipping_address?: Address;
    line_items?: UpdateOrderLineItemRequest[];
    /** When true on a quoted order, backend stores current lines in quoted_snapshot before replace. */
    capture_quoted_snapshot?: boolean;
}

export interface UpdateOrderLineItemRequest {
    id?: string;
    product_id: string | number;
    // product_name: string;
    // product_sku: string;
    quantity: number;
    unit_price: number;
    notes?: string;
    /** Backend update schema uses `specifications` (line item text). */
    specifications?: string;
}

export interface OrderQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: FactoryCustomerOrderStatus;
    priority?: OrderPriority;
    factory_customer_id?: string;
    sales_person?: string;
    order_date_from?: string;
    order_date_to?: string;
    required_date_from?: string;
    required_date_to?: string;
    sort_by?: 'order_date' | 'required_date' | 'total_value' | 'status' | 'priority' | 'created_at';
    sort_order?: 'asc' | 'desc';
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

export interface QuotationStats {
    total_quotations: number;
    total_value: number;
    approved_value: number;
    conversion_rate: number;
    total_quoted_value?: number;
    draft_count?: number;
    sent_count?: number;
    approved_count?: number;
    rejected_count?: number;
    converted_count?: number;
}

export interface ApproveOrderRequest {
    approved: boolean;
    notes?: string;
}

export interface UpdateOrderStatusRequest {
    status: FactoryCustomerOrderStatus;
    notes?: string;
}

export interface BulkUpdateOrderStatusRequest {
    orderIds: string[];
    status: FactoryCustomerOrderStatus;
    notes?: string;
}

export interface ExportOrdersRequest {
    format?: 'csv' | 'json';
    status?: FactoryCustomerOrderStatus;
    priority?: OrderPriority;
    order_date_from?: string;
    order_date_to?: string;
}

export interface RecordPaymentRequest {
    payment_amount: number;
    payment_method: string;
    payment_date?: string;
    payment_reference?: string;
    notes?: string;
    factory_sales_invoice_id?: number;
    additional_metadata?: Record<string, unknown>;
}

export interface FactoryCustomerPayment {
    id: number;
    factory_customer_order_id: string;
    order_number?: string;
    customer_name?: string;
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
    recorded_by_username?: string;
    updated_at?: string;
    additional_metadata?: Record<string, unknown>;
    voucher_id?: number;
    voucher_no?: string;
}

export interface PaymentSummary {
    orderId: number;
    orderNumber: string;
    totalValue: number;
    paidAmount: number;
    outstandingAmount: number;
    paymentCount: number;
    lastPaymentDate?: string;
}

export interface PaginatedResponse<T> {
    orders: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// =====================================================
// Customer Orders API Service
// =====================================================

export class CustomerOrdersApiService {
    private static readonly BASE_URL = '/factory/customer-orders';

    // Get all customer orders with pagination and filtering
    static async getCustomerOrders(params?: OrderQueryParams): Promise<PaginatedResponse<FactoryCustomerOrder>> {
        const queryString = params ? '?' + new URLSearchParams(
            Object.entries(params).reduce((acc, [key, value]) => {
                if (value !== undefined && value !== null) {
                    acc[key] = String(value);
                }
                return acc;
            }, {} as Record<string, string>)
        ).toString() : '';

        return makeRequest<PaginatedResponse<FactoryCustomerOrder>>(`${this.BASE_URL}${queryString}`);
    }

    // Get customer order by ID
    static async getCustomerOrderById(id: string): Promise<FactoryCustomerOrder> {
        return makeRequest<FactoryCustomerOrder>(`${this.BASE_URL}/${id}`);
    }

    // Get order statistics
    static async getOrderStats(): Promise<OrderStats> {
        return makeRequest<OrderStats>(`${this.BASE_URL}/stats`);
    }

    // Get quotation statistics
    static async getQuotationStats(params?: { factory_id?: number }): Promise<QuotationStats> {
        const queryString = params?.factory_id ? `?factory_id=${params.factory_id}` : '';
        // In the consolidated model, we'll use a special endpoint or just the same stats with mapping
        // For now, let's assume the backend handles it at /stats or similar.
        // Actually, I'll point it to orders/stats for now since I unified them.
        return makeRequest<QuotationStats>(`${this.BASE_URL}/stats${queryString}`);
    }

    // Create new customer order
    static async createCustomerOrder(data: CreateCustomerOrderRequest): Promise<FactoryCustomerOrder> {
        return makeRequest<FactoryCustomerOrder>(this.BASE_URL, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Download order/quotation PDF
    static async downloadQuotationPdf(id: number | string): Promise<void> {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api';
        const response = await fetch(`${baseUrl}/factory/customer-orders/${id}/pdf`, {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to download PDF');

        // Extract filename from Content-Disposition if available
        let filename = `quotation-${id}.pdf`;
        const disposition = response.headers.get('content-disposition');
        if (disposition && disposition.includes('filename=')) {
            const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
    }

    /**
     * Fetches the quotation PDF from the backend and triggers the browser's
     * native print dialog on it via a hidden iframe. Uses the same endpoint
     * as downloadQuotationPdf — the backend renders the PDF with Puppeteer,
     * so the output is identical to what the user would see when downloading.
     */
    static async printQuotationPdf(id: number | string): Promise<void> {
        await this._fetchAndPrint(`/factory/customer-orders/${id}/pdf`, 'quotation');
    }

    /**
     * Shared helper: fetches a PDF from the given API path (relative to NEXT_PUBLIC_API_URL)
     * and opens the browser's native print dialog via a hidden iframe.
     */
    private static async _fetchAndPrint(apiPath: string, label: string): Promise<void> {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api';
        const response = await fetch(`${baseUrl}${apiPath}`, {
            method: 'GET',
            credentials: 'include',
        });
        if (!response.ok) throw new Error(`Failed to load ${label} PDF`);

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = 'none';
        iframe.src = url;

        iframe.onload = () => {
            // Small delay lets Chrome/Firefox finish painting the PDF viewer.
            setTimeout(() => {
                try {
                    iframe.contentWindow?.focus();
                    iframe.contentWindow?.print();
                } catch (err) {
                    console.error(`Failed to invoke print on ${label} PDF:`, err);
                }
            }, 100);
        };

        document.body.appendChild(iframe);

        // Clean up after the print dialog has had plenty of time to appear.
        window.setTimeout(() => {
            try {
                document.body.removeChild(iframe);
            } catch {
                /* already removed */
            }
            window.URL.revokeObjectURL(url);
        }, 60_000);
    }

    // Download invoice (Bill) PDF
    static async downloadInvoicePdf(id: number | string): Promise<void> {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api';
        const response = await fetch(`${baseUrl}/factory/customer-orders/${id}/invoice`, {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to download Invoice PDF');
        
        let filename = `invoice-${id}.pdf`;
        const disposition = response.headers.get('content-disposition');
        if (disposition && disposition.includes('filename=')) {
            const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
    }

    // Download challan PDF
    static async downloadChallanPdf(id: number | string): Promise<void> {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api';
        const response = await fetch(`${baseUrl}/factory/customer-orders/${id}/challan`, {
            method: 'GET',
            credentials: 'include'
        });
        if (!response.ok) throw new Error('Failed to download Challan PDF');
        
        let filename = `challan-${id}.pdf`;
        const disposition = response.headers.get('content-disposition');
        if (disposition && disposition.includes('filename=')) {
            const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
            if (filenameMatch && filenameMatch[1]) {
                filename = filenameMatch[1];
            }
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
    }

    // Update customer order
    static async updateCustomerOrder(id: string, data: UpdateCustomerOrderRequest): Promise<FactoryCustomerOrder> {
        return makeRequest<FactoryCustomerOrder>(`${this.BASE_URL}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Approve/reject customer order
    static async approveCustomerOrder(id: string, approved: boolean, notes?: string): Promise<FactoryCustomerOrder> {
        return makeRequest<FactoryCustomerOrder>(`${this.BASE_URL}/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify({ approved, notes }),
        });
    }

    /** Replace line items and approve in one request (convert quotation / accept with line edits). */
    static async convertOrderWithLines(
        id: string,
        data: { line_items: UpdateOrderLineItemRequest[]; notes?: string }
    ): Promise<FactoryCustomerOrder> {
        return makeRequest<FactoryCustomerOrder>(`${this.BASE_URL}/${id}/convert-with-lines`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Update order status
    static async updateOrderStatus(id: string, status: FactoryCustomerOrderStatus, notes?: string): Promise<FactoryCustomerOrder> {
        return makeRequest<FactoryCustomerOrder>(`${this.BASE_URL}/${id}/status`, {
            method: 'POST',
            body: JSON.stringify({ status, notes }),
        });
    }

    // Bulk update order status
    static async bulkUpdateOrderStatus(orderIds: string[], status: FactoryCustomerOrderStatus, notes?: string): Promise<{ updatedOrders: FactoryCustomerOrder[] }> {
        return makeRequest<{ updatedOrders: FactoryCustomerOrder[] }>(`${this.BASE_URL}/bulk/status`, {
            method: 'POST',
            body: JSON.stringify({ orderIds, status, notes }),
        });
    }

    // Export customer orders
    static async exportCustomerOrders(params?: ExportOrdersRequest): Promise<string | FactoryCustomerOrder[]> {
        const queryString = params ? '?' + new URLSearchParams(
            Object.entries(params).reduce((acc, [key, value]) => {
                if (value !== undefined && value !== null) {
                    acc[key] = String(value);
                }
                return acc;
            }, {} as Record<string, string>)
        ).toString() : '';

        const format = params?.format || 'csv';

        if (format === 'csv') {
            // For CSV, we expect a string response
            return makeRequest<string>(`${this.BASE_URL}/export${queryString}`);
        } else {
            // For JSON, we expect an array of orders
            return makeRequest<FactoryCustomerOrder[]>(`${this.BASE_URL}/export${queryString}`);
        }
    }

    // Delete customer order
    static async deleteCustomerOrder(id: string, force?: boolean): Promise<{ deleted: boolean }> {
        const queryString = force ? '?force=true' : '';
        return makeRequest<{ deleted: boolean }>(`${this.BASE_URL}/${id}${queryString}`, {
            method: 'DELETE',
        });
    }

    // Bulk delete customer orders
    static async bulkDeleteCustomerOrders(orderIds: string[], force?: boolean): Promise<{ deletedOrders: FactoryCustomerOrder[] }> {
        return makeRequest<{ deletedOrders: FactoryCustomerOrder[] }>(`${this.BASE_URL}/bulk`, {
            method: 'DELETE',
            body: JSON.stringify({ orderIds, force }),
        });
    }

    // Search customers (for order creation)
    static async searchCustomers(query: string): Promise<FactoryCustomer[]> {
        return makeRequest<FactoryCustomer[]>(`/factory/customers/search?q=${encodeURIComponent(query)}`);
    }

    // Search products (for order creation)
    static async searchProducts(query: string): Promise<FactoryProduct[]> {
        return makeRequest<FactoryProduct[]>(`/factory/products/search?q=${encodeURIComponent(query)}`);
    }

    // Get all customers (for dropdowns)
    static async getAllCustomers(): Promise<FactoryCustomer[]> {
        return makeRequest<FactoryCustomer[]>(`/factory/customers`);
    }

    // Get all products (for dropdowns)
    static async getAllProducts(): Promise<FactoryProduct[]> {
        return makeRequest<FactoryProduct[]>(`/factory/products`);
    }

    // Get orderable products only — excludes Raw Materials and Ready Raw Materials (for order/quotation creation)
    static async getAllOrderableProducts(): Promise<FactoryProduct[]> {
        return makeRequest<FactoryProduct[]>(`/factory/products/orderable`);
    }

    // Get BOM-eligible parent products — Ready Goods and Ready Raw Materials (excludes Raw Materials)
    static async getAllBomParentProducts(): Promise<FactoryProduct[]> {
        return makeRequest<FactoryProduct[]>(`/factory/products/bom-parent-eligible`);
    }

    // Get BOM-eligible component products — Raw Materials and Ready Raw Materials (excludes Ready Goods)
    static async getAllBomComponentProducts(): Promise<BomComponentProduct[]> {
        return makeRequest<BomComponentProduct[]>(`/factory/products/bom-component-eligible`);
    }

    // Customer CRUD operations
    static async getCustomerById(id: string): Promise<FactoryCustomer> {
        return makeRequest<FactoryCustomer>(`/factory/customers/${id}`);
    }

    static async createCustomer(data: CreateCustomerRequest): Promise<FactoryCustomer> {
        return makeRequest<FactoryCustomer>(`/factory/customers`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    static async updateCustomer(id: string, data: UpdateCustomerRequest): Promise<FactoryCustomer> {
        return makeRequest<FactoryCustomer>(`/factory/customers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // Ship customer order. When `items` is provided, ships only those quantities
    // (partial delivery); otherwise ships all remaining quantity in one delivery.
    static async shipCustomerOrder(
        orderId: string,
        shippingData: {
            notes?: string;
            tracking_number?: string;
            carrier?: string;
            estimated_delivery_date?: string;
            items?: CreateDeliveryItemRequest[];
        }
    ): Promise<FactoryCustomerOrder & { delivery_id?: number; delivery_number?: string; invoice_id?: number; invoice_number?: string }> {
        return makeRequest(`/factory/customer-orders/${orderId}/ship`, {
            method: 'POST',
            body: JSON.stringify(shippingData),
        });
    }

    static async deleteCustomer(id: string): Promise<{ deleted: boolean }> {
        return makeRequest<{ deleted: boolean }>(`/factory/customers/${id}`, {
            method: 'DELETE',
        });
    }

    // ---- Partial deliveries (V131) ----

    /** Create a partial (or full) delivery — auto-generates the per-delivery invoice. */
    static async createDelivery(
        orderId: string,
        data: CreateDeliveryRequest
    ): Promise<{ delivery: Delivery; invoice: { id: number; invoice_number: string } }> {
        return makeRequest(`${this.BASE_URL}/${orderId}/deliveries`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Customer-level delivery: items may span multiple of this customer's orders.
     * No primary order is recorded. (V145+)
     */
    static async createCustomerDelivery(
        customerId: string | number,
        data: CreateDeliveryRequest
    ): Promise<{ delivery: Delivery; invoice: { id: number; invoice_number: string } }> {
        return makeRequest(`${this.BASE_URL}/customers/${customerId}/deliveries`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /**
     * Open orders for a customer (status in_production/completed/partially_shipped),
     * used by the "Add lines from another order" picker and the customer-level
     * delivery page.
     */
    static async listOpenOrdersForCustomer(customerId: string | number): Promise<FactoryCustomerOrder[]> {
        // The existing GET /customer-orders endpoint accepts factory_customer_id and
        // status filters; we call it three times (one per status) and merge — the
        // backend filters by exact match so a single comma-separated value isn't
        // supported. Cost is fine for typical small N.
        const statuses: FactoryCustomerOrderStatus[] = [
            'in_production',
            'completed',
            'partially_shipped',
        ];
        const lists = await Promise.all(
            statuses.map(s =>
                CustomerOrdersApiService.getCustomerOrders({
                    factory_customer_id: String(customerId),
                    status: s,
                    limit: 100,
                })
            )
        );
        return lists.flatMap(r => r.orders ?? []);
    }

    /** List all deliveries for an order (oldest first). */
    static async listDeliveries(orderId: string): Promise<Delivery[]> {
        return makeRequest<Delivery[]>(`${this.BASE_URL}/${orderId}/deliveries`);
    }

    /** Paginated list of all deliveries across customers/orders. */
    static async listAllDeliveries(params: DeliveryQueryParams = {}): Promise<DeliveryListResponse> {
        const query = new URLSearchParams();
        if (params.page) query.set('page', String(params.page));
        if (params.limit) query.set('limit', String(params.limit));
        if (params.search) query.set('search', params.search);
        if (params.status) query.set('status', params.status);
        if (params.factory_customer_id) query.set('factory_customer_id', String(params.factory_customer_id));
        if (params.date_from) query.set('date_from', params.date_from);
        if (params.date_to) query.set('date_to', params.date_to);
        if (params.sort_by) query.set('sort_by', params.sort_by);
        if (params.sort_order) query.set('sort_order', params.sort_order);
        const qs = query.toString();
        return makeRequest<DeliveryListResponse>(`${this.BASE_URL}/deliveries${qs ? `?${qs}` : ''}`);
    }

    /** List all deliveries (across orders) for a single customer (newest first). */
    static async listDeliveriesByCustomer(customerId: string | number): Promise<Delivery[]> {
        return makeRequest<Delivery[]>(`${this.BASE_URL}/customers/${customerId}/deliveries`);
    }

    /** Get a single delivery by id (with line items + linked invoice info). */
    static async getDelivery(deliveryId: string | number): Promise<Delivery> {
        return makeRequest<Delivery>(`${this.BASE_URL}/deliveries/${deliveryId}`);
    }

    /** Cancel a delivery (reverses qty rollups, returns stock, cancels invoice). */
    static async cancelDelivery(deliveryId: string | number, reason?: string): Promise<Delivery> {
        return makeRequest<Delivery>(`${this.BASE_URL}/deliveries/${deliveryId}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        });
    }

    // ---- Delivery (challan) returns (V156) ----

    /** Create a draft return against a delivery. */
    static async createDeliveryReturn(
        deliveryId: string | number,
        data: CreateDeliveryReturnRequest
    ): Promise<DeliveryReturn> {
        return makeRequest<DeliveryReturn>(`${this.BASE_URL}/deliveries/${deliveryId}/returns`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    /** Paginated list of all delivery returns. */
    static async listDeliveryReturns(params: DeliveryReturnQueryParams = {}): Promise<DeliveryReturnListResponse> {
        const query = new URLSearchParams();
        if (params.page) query.set('page', String(params.page));
        if (params.limit) query.set('limit', String(params.limit));
        if (params.status) query.set('status', params.status);
        if (params.factory_customer_id) query.set('factory_customer_id', String(params.factory_customer_id));
        const qs = query.toString();
        return makeRequest<DeliveryReturnListResponse>(`${this.BASE_URL}/returns${qs ? `?${qs}` : ''}`);
    }

    /** Returns recorded against a single delivery (newest first). */
    static async listReturnsForDelivery(deliveryId: string | number): Promise<DeliveryReturn[]> {
        return makeRequest<DeliveryReturn[]>(`${this.BASE_URL}/deliveries/${deliveryId}/returns`);
    }

    static async getDeliveryReturn(returnId: string | number): Promise<DeliveryReturn> {
        return makeRequest<DeliveryReturn>(`${this.BASE_URL}/returns/${returnId}`);
    }

    static async approveDeliveryReturn(returnId: string | number): Promise<DeliveryReturn> {
        return makeRequest<DeliveryReturn>(`${this.BASE_URL}/returns/${returnId}/approve`, { method: 'POST' });
    }

    static async rejectDeliveryReturn(returnId: string | number): Promise<DeliveryReturn> {
        return makeRequest<DeliveryReturn>(`${this.BASE_URL}/returns/${returnId}/reject`, { method: 'POST' });
    }

    static async cancelDeliveryReturn(returnId: string | number): Promise<DeliveryReturn> {
        return makeRequest<DeliveryReturn>(`${this.BASE_URL}/returns/${returnId}/cancel`, { method: 'POST' });
    }

    /** Download per-delivery challan PDF (only this shipment's items). */
    static async downloadDeliveryChallan(deliveryId: string | number): Promise<void> {
        await this._downloadDeliveryPdf(deliveryId, 'challan');
    }

    /** Download per-delivery invoice PDF (only this shipment's items). */
    static async downloadDeliveryInvoice(deliveryId: string | number): Promise<void> {
        await this._downloadDeliveryPdf(deliveryId, 'invoice');
    }

    /** Print per-delivery challan PDF via the browser's native print dialog. */
    static async printDeliveryChallan(deliveryId: string | number): Promise<void> {
        await this._fetchAndPrint(
            `/factory/customer-orders/deliveries/${deliveryId}/challan`,
            'challan'
        );
    }

    /** Print per-delivery invoice PDF via the browser's native print dialog. */
    static async printDeliveryInvoice(deliveryId: string | number): Promise<void> {
        await this._fetchAndPrint(
            `/factory/customer-orders/deliveries/${deliveryId}/invoice`,
            'invoice'
        );
    }

    /**
     * Download the consolidated monthly bill PDF for a customer over an
     * arbitrary date range. The backend lists every non-cancelled challan in
     * the period plus a payment summary; it does not create any new invoice.
     */
    static async downloadMonthlyBill(
        customerId: string | number,
        fromDate: string,
        toDate: string
    ): Promise<void> {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api';
        const qs = new URLSearchParams({ from: fromDate, to: toDate }).toString();
        const response = await fetch(
            `${baseUrl}/factory/customer-orders/customers/${customerId}/monthly-bill?${qs}`,
            { method: 'GET', credentials: 'include' }
        );
        if (!response.ok) {
            // Surface the server message (e.g. "No challans found in the selected period").
            let message = `Failed to download monthly bill (${response.status})`;
            try {
                const body = await response.json();
                if (body?.message) message = body.message;
            } catch {
                /* non-JSON response */
            }
            throw new Error(message);
        }

        let filename = `monthly-bill-${customerId}-${fromDate}-to-${toDate}.pdf`;
        const disposition = response.headers.get('content-disposition');
        if (disposition && disposition.includes('filename=')) {
            const match = disposition.match(/filename="?([^"]+)"?/);
            if (match && match[1]) filename = match[1];
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
    }

    private static async _downloadDeliveryPdf(
        deliveryId: string | number,
        kind: 'challan' | 'invoice'
    ): Promise<void> {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api';
        const response = await fetch(
            `${baseUrl}/factory/customer-orders/deliveries/${deliveryId}/${kind}`,
            { method: 'GET', credentials: 'include' }
        );
        if (!response.ok) throw new Error(`Failed to download ${kind} PDF`);

        let filename = `${kind}-${deliveryId}.pdf`;
        const disposition = response.headers.get('content-disposition');
        if (disposition && disposition.includes('filename=')) {
            const match = disposition.match(/filename="?([^"]+)"?/);
            if (match && match[1]) filename = match[1];
        }

        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
    }

    // Payment recording
    static async recordPayment(orderId: string, data: RecordPaymentRequest): Promise<FactoryCustomerPayment> {
        return makeRequest<FactoryCustomerPayment>(`/factory/customer-orders/${orderId}/payments`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // Get payment history
    static async getPaymentHistory(orderId: string): Promise<{ payments: FactoryCustomerPayment[] }> {
        return makeRequest<{ payments: FactoryCustomerPayment[] }>(`/factory/customer-orders/${orderId}/payments`);
    }

    // Get payment summary
    static async getPaymentSummary(orderId: string): Promise<PaymentSummary> {
        return makeRequest<PaymentSummary>(`/factory/customer-orders/${orderId}/payments/summary`);
    }

    // Get all customer payments across all orders
    static async getAllPayments(params?: {
        page?: number;
        limit?: number;
        customer_id?: string;
        factory_id?: string;
        start_date?: string;
        end_date?: string;
        search?: string;
    }): Promise<{
        payments: FactoryCustomerPayment[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    }> {
        const queryString = params ? '?' + new URLSearchParams(
            Object.entries(params).reduce((acc, [key, value]) => {
                if (value !== undefined && value !== null) {
                    acc[key] = String(value);
                }
                return acc;
            }, {} as Record<string, string>)
        ).toString() : '';

        return makeRequest(`${this.BASE_URL}/payments/all${queryString}`);
    }
}

// =====================================================
// React Query Keys (Optional - for better integration)
// =====================================================

export const customerOrdersQueryKeys = {
    all: ['customer-orders'] as const,
    lists: () => [...customerOrdersQueryKeys.all, 'list'] as const,
    list: (params?: OrderQueryParams) => [...customerOrdersQueryKeys.lists(), params] as const,
    stats: () => [...customerOrdersQueryKeys.all, 'stats'] as const,
    detail: (id: string) => [...customerOrdersQueryKeys.all, 'detail', id] as const,
};

export default CustomerOrdersApiService;