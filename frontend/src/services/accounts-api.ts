// =====================================================
// Accounts API Service
// =====================================================

import { makeRequest } from './api-utils';

// =====================================================
// Types (matching backend types)
// =====================================================

export type AccountCategory = 'Assets' | 'Liabilities' | 'Equity' | 'Revenue' | 'Expenses';
export type AccountStatus = 'Active' | 'Inactive';

export interface AccountGroup {
  id: number;
  name: string;
  code: string;
  category: AccountCategory;
  parentId?: string;
  description?: string;
  status: AccountStatus;
  createdAt: string;
  updatedAt: string;
  children?: AccountGroup[];
}

export interface CreateAccountGroupRequest {
  name: string;
  code: string;
  category: AccountCategory;
    parentId?: string;
  description?: string;
  status?: AccountStatus;
}

export interface UpdateAccountGroupRequest {
  name?: string;
  code?: string;
  category?: AccountCategory;
  parentId?: string;
  description?: string;
  status?: AccountStatus;
}

export interface AccountGroupQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: AccountCategory;
  status?: AccountStatus;
  parentId?: string;
  sortBy?: 'id' | 'name' | 'code' | 'category' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

export interface AccountGroupStats {
  totalGroups: number;
  groupsByCategory: Record<AccountCategory, number>;
  activeGroups: number;
  inactiveGroups: number;
  groupsWithChildren: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// =====================================================
// Account Groups API Service
// =====================================================

export class AccountGroupsApiService {
  private static readonly BASE_URL = '/accounts/account-groups';

  // Get all account groups with pagination and filtering
  static async getAccountGroups(params?: AccountGroupQueryParams): Promise<PaginatedResponse<AccountGroup>> {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    
    return makeRequest<PaginatedResponse<AccountGroup>>(`${this.BASE_URL}${queryString}`);
  }

  // Get hierarchical account groups tree
  static async getAccountGroupsTree(): Promise<AccountGroup[]> {
    return makeRequest<AccountGroup[]>(`${this.BASE_URL}/tree`);
  }

  // Get account group statistics
  static async getAccountGroupStats(): Promise<AccountGroupStats> {
    return makeRequest<AccountGroupStats>(`${this.BASE_URL}/stats`);
  }

  // Search account groups by name or code
  static async searchAccountGroups(query: string, limit?: number): Promise<AccountGroup[]> {
    const queryString = new URLSearchParams({
      q: query,
      ...(limit && { limit: String(limit) })
    }).toString();
    
    return makeRequest<AccountGroup[]>(`${this.BASE_URL}/search?${queryString}`);
  }

  // Get account group by ID
  static async getAccountGroupById(id: number): Promise<AccountGroup> {
    return makeRequest<AccountGroup>(`${this.BASE_URL}/${id}`);
  }

  // Create new account group
  static async createAccountGroup(data: CreateAccountGroupRequest): Promise<AccountGroup> {
    return makeRequest<AccountGroup>(this.BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update account group
  static async updateAccountGroup(id: number, data: UpdateAccountGroupRequest): Promise<AccountGroup> {
    return makeRequest<AccountGroup>(`${this.BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete account group
  static async deleteAccountGroup(id: number): Promise<void> {
    await makeRequest<void>(`${this.BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  }

  // Deactivate account group (soft delete)
  static async deactivateAccountGroup(id: number): Promise<void> {
    await makeRequest<void>(`${this.BASE_URL}/${id}/deactivate`, {
      method: 'PUT',
    });
  }

  // Activate account group
  static async activateAccountGroup(id: number): Promise<void> {
    await makeRequest<void>(`${this.BASE_URL}/${id}/activate`, {
      method: 'PUT',
    });
  }
}

// =====================================================
// React Query Hooks (Optional - for better integration)
// =====================================================

export const accountGroupsQueryKeys = {
  all: ['account-groups'] as const,
  lists: () => [...accountGroupsQueryKeys.all, 'list'] as const,
  list: (params?: AccountGroupQueryParams) => [...accountGroupsQueryKeys.lists(), params] as const,
  tree: () => [...accountGroupsQueryKeys.all, 'tree'] as const,
  stats: () => [...accountGroupsQueryKeys.all, 'stats'] as const,
  search: (query: string) => [...accountGroupsQueryKeys.all, 'search', query] as const,
  detail: (id: number) => [...accountGroupsQueryKeys.all, 'detail', id] as const,
};

// Export default service for convenience
export default AccountGroupsApiService;
