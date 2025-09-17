export interface SupplierCategory {
  id: number;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateSupplierCategoryRequest {
  name: string;
  description?: string;
  color?: string;
}

export interface UpdateSupplierCategoryRequest {
  name?: string;
  description?: string;
  color?: string;
  is_active?: boolean;
}

export interface SupplierCategoryQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  is_active?: boolean;
}
