// Users API Service
import { makeRequest } from '@/services/api-utils';

export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  mobile_number?: string;
  departments?: string[];
  role_id: number;
  role?: string;
  is_active: boolean;
  factory_id?: number;
  factory_name?: string;
  created_at: string;
  updated_at?: string;
  last_login?: string;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  full_name: string;
  mobile_number?: string;
  departments?: string[];
  role_id: number;
  password: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  full_name?: string;
  mobile_number?: string;
  departments?: string[];
  role_id?: number;
}

// API Service Class
export class UsersApiService {
  private static readonly BASE_URL = '/auth/users';

  // =====================================================
  // User CRUD Operations
  // =====================================================

  // Get all users (admin only)
  static async getUsers(): Promise<User[]> {
    return makeRequest<User[]>(this.BASE_URL);
  }

  // Get user by ID (manager and above)
  static async getUserById(id: number): Promise<User> {
    return makeRequest<User>(`${this.BASE_URL}/${id}`);
  }

  // Create new user (admin only)
  static async createUser(data: CreateUserRequest): Promise<User> {
    return makeRequest<User>(this.BASE_URL, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Update user (admin only)
  static async updateUser(id: number, data: UpdateUserRequest): Promise<User> {
    return makeRequest<User>(`${this.BASE_URL}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // Update user role (admin only)
  static async updateUserRole(id: number, role: string): Promise<User> {
    return makeRequest<User>(`${this.BASE_URL}/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  // Deactivate user (admin only)
  static async deactivateUser(id: number): Promise<void> {
    return makeRequest<void>(`${this.BASE_URL}/${id}`, {
      method: 'DELETE',
    });
  }

  // Reactivate user (admin only)
  static async reactivateUser(id: number): Promise<User> {
    return makeRequest<User>(`${this.BASE_URL}/${id}/reactivate`, {
      method: 'PATCH',
    });
  }
}

// =====================================================
// React Query Keys
// =====================================================

export const usersQueryKeys = {
  all: ['users'] as const,
  lists: () => [...usersQueryKeys.all, 'list'] as const,
  list: () => [...usersQueryKeys.lists()] as const,
  details: () => [...usersQueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...usersQueryKeys.details(), id] as const,
};
