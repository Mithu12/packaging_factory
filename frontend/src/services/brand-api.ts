import { makeRequest } from './api-utils';

export interface Brand {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateBrandRequest {
  name: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateBrandRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
}

class BrandApiService {
  private baseUrl = '/brands';

  // Get all brands
  async getAllBrands(): Promise<Brand[]> {
    return makeRequest(`${this.baseUrl}/`, {
      credentials: 'include',
    });
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
  async getBrandsByStatus(status: 'active' | 'inactive'): Promise<Brand[]> {
    return makeRequest(`${this.baseUrl}/status/${status}`, {
      credentials: 'include',
    });
  }
}

export const BrandApi = new BrandApiService();
