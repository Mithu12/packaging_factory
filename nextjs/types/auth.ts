export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  mobile_number?: string;
  departments?: string[];
  role: UserRole;
  role_id?: number;
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

export enum UserRoleIds {
  ADMIN = 1,
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
  role: UserRole;
  role_id?: number;
  factory_id?: number;
  permissions?: string[];
  iat: number;
  exp: number;
}

export interface AuthContext {
  user: User;
  token: string;
}
