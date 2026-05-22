export type PurchaseReturnStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export type PurchaseReturnReason =
  | 'defective'
  | 'wrong_item'
  | 'damaged'
  | 'quality_issue'
  | 'over_supply'
  | 'expired'
  | 'other';

export type PurchaseReturnCostBasisSource = 'grn' | 'po';

export interface PurchaseReturn {
  id: number;
  return_number: string;
  purchase_order_id: number;
  purchase_order_receipt_id: number | null;
  supplier_id: number;
  return_date: string;
  reason: PurchaseReturnReason;
  reason_notes: string | null;
  status: PurchaseReturnStatus;
  total_amount: number;
  currency: string;
  distribution_center_id: number | null;
  cost_basis_source: PurchaseReturnCostBasisSource | null;
  created_by: string;
  submitted_by: number | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_by_id: number | null;
  approved_at: string | null;
  rejected_by_id: number | null;
  rejected_at: string | null;
  approval_notes: string | null;
  cancelled_by_id: number | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  voucher_id: number | null;
  accounting_integrated: boolean;
  accounting_integration_error: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseReturnLineItem {
  id: number;
  purchase_return_id: number;
  po_line_item_id: number;
  grn_line_item_id: number | null;
  product_id: number;
  product_sku: string | null;
  product_name: string;
  unit_of_measure: string | null;
  return_quantity: number;
  unit_cost: number;
  total_cost: number;
  condition: string | null;
  notes: string | null;
  created_at: string;
  // Joined / derived (detail views only)
  ordered_quantity?: number;
  received_quantity?: number;
  already_returned_quantity?: number;
  max_returnable_quantity?: number;
}

export interface PurchaseReturnWithDetails extends PurchaseReturn {
  supplier: {
    id: number;
    name: string;
    contact_person?: string;
    email?: string;
    phone?: string;
    address?: string;
  };
  purchase_order: {
    id: number;
    po_number: string;
  };
  purchase_order_receipt: {
    id: number;
    receipt_number: string;
    receipt_date: string;
  } | null;
  voucher: {
    id: number;
    voucher_no: string;
  } | null;
  line_items: PurchaseReturnLineItem[];
}

export interface CreatePurchaseReturnLineItemRequest {
  po_line_item_id: number;
  grn_line_item_id?: number;
  return_quantity: number;
  condition?: string;
  notes?: string;
}

export interface CreatePurchaseReturnRequest {
  purchase_order_id: number;
  purchase_order_receipt_id?: number;
  return_date?: string;
  reason: PurchaseReturnReason;
  reason_notes?: string;
  distribution_center_id?: number;
  notes?: string;
  line_items: CreatePurchaseReturnLineItemRequest[];
}

export interface UpdatePurchaseReturnRequest {
  return_date?: string;
  reason?: PurchaseReturnReason;
  reason_notes?: string;
  distribution_center_id?: number;
  notes?: string;
  line_items?: CreatePurchaseReturnLineItemRequest[];
}

export interface PurchaseReturnApprovalActionRequest {
  notes?: string;
}

export interface CancelPurchaseReturnRequest {
  reason: string;
}

export interface PurchaseReturnQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: PurchaseReturnStatus;
  supplier_id?: number;
  purchase_order_id?: number;
  start_date?: string;
  end_date?: string;
  sortBy?:
    | 'id'
    | 'return_number'
    | 'return_date'
    | 'total_amount'
    | 'created_at'
    | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface PurchaseReturnStats {
  total_returns: number;
  draft_returns: number;
  submitted_returns: number;
  approved_returns: number;
  rejected_returns: number;
  cancelled_returns: number;
  total_value: number;
  returns_this_month: number;
}

export interface EligiblePurchaseReturnLine {
  po_line_item_id: number;
  grn_line_item_id: number | null;
  product_id: number;
  product_sku: string | null;
  product_name: string;
  unit_of_measure: string | null;
  ordered_quantity: number;
  received_quantity: number;
  already_returned_quantity: number;
  max_returnable_quantity: number;
  unit_price: number;
  current_cost_price: number;
}
