import { apiClient } from "@/services/apiClient";
import type {
  SalesRepCustomer,
  SalesRepOrder,
  SalesRepInvoice,
  SalesRepPayment,
  SalesRepDelivery,
  SalesRepNotification,
  SalesRepDashboardStats,
  SalesRepReport,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreateOrderRequest,
  UpdateOrderRequest,
  CreateInvoiceRequest,
  CreatePaymentRequest,
  CreateDeliveryRequest,
  UpdateDeliveryRequest,
  CustomerFilters,
  OrderFilters,
  InvoiceFilters,
  PaymentFilters,
  DeliveryFilters,
  PaginationParams,
  PaginatedResponse,
  Product,
} from "../types";

class SalesRepApiService {
  private baseUrl = "/salesrep";

  // Dashboard
  async getDashboardStats(): Promise<SalesRepDashboardStats> {
    const response = await apiClient.get(`${this.baseUrl}/dashboard/stats`);
    return response.data;
  }

  // Customers
  async getCustomers(
    filters?: CustomerFilters,
    pagination?: PaginationParams
  ): Promise<
    | PaginatedResponse<SalesRepCustomer>
    | {
        customers: SalesRepCustomer[];
        total: number;
        page: number;
        limit: number;
        shared: boolean;
      }
  > {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });
    }

    if (pagination) {
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
    }

    const response = await apiClient.get(`${this.baseUrl}/customers?${params}`);
    return response.data.data;
  }

  async getCustomer(id: number): Promise<SalesRepCustomer> {
    const response = await apiClient.get(`${this.baseUrl}/customers/${id}`);
    return response.data;
  }

  async createCustomer(data: CreateCustomerRequest): Promise<SalesRepCustomer> {
    const response = await apiClient.post(`${this.baseUrl}/customers`, data);
    return response.data;
  }

  async updateCustomer(
    id: number,
    data: UpdateCustomerRequest
  ): Promise<SalesRepCustomer> {
    const response = await apiClient.put(
      `${this.baseUrl}/customers/${id}`,
      data
    );
    return response.data;
  }

  async deleteCustomer(id: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/customers/${id}`);
  }

  // Orders
  async getOrders(
    filters?: OrderFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<SalesRepOrder>> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });
    }

    if (pagination) {
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
    }

    const response = await apiClient.get(`${this.baseUrl}/orders?${params}`);
    return response.data.data;
  }

  async getOrder(id: number): Promise<SalesRepOrder> {
    const response = await apiClient.get(`${this.baseUrl}/orders/${id}`);
    return response.data.data;
  }

  async createOrder(data: CreateOrderRequest): Promise<SalesRepOrder> {
    const response = await apiClient.post(`${this.baseUrl}/orders`, data);
    return response.data.data;
  }

  async updateOrder(
    id: number,
    data: UpdateOrderRequest
  ): Promise<SalesRepOrder> {
    const response = await apiClient.put(`${this.baseUrl}/orders/${id}`, data);
    return response.data.data;
  }

  async deleteOrder(id: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/orders/${id}`);
  }

  async updateOrderStatus(id: number, status: string): Promise<SalesRepOrder> {
    const response = await apiClient.patch(
      `${this.baseUrl}/orders/${id}/status`,
      { status }
    );
    return response.data;
  }

  // Invoices
  async getInvoices(
    filters?: InvoiceFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<SalesRepInvoice>> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });
    }

    if (pagination) {
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
    }

    const response = await apiClient.get(`${this.baseUrl}/invoices?${params}`);
    return response.data;
  }

  async getInvoice(id: number): Promise<SalesRepInvoice> {
    const response = await apiClient.get(`${this.baseUrl}/invoices/${id}`);
    return response.data;
  }

  async createInvoice(data: CreateInvoiceRequest): Promise<SalesRepInvoice> {
    const response = await apiClient.post(`${this.baseUrl}/invoices`, data);
    return response.data;
  }

  async sendInvoice(id: number): Promise<SalesRepInvoice> {
    const response = await apiClient.post(
      `${this.baseUrl}/invoices/${id}/send`
    );
    return response.data;
  }

  // Payments
  async getPayments(
    filters?: PaymentFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<SalesRepPayment>> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });
    }

    if (pagination) {
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
    }

    const response = await apiClient.get(`${this.baseUrl}/payments?${params}`);
    return response.data;
  }

  async getPayment(id: number): Promise<SalesRepPayment> {
    const response = await apiClient.get(`${this.baseUrl}/payments/${id}`);
    return response.data;
  }

  async createPayment(data: CreatePaymentRequest): Promise<SalesRepPayment> {
    const response = await apiClient.post(`${this.baseUrl}/payments`, data);
    return response.data;
  }

  async getPaymentHistory(invoiceId?: number): Promise<SalesRepPayment[]> {
    const url = invoiceId
      ? `${this.baseUrl}/payments/history/${invoiceId}`
      : `${this.baseUrl}/payments/history`;
    const response = await apiClient.get(url);
    return response.data;
  }

  // Deliveries
  async getDeliveries(
    filters?: DeliveryFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<SalesRepDelivery>> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });
    }

    if (pagination) {
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
    }

    const response = await apiClient.get(
      `${this.baseUrl}/deliveries?${params}`
    );
    return response.data;
  }

  async getDelivery(id: number): Promise<SalesRepDelivery> {
    const response = await apiClient.get(`${this.baseUrl}/deliveries/${id}`);
    return response.data;
  }

  async createDelivery(data: CreateDeliveryRequest): Promise<SalesRepDelivery> {
    const response = await apiClient.post(`${this.baseUrl}/deliveries`, data);
    return response.data;
  }

  async updateDelivery(
    id: number,
    data: UpdateDeliveryRequest
  ): Promise<SalesRepDelivery> {
    const response = await apiClient.put(
      `${this.baseUrl}/deliveries/${id}`,
      data
    );
    return response.data;
  }

  async updateDeliveryStatus(
    id: number,
    status: string
  ): Promise<SalesRepDelivery> {
    const response = await apiClient.patch(
      `${this.baseUrl}/deliveries/${id}/status`,
      { status }
    );
    return response.data;
  }

  // Reports
  async getReports(
    reportType?: string,
    dateFrom?: string,
    dateTo?: string
  ): Promise<SalesRepReport[]> {
    const params = new URLSearchParams();

    if (reportType) params.append("report_type", reportType);
    if (dateFrom) params.append("date_from", dateFrom);
    if (dateTo) params.append("date_to", dateTo);

    const response = await apiClient.get(`${this.baseUrl}/reports?${params}`);
    return response.data;
  }

  async getReport(id: number): Promise<SalesRepReport> {
    const response = await apiClient.get(`${this.baseUrl}/reports/${id}`);
    return response.data;
  }

  async generateReport(
    reportType: string,
    dateFrom: string,
    dateTo: string
  ): Promise<SalesRepReport> {
    const response = await apiClient.post(`${this.baseUrl}/reports/generate`, {
      report_type: reportType,
      date_from: dateFrom,
      date_to: dateTo,
    });
    return response.data;
  }

  async exportReport(
    id: number,
    format: "pdf" | "excel" | "csv" = "pdf"
  ): Promise<Blob> {
    const response = await apiClient.get(
      `${this.baseUrl}/reports/${id}/export`,
      {
        params: { format },
        responseType: "blob",
      }
    );
    return response.data;
  }

  // Notifications
  async getNotifications(
    unreadOnly = false,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<SalesRepNotification>> {
    const params = new URLSearchParams();

    if (unreadOnly) params.append("unread_only", "true");

    if (pagination) {
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
    }

    const response = await apiClient.get(
      `${this.baseUrl}/notifications?${params}`
    );
    return response.data?.data;
  }

  async markNotificationAsRead(id: number): Promise<SalesRepNotification> {
    const response = await apiClient.patch(
      `${this.baseUrl}/notifications/${id}/read`
    );
    return response.data;
  }

  async markAllNotificationsAsRead(): Promise<void> {
    await apiClient.patch(`${this.baseUrl}/notifications/mark-all-read`);
  }

  async deleteNotification(id: number): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/notifications/${id}`);
  }

  // Products (from inventory module)
  async getProducts(
    filters?: {
      search?: string;
      category_id?: number;
      brand_id?: number;
      status?: string;
    },
    pagination?: PaginationParams
  ): Promise<{
    products: Product[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.append(key, value.toString());
        }
      });
    }

    if (pagination) {
      params.append("page", pagination.page.toString());
      params.append("limit", pagination.limit.toString());
    }

    const response = await apiClient.get(`/products?${params}`);
    return response.data.data;
  }

  async searchProducts(query: string): Promise<Product[]> {
    const response = await apiClient.get(
      `/api/products/search?q=${encodeURIComponent(query)}`
    );
    return response.data.data;
  }

  // Draft Order Approval Workflow Methods

  // Submit draft order for admin approval
  async submitDraftOrderForApproval(orderId: number): Promise<SalesRepOrder> {
    const response = await apiClient.post(
      `/salesrep/orders/${orderId}/submit-for-approval`
    );
    return response.data.data;
  }

  // Admin approval/rejection with factory selection (legacy)
  async adminApproveOrder(
    orderId: number,
    approvalData: {
      approved: boolean;
      assigned_factory_id?: number;
      rejection_reason?: string;
    }
  ): Promise<SalesRepOrder> {
    const response = await apiClient.post(
      `/salesrep/orders/${orderId}/admin-approve`,
      approvalData
    );
    return response.data.data;
  }

  // Admin approval/rejection with per-product factory assignment
  async adminApproveOrderWithProductFactoryAssignment(
    orderId: number,
    approvalData: {
      approved: boolean;
      assigned_factory_id?: number;
      product_assignments?: Array<{
        item_id: number;
        assigned_factory_id: number;
      }>;
      rejection_reason?: string;
    }
  ): Promise<SalesRepOrder> {
    const response = await apiClient.post(
      `/salesrep/orders/${orderId}/admin-approve-with-product-factories`,
      approvalData
    );
    return response.data.data;
  }

  // Factory manager acceptance
  async factoryManagerAcceptOrder(
    orderId: number,
    acceptanceData: {
      accepted: boolean;
      rejection_reason?: string;
    }
  ): Promise<SalesRepOrder> {
    const response = await apiClient.post(
      `/salesrep/orders/${orderId}/factory-accept`,
      acceptanceData
    );
    return response.data.data;
  }
}

export const salesRepApi = new SalesRepApiService();
