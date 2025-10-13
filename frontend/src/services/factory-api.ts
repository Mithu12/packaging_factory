// =====================================================
// Factory API Service
// =====================================================

import { makeRequest } from '@/services/api-utils';

// =====================================================
// Types
// =====================================================

export interface Factory {
  id: number;
  name: string;
  code: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
  };
  phone?: string;
  email?: string;
  cost_center_id?: number;
  cost_center_name?: string;
  is_active?: boolean;
  created_at: string;
  updated_at: string;
}

// =====================================================
// Factory API Service
// =====================================================

export class FactoryApiService {
  private static readonly BASE_URL = '/factory/factories';

  // Get all factories (admin only)
  static async getAllFactories(): Promise<{factories:Factory[]}> {
    return makeRequest<{factories:Factory[]}>(this.BASE_URL);
  }

  // Get user's accessible factories
  static async getUserFactories(): Promise<{factories:Factory[]}> {
    return makeRequest<{factories:Factory[]}>(`${this.BASE_URL}/user/my-factories`);
  }

  // Get factory by ID
  static async getFactoryById(id: string): Promise<Factory> {
    return makeRequest<Factory>(`${this.BASE_URL}/${id}`);
  }
}

export default FactoryApiService;

