import { makeRequest } from './api-utils';

export interface ServiceDueItem {
  order_id: number;
  order_number: string;
  customer_name: string | null;
  product_name: string;
  product_id: number;
  order_date: string;
  due_date: string;
  days_until_due: number;
}

export interface DashboardStats {
  // Financial Metrics
  total_sales: number;
  today_sales: number;
  total_profit: number;
  total_expenses: number;
  today_expenses: number;
  net_profit: number;
  
  // Inventory Metrics
  low_stock_count: number;
  out_of_stock_count: number;
  total_products: number;
  
  // Service Overview
  warranty_due_count: number;
  warranty_due_items: ServiceDueItem[];
  service_due_count: number;
  service_due_items: ServiceDueItem[];
  
  // Customer Metrics
  total_outstanding_dues: number;
  customers_with_dues: number;
  
  // Order Metrics
  total_orders: number;
  today_orders: number;
  pending_orders: number;
}

export class DashboardApi {
  private static baseUrl = '/dashboard';

  /**
   * Get comprehensive dashboard statistics
   */
  static async getStats(): Promise<DashboardStats> {
    try {
      return await makeRequest<DashboardStats>(`${this.baseUrl}/stats`, { method: 'GET' });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  }
}
