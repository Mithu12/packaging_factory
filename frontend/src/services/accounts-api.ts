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
  children: AccountGroup[];
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

// =====================================================
// Chart of Accounts Types
// =====================================================

export type AccountNodeType = 'Control' | 'Posting';

export interface ChartOfAccount {
  id: number;
  name: string;
  code: string;
  type: AccountNodeType;
  category: AccountCategory;
  parentId?: number;
  groupId?: number;
  balance: number;
  currency: string;
  status: AccountStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  children?: ChartOfAccount[];
  groupName?: string;
  parentName?: string;
}

export interface CreateChartOfAccountRequest {
  name: string;
  code: string;
  type: AccountNodeType;
  category: AccountCategory;
  parentId?: number;
  groupId?: number;
  currency?: string;
  status?: AccountStatus;
  notes?: string;
}

export interface UpdateChartOfAccountRequest {
  name?: string;
  code?: string;
  type?: AccountNodeType;
  category?: AccountCategory;
  parentId?: number;
  groupId?: number;
  currency?: string;
  status?: AccountStatus;
  notes?: string;
}

export interface ChartOfAccountQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: AccountCategory;
  type?: AccountNodeType;
  status?: AccountStatus;
  groupId?: number;
  parentId?: number;
  sortBy?: 'id' | 'name' | 'code' | 'category' | 'type' | 'balance' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
}

// =====================================================
// Cost Center Types
// =====================================================

export type CostCenterType = 'Department' | 'Project' | 'Location';
export type CostCenterStatus = 'Active' | 'Inactive';

export interface CostCenter {
  id: number;
  name: string;
  code: string;
  type: CostCenterType;
  department: string;
  owner: string;
  budget: number;
  actualSpend: number;
  variance: number;
  status: CostCenterStatus;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCostCenterRequest {
  name: string;
  code: string;
  type: CostCenterType;
  department: string;
  owner: string;
  budget?: number;
  status?: CostCenterStatus;
  description?: string;
}

export interface UpdateCostCenterRequest {
  name?: string;
  code?: string;
  type?: CostCenterType;
  department?: string;
  owner?: string;
  budget?: number;
  status?: CostCenterStatus;
  description?: string;
}

export interface CostCenterQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: CostCenterType;
  status?: CostCenterStatus;
  department?: string;
  sortBy?: 'id' | 'name' | 'code' | 'type' | 'department' | 'budget' | 'actualSpend' | 'created_at' | 'updated_at';
  sortOrder?: 'asc' | 'desc';
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
// Chart of Accounts API Service
// =====================================================

export class ChartOfAccountsApiService {
  private static readonly BASE_URL = '/accounts/chart-of-accounts';

  // Get all chart of accounts with pagination and filtering
  static async getChartOfAccounts(params?: ChartOfAccountQueryParams): Promise<PaginatedResponse<ChartOfAccount>> {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    
    return makeRequest<PaginatedResponse<ChartOfAccount>>(`${this.BASE_URL}${queryString}`);
  }

  // Get hierarchical chart of accounts tree
  static async getChartOfAccountsTree(): Promise<ChartOfAccount[]> {
    return makeRequest<ChartOfAccount[]>(`${this.BASE_URL}/tree`);
  }

  // Get chart of account by ID
  static async getChartOfAccountById(id: number): Promise<ChartOfAccount> {
    return makeRequest<ChartOfAccount>(`${this.BASE_URL}/${id}`);
  }

  // Create new chart of account
  static async createChartOfAccount(data: CreateChartOfAccountRequest): Promise<ChartOfAccount> {
    return makeRequest<ChartOfAccount>(this.BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update chart of account
  static async updateChartOfAccount(id: number, data: UpdateChartOfAccountRequest): Promise<ChartOfAccount> {
    return makeRequest<ChartOfAccount>(`${this.BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Delete chart of account
  static async deleteChartOfAccount(id: number): Promise<void> {
    await makeRequest<void>(`${this.BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  }

  // Deactivate chart of account (soft delete)
  static async deactivateChartOfAccount(id: number): Promise<void> {
    await makeRequest<void>(`${this.BASE_URL}/${id}/deactivate`, {
      method: 'PUT',
    });
  }

  // Activate chart of account
  static async activateChartOfAccount(id: number): Promise<void> {
    await makeRequest<void>(`${this.BASE_URL}/${id}/activate`, {
      method: 'PUT',
    });
  }
}

// =====================================================
// Cost Centers API Service
// =====================================================

export class CostCentersApiService {
  private static readonly BASE_URL = '/accounts/cost-centers';

  // Get all cost centers with pagination and filtering
  static async getCostCenters(params?: CostCenterQueryParams): Promise<PaginatedResponse<CostCenter>> {
    const queryString = params ? '?' + new URLSearchParams(
      Object.entries(params).reduce((acc, [key, value]) => {
        if (value !== undefined && value !== null) {
          acc[key] = String(value);
        }
        return acc;
      }, {} as Record<string, string>)
    ).toString() : '';
    
    return makeRequest<PaginatedResponse<CostCenter>>(`${this.BASE_URL}${queryString}`);
  }

  // Get cost center statistics
  static async getCostCenterStats(): Promise<any> {
    return makeRequest<any>(`${this.BASE_URL}/stats`);
  }

  // Search cost centers
  static async searchCostCenters(query: string): Promise<CostCenter[]> {
    return makeRequest<CostCenter[]>(`${this.BASE_URL}/search?q=${encodeURIComponent(query)}`);
  }

  // Get cost center by ID
  static async getCostCenterById(id: number): Promise<CostCenter> {
    return makeRequest<CostCenter>(`${this.BASE_URL}/${id}`);
  }

  // Create new cost center
  static async createCostCenter(data: CreateCostCenterRequest): Promise<CostCenter> {
    return makeRequest<CostCenter>(this.BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update cost center
  static async updateCostCenter(id: number, data: UpdateCostCenterRequest): Promise<CostCenter> {
    return makeRequest<CostCenter>(`${this.BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Update actual spend
  static async updateActualSpend(id: number, actualSpend: number): Promise<CostCenter> {
    return makeRequest<CostCenter>(`${this.BASE_URL}/${id}/actual-spend`, {
      method: 'PUT',
      body: JSON.stringify({ actualSpend }),
    });
  }

  // Delete cost center
  static async deleteCostCenter(id: number): Promise<void> {
    await makeRequest<void>(`${this.BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  }

  // Deactivate cost center (soft delete)
  static async deactivateCostCenter(id: number): Promise<void> {
    await makeRequest<void>(`${this.BASE_URL}/${id}/deactivate`, {
      method: 'PUT',
    });
  }

  // Activate cost center
  static async activateCostCenter(id: number): Promise<void> {
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
