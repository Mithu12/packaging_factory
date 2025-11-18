export interface PurchaseOrder {
  id: number;
  po_number: string;
  supplier_id: number;
  order_date: string;
  expected_delivery_date: string;
  actual_delivery_date?: string;
  status: 'draft' | 'pending' | 'approved' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  total_amount: number;
  currency: string;
  payment_terms: string;
  delivery_terms: string;
  department?: string;
  project?: string;
  notes?: string;
  created_by: string;
  approved_by?: string;
  approved_date?: string;
  // New approval fields
  submitted_at?: string;
  submitted_by?: number;
  approved_at?: string;
  approved_by_id?: number;
  approval_status: 'draft' | 'submitted' | 'approved' | 'rejected';
  approval_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderLineItem {
  id: number;
  purchase_order_id: number;
  product_id: number;
  product_sku: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  received_quantity: number;
  pending_quantity: number;
  unit_of_measure: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseOrderWithDetails extends PurchaseOrder {
  supplier: {
    id: number;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  line_items: PurchaseOrderLineItem[];
  timeline: PurchaseOrderTimeline[];
}

export interface PurchaseOrderTimeline {
  id: number;
  purchase_order_id: number;
  event: string;
  description?: string;
  user: string;
  status: 'completed' | 'pending' | 'cancelled';
  created_at: string;
}

export interface CreatePurchaseOrderRequest {
  supplier_id: number;
  expected_delivery_date: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  payment_terms?: string;
  delivery_terms?: string;
  department?: string;
  project?: string;
  notes?: string;
  line_items: CreatePurchaseOrderLineItemRequest[];
}

export interface CreatePurchaseOrderLineItemRequest {
  product_id: number;
  quantity: number;
  unit_price: number;
  description?: string;
}

export interface UpdatePurchaseOrderRequest {
  supplier_id?: number;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  payment_terms?: string;
  delivery_terms?: string;
  department?: string;
  project?: string;
  notes?: string;
  line_items?: UpdatePurchaseOrderLineItemRequest[];
}

export interface UpdatePurchaseOrderLineItemRequest {
  id?: number;
  product_id: number;
  quantity: number;
  unit_price: number;
  description?: string;
}

export interface UpdatePurchaseOrderStatusRequest {
  status: 'draft' | 'pending' | 'approved' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  notes?: string;
}

export interface PurchaseOrderQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: 'draft' | 'pending' | 'approved' | 'sent' | 'partially_received' | 'received' | 'cancelled';
  supplier_id?: number;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
  start_date?: string;
  end_date?: string;
  sortBy?: 'id' | 'po_number' | 'order_date' | 'expected_delivery_date' | 'total_amount' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface PurchaseOrderStats {
  total_orders: number;
  draft_orders: number;
  pending_orders: number;
  approved_orders: number;
  received_orders: number;
  cancelled_orders: number;
  total_value: number;
  average_order_value: number;
  orders_this_month: number;
  orders_overdue: number;
}

export interface ReceiveGoodsRequest {
  line_items: {
    line_item_id: number;
    received_quantity: number;
    notes?: string;
  }[];
  received_date?: string;
  notes?: string;
}

// Approval workflow interfaces
export interface SubmitPurchaseOrderRequest {
  notes?: string;
}

export interface ApprovePurchaseOrderRequest {
  action: 'approve' | 'reject';
  notes?: string;
}

export interface ApprovalHistory {
  id: number;
  entity_type: 'purchase_order' | 'payment' | 'expense';
  entity_id: number;
  action: 'submitted' | 'approved' | 'rejected' | 'revised';
  performed_by: number;
  performed_at: string;
  notes?: string;
  previous_status?: string;
  new_status?: string;
  created_at: string;
  // Joined fields
  performer_name?: string;
}
