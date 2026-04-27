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
    notes?: string;
    specifications?: string;
    created_at: string;
    updated_at: string;
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
}

export interface UpdateCustomerRequest {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    address?: Address;
    credit_limit?: number;
    payment_terms?: string;
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
    created_at: string;
    updated_at: string;
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
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api';
        const response = await fetch(`${baseUrl}/factory/customer-orders/${id}/pdf`, {
            method: 'GET',
            credentials: 'include',
        });
        if (!response.ok) throw new Error('Failed to load quotation PDF');

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
                    console.error('Failed to invoke print on quotation PDF:', err);
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

    // Ship customer order
    static async shipCustomerOrder(
        orderId: string,
        shippingData: {
            notes?: string;
            tracking_number?: string;
            carrier?: string;
            estimated_delivery_date?: string;
        }
    ): Promise<FactoryCustomerOrder> {
        return makeRequest<FactoryCustomerOrder>(`/factory/customer-orders/${orderId}/ship`, {
            method: 'POST',
            body: JSON.stringify(shippingData),
        });
    }

    static async deleteCustomer(id: string): Promise<{ deleted: boolean }> {
        return makeRequest<{ deleted: boolean }>(`/factory/customers/${id}`, {
            method: 'DELETE',
        });
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