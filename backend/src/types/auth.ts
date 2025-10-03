export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  mobile_number?: string;
  departments?: string[];
  role: UserRole; // Legacy role field - still supported for backward compatibility
  role_id?: number; // New RBAC role system
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  ACCOUNTS = 'accounts',
  EMPLOYEE = 'employee',
  VIEWER = 'viewer'
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
  role?: UserRole;
}

export interface AuthResponse {
  user: Omit<User, 'password'>;
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
}

export interface JwtPayload {
  user_id: number;
  username: string;
  role: UserRole; // Legacy role
  role_id?: number; // New RBAC role ID
  factory_id?: number; // Factory ID
  permissions?: string[]; // User's computed permissions
  iat: number;
  exp: number;
}

export interface AuthContext {
  user: User;
  token: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetConfirmRequest {
  token: string;
  new_password: string;
}

