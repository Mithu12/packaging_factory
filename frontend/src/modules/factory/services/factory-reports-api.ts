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
};
