import { makeRequest } from '@/services/api';

export interface SupplierCategory {
  id: number;
  name: string;
  description?: string;
  color: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

export interface SupplierCategoryListResponse {
  categories: SupplierCategory[];
  total: number;
  page: number;
  limit: number;
}

export interface SupplierCategoryNamesResponse {
  categories: string[];
}

class SupplierCategoryApi {
  // Get all supplier categories with pagination and filtering
  static async getSupplierCategories(params: SupplierCategoryQueryParams = {}): Promise<SupplierCategoryListResponse> {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page.toString());
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.search) queryParams.append('search', params.search);
    if (params.is_active !== undefined) queryParams.append('is_active', params.is_active.toString());

    const queryString = queryParams.toString();
    const url = `/supplier-categories${queryString ? `?${queryString}` : ''}`;
    
    return makeRequest<SupplierCategoryListResponse>(url);
  }

  // Get simple list of category names (for backward compatibility)
  static async getSupplierCategoryNames(): Promise<SupplierCategoryNamesResponse> {
    return makeRequest<SupplierCategoryNamesResponse>('/supplier-categories/names');
  }

  // Get a single supplier category by ID
  static async getSupplierCategory(id: number): Promise<SupplierCategory> {
    return makeRequest<SupplierCategory>(`/supplier-categories/${id}`);
  }

  // Create a new supplier category
  static async createSupplierCategory(data: CreateSupplierCategoryRequest): Promise<SupplierCategory> {
    return makeRequest<SupplierCategory>('/supplier-categories', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update a supplier category
  static async updateSupplierCategory(id: number, data: UpdateSupplierCategoryRequest): Promise<SupplierCategory> {
    return makeRequest<SupplierCategory>(`/supplier-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete a supplier category
  static async deleteSupplierCategory(id: number): Promise<{ message: string }> {
    return makeRequest<{ message: string }>(`/supplier-categories/${id}`, {
      method: 'DELETE',
    });
  }
}

export default SupplierCategoryApi;
