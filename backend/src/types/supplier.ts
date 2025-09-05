export interface Supplier {
  id: number;
  supplier_code: string;
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  category?: string;
  tax_id?: string;
  vat_id?: string;
  payment_terms?: string;
  bank_name?: string;
  bank_account?: string;
  bank_routing?: string;
  swift_code?: string;
  iban?: string;
  status: 'active' | 'inactive';
  rating: number;
  total_orders: number;
  last_order_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierPerformance {
  id: number;
  supplier_id: number;
  delivery_time_days?: number;
  quality_rating?: number;
  price_rating?: number;
  communication_rating?: number;
  issues_count: number;
  on_time_delivery_rate: number;
  recorded_date: string;
  notes?: string;
  created_at: string;
}

export interface CreateSupplierRequest {
  name: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  category?: string;
  tax_id?: string;
  vat_id?: string;
  payment_terms?: string;
  bank_name?: string;
  bank_account?: string;
  bank_routing?: string;
  swift_code?: string;
  iban?: string;
  status?: 'active' | 'inactive';
  notes?: string;
}

export interface UpdateSupplierRequest extends Partial<CreateSupplierRequest> {
  rating?: number;
  total_orders?: number;
  last_order_date?: string;
}

export interface SupplierQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: 'active' | 'inactive';
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface SupplierStats {
  total_suppliers: number;
  active_suppliers: number;
  inactive_suppliers: number;
  categories_count: number;
  average_rating: number;
}
