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
}

export interface FactoryCustomer {
    id: number;
    name: string;
    email: string;
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
    email: string;
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
    factory_id?: number;
    order_date: string;
    required_date: string;
    priority: OrderPriority;
    currency: string;
    sales_person: string;
    notes?: string;
    terms?: string;
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
    factory_id?: number;
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
}

export interface UpdateOrderLineItemRequest {
    id?: string;
    product_id: string | number;
    // product_name: string;
    // product_sku: string;
    quantity: number;
    unit_price: number;
    notes?: string;
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

    // Create new customer order
    static async createCustomerOrder(data: CreateCustomerOrderRequest): Promise<FactoryCustomerOrder> {
        return makeRequest<FactoryCustomerOrder>(this.BASE_URL, {
            method: 'POST',
            body: JSON.stringify(data),
        });
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