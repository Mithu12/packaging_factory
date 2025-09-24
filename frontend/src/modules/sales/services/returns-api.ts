import { makeRequest } from '@/services/api-utils';

// Types for Returns API
export interface SalesReturn {
  id: number;
  return_number: string;
  original_order_id: number;
  original_order_number: string;
  return_date: string;
  return_type: 'full' | 'partial';
  reason: string;
  return_status: 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled';
  refund_method?: string;
  subtotal_returned: number;
  tax_returned: number;
  total_refund_amount: number;
  processing_fee: number;
  final_refund_amount: number;
  customer_id?: number;
  processed_by?: number;
  authorized_by?: number;
  notes?: string;
  receipt_number?: string;
  return_location?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  
  // Joined fields
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  processed_by_name?: string;
  authorized_by_name?: string;
  original_order?: {
    order_number: string;
    order_date: string;
    total_amount: number;
    payment_method?: string;
  };
}

export interface SalesReturnItem {
  id: number;
  return_id: number;
  original_line_item_id: number;
  product_id: number;
  product_sku: string;
  product_name: string;
  original_quantity: number;
  returned_quantity: number;
  original_unit_price: number;
  refund_unit_price: number;
  line_refund_amount: number;
  item_condition: 'good' | 'damaged' | 'defective' | 'opened' | 'expired';
  restockable: boolean;
  restock_fee: number;
  notes?: string;
  created_at: string;
}

export interface CreateReturnRequest {
  original_order_id: number;
  return_type: 'full' | 'partial';
  reason: string;
  refund_method?: string;
  processing_fee?: number;
  notes?: string;
  return_location?: string;
  items: {
    original_line_item_id: number;
    returned_quantity: number;
    refund_unit_price?: number;
    item_condition?: string;
    restockable?: boolean;
    restock_fee?: number;
    notes?: string;
  }[];
}

export interface ReturnQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  return_status?: string;
  return_type?: string;
  reason?: string;
  customer_id?: number;
  processed_by?: number;
  date_from?: string;
  date_to?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface ReturnStats {
  total_returns: number;
  total_refund_amount: number;
  pending_returns: number;
  approved_returns: number;
  completed_returns: number;
  rejected_returns: number;
  average_refund_amount: number;
  return_rate_percentage: number;
  top_return_reasons: {
    reason: string;
    count: number;
    percentage: number;
  }[];
  daily_returns: {
    date: string;
    count: number;
    amount: number;
  }[];
}

export interface ReturnEligibilityCheck {
  eligible: boolean;
  reasons?: string[];
  restrictions?: {
    max_return_days?: number;
    return_window_expired?: boolean;
    partial_returns_allowed?: boolean;
    items_already_returned?: {
      line_item_id: number;
      returned_quantity: number;
      remaining_quantity: number;
    }[];
  };
}

export interface SalesReturnWithDetails extends SalesReturn {
  items: SalesReturnItem[];
}

export class ReturnsAPI {
  
  // Get all returns with pagination and filtering
  static async getReturns(params?: ReturnQueryParams): Promise<{
    data: SalesReturn[];
    totalItems: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return await makeRequest(`/returns?${queryParams.toString()}`, { method: 'GET' });
  }

  // Get return statistics
  static async getReturnStats(params?: {
    date_from?: string;
    date_to?: string;
    customer_id?: number;
    return_status?: string;
    group_by?: string;
  }): Promise<ReturnStats> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return await makeRequest(`/returns/stats?${queryParams.toString()}`, { method: 'GET' });
  }

  // Check return eligibility for an order
  static async checkReturnEligibility(orderId: number): Promise<ReturnEligibilityCheck> {
    return await makeRequest(`/returns/eligibility/${orderId}`, { method: 'GET' });
  }

  // Get returns by customer
  static async getReturnsByCustomer(
    customerId: number, 
    params?: ReturnQueryParams
  ): Promise<SalesReturn[]> {
    const queryParams = new URLSearchParams();
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value.toString());
        }
      });
    }
    
    return await makeRequest(`/returns/customer/${customerId}?${queryParams.toString()}`, { method: 'GET' });
  }

  // Get returns by original order
  static async getReturnsByOrder(orderId: number): Promise<SalesReturn[]> {
    return await makeRequest(`/returns/order/${orderId}`, { method: 'GET' });
  }

  // Get return by ID with full details
  static async getReturnById(returnId: number): Promise<SalesReturnWithDetails> {
    return await makeRequest(`/returns/${returnId}`, { method: 'GET' });
  }

  // Create a new return
  static async createReturn(data: CreateReturnRequest): Promise<SalesReturnWithDetails> {
    return await makeRequest('/returns', { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
  }

  // Process return (approve/reject)
  static async processReturn(
    returnId: number, 
    data: {
      return_status: 'approved' | 'rejected';
      authorization_notes?: string;
      refund_method?: string;
      processing_fee?: number;
      inventory_actions?: {
        return_item_id: number;
        adjustment_type: string;
        adjustment_reason?: string;
      }[];
    }
  ): Promise<SalesReturn> {
    return await makeRequest(`/returns/${returnId}/process`, { method: 'PATCH', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
  }

  // Complete return with inventory updates
  static async completeReturn(returnId: number): Promise<SalesReturn> {
    return await makeRequest(`/returns/${returnId}/complete`, { method: 'PATCH' });
  }

  // Update return status
  static async updateReturnStatus(
    returnId: number, 
    data: {
      return_status: string;
      notes?: string;
    }
  ): Promise<SalesReturn> {
    return await makeRequest(`/returns/${returnId}/status`, { method: 'PATCH', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
  }

  // Process refund transaction
  static async processRefund(
    returnId: number, 
    data: {
      transaction_type: string;
      amount: number;
      transaction_reference?: string;
      notes?: string;
    }
  ): Promise<any> {
    return await makeRequest(`/returns/${returnId}/refund`, { method: 'POST', body: JSON.stringify(data), headers: { 'Content-Type': 'application/json' } });
  }
}
