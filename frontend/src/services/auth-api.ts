import { makeRequest } from './api-utils';

// Auth types
export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  mobile_number?: string;
  departments?: string[];
  role: 'admin' | 'manager' | 'accounts' | 'employee' | 'viewer';
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  factory_id?: number;
  distribution_center_id?: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name: string;
  mobile_number?: string;
  departments?: string[];
  role?: 'admin' | 'manager' | 'employee' | 'viewer';
  distribution_center_id?: number;
}

export interface AuthResponse {
  user: User;
  token: string;
  expires_in: number;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface UpdateProfileRequest {
  full_name?: string;
  email?: string;
  mobile_number?: string;
  departments?: string[];
  distribution_center_id?: number;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  new_password: string;
}

export interface UpdateUserRoleRequest {
  role: 'admin' | 'manager' | 'accounts' | 'employee' | 'viewer';
}

class AuthApiService {
  private baseUrl = '/auth';

  // Login user
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return makeRequest(`${this.baseUrl}/login`, {
      method: 'POST',
      body: JSON.stringify(credentials),
      credentials: 'include', // Include cookies in the request
    });
  }

  // Logout user
  async logout(): Promise<void> {
    return makeRequest(`${this.baseUrl}/logout`, {
      method: 'POST',
      credentials: 'include', // Include cookies in the request
    });
  }

  // Register new user
  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return makeRequest(`${this.baseUrl}/register`, {
      method: 'POST',
      body: JSON.stringify(userData),
      credentials: 'include',
    });
  }

  // Get current user profile
  async getProfile(): Promise<User> {
    return makeRequest(`${this.baseUrl}/profile`, {
      method: 'GET',
      credentials: 'include',
    });
  }

  // Update current user profile
  async updateProfile(updateData: UpdateProfileRequest): Promise<User> {
    return makeRequest(`${this.baseUrl}/profile`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      credentials: 'include',
    });
  }

  // Update user profile by admin
  async updateUserProfile(userId: number, updateData: UpdateProfileRequest): Promise<User> {
    return makeRequest(`${this.baseUrl}/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(updateData),
      credentials: 'include',
    });
  }

  // Change password
  async changePassword(passwordData: ChangePasswordRequest): Promise<void> {
    return makeRequest(`${this.baseUrl}/change-password`, {
      method: 'PUT',
      body: JSON.stringify(passwordData),
      credentials: 'include',
    });
  }

  // Request password reset
  async requestPasswordReset(email: string): Promise<void> {
    return makeRequest(`${this.baseUrl}/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ email }),
      credentials: 'include',
    });
  }

  // Reset password with token
  async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    return makeRequest(`${this.baseUrl}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ token, new_password: newPassword }),
      credentials: 'include',
    });
  }

  // Get all users (admin only)
  async getAllUsers(): Promise<User[]> {
    return makeRequest(`${this.baseUrl}/users`, {
      method: 'GET',
      credentials: 'include',
    });
  }

  // Get user by ID (manager and above)
  async getUserById(userId: number): Promise<User> {
    return makeRequest(`${this.baseUrl}/users/${userId}`, {
      method: 'GET',
      credentials: 'include',
    });
  }

  // Update user role (admin only)
  async updateUserRole(userId: number, role: 'admin' | 'manager' | 'employee' | 'viewer'): Promise<User> {
    return makeRequest(`${this.baseUrl}/users/${userId}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
      credentials: 'include',
    });
  }

  // Deactivate user (admin only)
  async deactivateUser(userId: number): Promise<void> {
    return makeRequest(`${this.baseUrl}/users/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
  }

  // Reactivate user (admin only)
  async reactivateUser(userId: number): Promise<User> {
    return makeRequest(`${this.baseUrl}/users/${userId}/reactivate`, {
      method: 'PATCH',
      credentials: 'include',
    });
  }
}

export const AuthApi = new AuthApiService();
