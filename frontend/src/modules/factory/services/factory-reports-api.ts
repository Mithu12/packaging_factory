import { apiClient } from "@/services/apiClient";

export type FactoryCustomerOrderStatus =
    | "draft"
    | "pending"
    | "quoted"
    | "approved"
    | "rejected"
    | "in_production"
    | "completed"
    | "partially_shipped"
    | "shipped"
    | "cancelled";

export const ALL_ORDER_STATUSES: FactoryCustomerOrderStatus[] = [
    "draft",
    "pending",
    "quoted",
    "approved",
    "rejected",
    "in_production",
    "completed",
    "partially_shipped",
    "shipped",
    "cancelled",
];

export const DEFAULT_OPEN_ORDER_STATUSES: FactoryCustomerOrderStatus[] = [
    "pending",
    "approved",
    "in_production",
];

export interface StockVsOrderDemandRow {
    product_id: number;
    sku: string;
    product_code: string | null;
    name: string;
    unit_of_measure: string | null;
    category_name: string;
    current_stock: number;
    reserved_stock: number;
    available_stock: number;
    ordered_qty: number;
    order_count: number;
    net_position: number;
}

export interface StockVsOrderDemandSummary {
    total_products: number;
    products_short: number;
    total_current_stock: number;
    total_available_stock: number;
    total_ordered_qty: number;
    statuses: FactoryCustomerOrderStatus[];
}

export interface StockVsOrderDemandResponse {
    rows: StockVsOrderDemandRow[];
    summary: StockVsOrderDemandSummary;
}

export interface StockVsOrderDemandParams {
    statuses: FactoryCustomerOrderStatus[];
    search?: string;
}

export interface CustomerPaymentReminderRow {
    id: string;
    name: string;
    company: string | null;
    email: string | null;
    phone: string | null;
    currency: string;
    opening_balance: number;
    total_outstanding_amount: number;
    open_invoice_count: number;
    not_yet_due: number;
    bucket_0_30: number;
    bucket_31_60: number;
    bucket_61_90: number;
    bucket_90_plus: number;
    max_days_overdue: number;
}

export interface CustomerPaymentReminderSummary {
    customers_count: number;
    total_outstanding: number;
    total_over_60: number;
    total_over_90: number;
}

export interface CustomerPaymentReminderListResponse {
    rows: CustomerPaymentReminderRow[];
    summary: CustomerPaymentReminderSummary;
}

export interface CustomerPaymentReminderListParams {
    search?: string;
}

export interface CustomerPaymentReminderInvoice {
    invoice_id: string;
    invoice_number: string;
    invoice_date: string;
    due_date: string;
    total_amount: number;
    paid_amount: number;
    outstanding_amount: number;
    status: string;
    days_overdue: number;
}

export interface CustomerPaymentReminderDetail {
    customer: {
        id: string;
        name: string;
        company: string | null;
        email: string | null;
        phone: string | null;
        address: Record<string, any> | null;
        vat_number: string | null;
        payment_terms: string | null;
        credit_limit: number | null;
        opening_balance: number;
        total_outstanding_amount: number;
        currency: string;
    };
    invoices: CustomerPaymentReminderInvoice[];
    aging: {
        not_yet_due: number;
        bucket_0_30: number;
        bucket_31_60: number;
        bucket_61_90: number;
        bucket_90_plus: number;
        total_outstanding: number;
        max_days_overdue: number;
    };
    latest_payment_date: string | null;
}

export const FactoryReportsApi = {
    getStockVsOrderDemand: async (
        params: StockVsOrderDemandParams
    ): Promise<StockVsOrderDemandResponse> => {
        const response = await apiClient.get("/factory/reports/stock-vs-order-demand", {
            params: {
                statuses: params.statuses.join(","),
                ...(params.search ? { search: params.search } : {}),
            },
        });
        return response.data.data;
    },

    getCustomerPaymentReminders: async (
        params: CustomerPaymentReminderListParams
    ): Promise<CustomerPaymentReminderListResponse> => {
        const response = await apiClient.get("/factory/reports/customer-payment-reminders", {
            params: {
                ...(params.search ? { search: params.search } : {}),
            },
        });
        return response.data.data;
    },

    getCustomerPaymentReminderDetail: async (
        customerId: string
    ): Promise<CustomerPaymentReminderDetail> => {
        const response = await apiClient.get(
            `/factory/reports/customer-payment-reminders/${encodeURIComponent(customerId)}`
        );
        return response.data.data;
    },
};
