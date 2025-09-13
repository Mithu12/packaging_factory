import { makeRequest } from './api-utils';

export interface Origin {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'inactive';
  product_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateOriginRequest {
  name: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface UpdateOriginRequest {
  name?: string;
  description?: string;
  status?: 'active' | 'inactive';
}

export interface OriginStats {
  total_origins: number;
  active_origins: number;
  inactive_origins: number;
  total_products: number;
}

class OriginApiService {
  private baseUrl = '/origins';

  // Get all origins
  async getAllOrigins(): Promise<Origin[]> {
    return makeRequest(`${this.baseUrl}/`);
  }

  // Get origin by ID
  async getOriginById(id: number): Promise<Origin> {
    return makeRequest(`${this.baseUrl}/${id}`, {
      credentials: 'include',
    });
  }

  // Create new origin
  async createOrigin(originData: CreateOriginRequest): Promise<Origin> {
    return makeRequest(`${this.baseUrl}/`, {
      method: 'POST',
      body: JSON.stringify(originData),
      credentials: 'include',
    });
  }

  // Update origin
  async updateOrigin(id: number, originData: UpdateOriginRequest): Promise<Origin> {
    return makeRequest(`${this.baseUrl}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(originData),
      credentials: 'include',
    });
  }

  // Delete origin (soft delete)
  async deleteOrigin(id: number): Promise<void> {
    return makeRequest(`${this.baseUrl}/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  }

  // Get origins by status
  async getOriginsByStatus(status: 'active' | 'inactive'): Promise<Origin[]> {
    return makeRequest(`${this.baseUrl}/status/${status}`, {
      credentials: 'include',
    });
  }

  // Get origin statistics
  async getOriginStats(): Promise<OriginStats> {
    return makeRequest(`${this.baseUrl}/stats`, {
      credentials: 'include',
    });
  }
}

export const OriginApi = new OriginApiService();
