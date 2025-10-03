import { makeRequest } from '@/services/api-utils';
import {
  Factory,
  UserFactoryRole,
  CreateFactoryRequest,
  UpdateFactoryRequest,
  AssignUserToFactoryRequest
} from '../types';

export interface FactoriesResponse {
  factories: Factory[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserFactoriesResponse {
  factories: UserFactoryRole[];
}

export class FactoriesAPI {
  private static readonly BASE_URL = '/factory/factories';

  // Factory CRUD operations
  static async getAllFactories(params?: {
    page?: number;
    limit?: number;
    search?: string;
    is_active?: boolean;
  }): Promise<FactoriesResponse> {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';

    return makeRequest<FactoriesResponse>(`${this.BASE_URL}${queryString}`);
  }

  static async getFactoryById(factoryId: string): Promise<Factory> {
    return makeRequest<Factory>(`${this.BASE_URL}/${factoryId}`);
  }

  static async createFactory(factoryData: CreateFactoryRequest): Promise<Factory> {
    return makeRequest<Factory>(this.BASE_URL, {
      method: 'POST',
      body: JSON.stringify(factoryData),
    });
  }

  static async updateFactory(factoryId: string, updateData: UpdateFactoryRequest): Promise<Factory> {
    return makeRequest<Factory>(`${this.BASE_URL}/${factoryId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });
  }

  static async deleteFactory(factoryId: string): Promise<void> {
    return makeRequest<void>(`${this.BASE_URL}/${factoryId}`, {
      method: 'DELETE',
    });
  }

  // User-Factory management
  static async getUserFactories(): Promise<UserFactoryRole[]> {
    return makeRequest<UserFactoriesResponse>(`${this.BASE_URL}/user/my-factories`).then(
      response => response.factories
    );
  }

  static async assignUserToFactory(factoryId: string, assignmentData: AssignUserToFactoryRequest): Promise<void> {
    return makeRequest<void>(`${this.BASE_URL}/${factoryId}/users`, {
      method: 'POST',
      body: JSON.stringify(assignmentData),
    });
  }

  static async removeUserFromFactory(factoryId: string, userId: number): Promise<void> {
    return makeRequest<void>(`${this.BASE_URL}/${factoryId}/users/${userId}`, {
      method: 'DELETE',
    });
  }
}

export default FactoriesAPI;
