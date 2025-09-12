export interface User {
  id: number;
  username: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login?: Date;
  created_at: Date;
  updated_at: Date;
}

export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
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
}

export interface JwtPayload {
  user_id: number;
  username: string;
  role: UserRole;
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

