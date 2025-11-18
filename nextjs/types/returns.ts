// POS Returns System Types

export interface SalesReturn {
  id: number;
  return_number: string;
  original_order_id: number;
  original_order_number: string;
  return_date: string;
  return_type: 'full' | 'partial';
  reason: 'defective_product' | 'wrong_product' | 'customer_change_mind' | 
          'damaged_in_transit' | 'not_as_described' | 'duplicate_order' | 
          'quality_issue' | 'expired_product' | 'other';
  return_status: 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled';
  refund_method?: 'cash' | 'card' | 'store_credit' | 'original_method' | 'bank_transfer';
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

export interface ReturnInventoryAdjustment {
  id: number;
  return_id: number;
  return_item_id: number;
  product_id: number;
  adjustment_type: 'return_restock' | 'return_damaged' | 'return_write_off';
  quantity_adjusted: number;
  stock_before: number;
  stock_after: number;
  adjusted_by?: number;
  adjustment_reason?: string;
  created_at: string;
}

export interface ReturnRefundTransaction {
  id: number;
  return_id: number;
  transaction_type: 'cash_refund' | 'card_refund' | 'store_credit' | 'bank_transfer';
  amount: number;
  transaction_reference?: string;
  payment_gateway_response?: string;
  transaction_status: 'pending' | 'completed' | 'failed' | 'cancelled';
  processed_by?: number;
  processed_at?: string;
  notes?: string;
  created_at: string;
}

// Request/Response Types
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

export interface ProcessReturnRequest {
  return_status: 'approved' | 'rejected';
  authorization_notes?: string;
  refund_method?: string;
  processing_fee?: number;
  inventory_actions?: {
    return_item_id: number;
    adjustment_type: 'return_restock' | 'return_damaged' | 'return_write_off';
    adjustment_reason?: string;
  }[];
}

export interface RefundTransactionRequest {
  transaction_type: 'cash_refund' | 'card_refund' | 'store_credit' | 'bank_transfer';
  amount: number;
  transaction_reference?: string;
  notes?: string;
}

export interface ReturnQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  return_status?: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  return_type?: string;
  reason?: string;
  customer_id?: number;
  processed_by?: number;
  date_from?: string;
  date_to?: string;
  sortBy?: 'return_date' | 'return_number' | 'total_refund_amount';
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

export interface SalesReturnWithDetails extends SalesReturn {
  items: SalesReturnItem[];
  inventory_adjustments?: ReturnInventoryAdjustment[];
  refund_transactions?: ReturnRefundTransaction[];
}

// Validation interfaces
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

export interface InventoryImpact {
  product_id: number;
  product_name: string;
  current_stock: number;
  return_quantity: number;
  projected_stock: number;
  adjustment_type: string;
  impact_assessment: 'positive' | 'neutral' | 'negative';
}

export interface ReturnQueryParams {
  page?: number;
  pageSize?: number;
  return_number?: string;
  original_order_id?: number;
  customer_id?: number;
  return_status?: 'pending' | 'approved' | 'rejected' | 'completed' | 'cancelled';
  start_date?: string;
  end_date?: string;
  sortBy?: 'return_date' | 'total_refund_amount' | 'return_number';
  sortOrder?: 'asc' | 'desc';
}
