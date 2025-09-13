import { makeRequest } from './api-utils';

export interface Brand {
  id: number;
  name: string;
  description?: string;
  is_active: boolean;
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBrandRequest {
  name: string;
  description?: string;
  is_active?: boolean;
}

export interface UpdateBrandRequest {
  name?: string;
  description?: string;
  is_active?: boolean;
}

class BrandApiService {
  private baseUrl = '/brands';

  // Get all brands
  async getAllBrands(): Promise<Brand[]> {
    return makeRequest(`${this.baseUrl}/`);
  }

  // Get brand by ID
  async getBrandById(id: number): Promise<Brand> {
    return makeRequest(`${this.baseUrl}/${id}`, {
      credentials: 'include',
    });
  }

  // Create new brand
  async createBrand(brandData: CreateBrandRequest): Promise<Brand> {
    return makeRequest(`${this.baseUrl}/`, {
      method: 'POST',
      body: JSON.stringify(brandData),
      credentials: 'include',
    });
  }

  // Update brand
  async updateBrand(id: number, brandData: UpdateBrandRequest): Promise<Brand> {
    return makeRequest(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(brandData),
      credentials: 'include',
    });
  }

  // Delete brand (soft delete)
  async deleteBrand(id: number): Promise<void> {
    return makeRequest(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  }

  // Get brands by status
  async getBrandsByStatus(is_active: boolean): Promise<Brand[]> {
    return makeRequest(`${this.baseUrl}/status/${is_active ? 'active' : 'inactive'}`, {
      credentials: 'include',
    });
  }
}

export const BrandApi = new BrandApiService();
