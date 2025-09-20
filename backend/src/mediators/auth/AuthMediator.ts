import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import { 
  User, 
  UserRole, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  ChangePasswordRequest, 
  UpdateProfileRequest,
  JwtPayload 
} from '@/types/auth';
import { UserWithPermissions, PermissionCheck } from '@/types/rbac';
import { RoleMediator } from '@/mediators/rbac/RoleMediator';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export class AuthMediator {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
  private static readonly JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';
  private static readonly BCRYPT_ROUNDS = 10;

  // Login user
  static async login(loginData: LoginRequest): Promise<AuthResponse> {
    const action = 'User Login';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { username: loginData.username });
      
      // Find user by username or email
      const userResult = await client.query(
        'SELECT * FROM users WHERE (username = $1 OR email = $1) AND is_active = true',
        [loginData.username]
      );
      
      if (userResult.rows.length === 0) {
        throw createError('Invalid credentials', 401);
      }
      
      const user = userResult.rows[0];
      
      // Verify password
      const isPasswordValid = await bcrypt.compare(loginData.password, user.password_hash);
      if (!isPasswordValid) {
        throw createError('Invalid credentials', 401);
      }
      
      // Update last login
      await client.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );
      
      // Generate JWT token
      const token = this.generateToken({
        user_id: user.id,
        username: user.username,
        role: user.role
      });
      
      // Remove password from response
      const { password_hash, password_reset_token, password_reset_expires, email_verification_token, ...userWithoutPassword } = user;
      
      MyLogger.success(action, { user_id: user.id, username: user.username, role: user.role });
      
      return {
        user: userWithoutPassword,
        token,
        expires_in: 24 * 60 * 60 // 24 hours in seconds
      };
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Register new user
  static async register(registerData: RegisterRequest): Promise<AuthResponse> {
    const action = 'User Registration';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { username: registerData.username, email: registerData.email });
      
      // Check if username or email already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [registerData.username, registerData.email]
      );
      
      if (existingUser.rows.length > 0) {
        throw createError('Username or email already exists', 400);
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(registerData.password, this.BCRYPT_ROUNDS);
      
      // Create user
      const userResult = await client.query(`
        INSERT INTO users (username, email, password_hash, full_name, mobile_number, departments, role, is_active, email_verified)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
      `, [
        registerData.username,
        registerData.email,
        hashedPassword,
        registerData.full_name,
        registerData.mobile_number || null,
        registerData.departments || null,
        registerData.role || UserRole.EMPLOYEE,
        true,
        false
      ]);
      
      const user = userResult.rows[0];
      
      // Generate JWT token
      const token = this.generateToken({
        user_id: user.id,
        username: user.username,
        role: user.role
      });
      
      // Remove password from response
      const { password_hash, password_reset_token, password_reset_expires, email_verification_token, ...userWithoutPassword } = user;
      
      MyLogger.success(action, { user_id: user.id, username: user.username, role: user.role });
      
      return {
        user: userWithoutPassword,
        token,
        expires_in: 24 * 60 * 60 // 24 hours in seconds
      };
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get user profile
  static async getUserProfile(userId: number): Promise<User> {
    const action = 'Get User Profile';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { user_id: userId });
      
      const userResult = await client.query(
        'SELECT * FROM users WHERE id = $1 AND is_active = true',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        throw createError('User not found', 404);
      }
      
      const user = userResult.rows[0];
      const { password_hash, password_reset_token, password_reset_expires, email_verification_token, ...userWithoutPassword } = user;
      
      MyLogger.success(action, { user_id: userId });
      
      return userWithoutPassword;
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update user profile
  static async updateProfile(userId: number, updateData: UpdateProfileRequest): Promise<User> {
    const action = 'Update User Profile';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { user_id: userId });
      
      // Check if email is already taken by another user
      if (updateData.email) {
        const existingUser = await client.query(
          'SELECT id FROM users WHERE email = $1 AND id != $2',
          [updateData.email, userId]
        );
        
        if (existingUser.rows.length > 0) {
          throw createError('Email already exists', 400);
        }
      }
      
      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;
      
      if (updateData.full_name) {
        updateFields.push(`full_name = $${paramCount++}`);
        updateValues.push(updateData.full_name);
      }
      
      if (updateData.email) {
        updateFields.push(`email = $${paramCount++}`);
        updateValues.push(updateData.email);
      }
      
      if (updateData.mobile_number !== undefined) {
        updateFields.push(`mobile_number = $${paramCount++}`);
        updateValues.push(updateData.mobile_number);
      }
      
      if (updateData.departments !== undefined) {
        updateFields.push(`departments = $${paramCount++}`);
        updateValues.push(updateData.departments);
      }
      
      if (updateFields.length === 0) {
        throw createError('No fields to update', 400);
      }
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(userId);
      
      const updateQuery = `
        UPDATE users 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const userResult = await client.query(updateQuery, updateValues);
      
      if (userResult.rows.length === 0) {
        throw createError('User not found', 404);
      }
      
      const user = userResult.rows[0];
      const { password_hash, password_reset_token, password_reset_expires, email_verification_token, ...userWithoutPassword } = user;
      
      MyLogger.success(action, { user_id: userId });
      
      return userWithoutPassword;
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Change password
  static async changePassword(userId: number, passwordData: ChangePasswordRequest): Promise<void> {
    const action = 'Change Password';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { user_id: userId });
      
      // Get current user
      const userResult = await client.query(
        'SELECT password_hash FROM users WHERE id = $1 AND is_active = true',
        [userId]
      );
      
      if (userResult.rows.length === 0) {
        throw createError('User not found', 404);
      }
      
      const user = userResult.rows[0];
      
      // Verify current password
      const isCurrentPasswordValid = await bcrypt.compare(passwordData.current_password, user.password_hash);
      if (!isCurrentPasswordValid) {
        throw createError('Current password is incorrect', 400);
      }
      
      // Hash new password
      const hashedNewPassword = await bcrypt.hash(passwordData.new_password, this.BCRYPT_ROUNDS);
      
      // Update password
      await client.query(
        'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedNewPassword, userId]
      );
      
      MyLogger.success(action, { user_id: userId });
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get all users (admin only)
  static async getAllUsers(): Promise<User[]> {
    const action = 'Get All Users';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action);
      
      const usersResult = await client.query(
        'SELECT * FROM users ORDER BY created_at DESC'
      );
      
      const users = usersResult.rows.map(user => {
        const { password_hash, password_reset_token, password_reset_expires, email_verification_token, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      
      MyLogger.success(action, { count: users.length });
      
      return users;
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Update user role (admin only)
  static async updateUserRole(userId: number, role: UserRole): Promise<User> {
    const action = 'Update User Role';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { user_id: userId, role });
      
      const userResult = await client.query(
        'UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [role, userId]
      );
      
      if (userResult.rows.length === 0) {
        throw createError('User not found', 404);
      }
      
      const user = userResult.rows[0];
      const { password_hash, password_reset_token, password_reset_expires, email_verification_token, ...userWithoutPassword } = user;
      
      MyLogger.success(action, { user_id: userId, role });
      
      return userWithoutPassword;
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Deactivate user (admin only)
  static async deactivateUser(userId: number): Promise<void> {
    const action = 'Deactivate User';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { user_id: userId });
      
      const result = await client.query(
        'UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [userId]
      );
      
      if (result.rowCount === 0) {
        throw createError('User not found', 404);
      }
      
      MyLogger.success(action, { user_id: userId });
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async reactivateUser(userId: number): Promise<User> {
    const action = 'Reactivate User';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { user_id: userId });
      
      const result = await client.query(
        'UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
        [userId]
      );
      
      if (result.rowCount === 0) {
        throw createError('User not found', 404);
      }
      
      const user = result.rows[0];
      MyLogger.success(action, { user_id: userId });
      
      return user;
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Generate JWT token
  private static generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN } as jwt.SignOptions);
  }

  // Verify JWT token
  static verifyToken(token: string): JwtPayload {
    try {
      return jwt.verify(token, this.JWT_SECRET) as JwtPayload;
    } catch (error) {
      throw createError('Invalid token', 401);
    } 
  }

  // Generate password reset token
  static async generatePasswordResetToken(email: string): Promise<string> {
    const action = 'Generate Password Reset Token';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { email });
      
      // Check if user exists
      const userResult = await client.query(
        'SELECT id FROM users WHERE email = $1 AND is_active = true',
        [email]
      );
      
      if (userResult.rows.length === 0) {
        // Don't reveal if email exists or not
        MyLogger.info(action, { email, result: 'User not found (silent)' });
        return 'Token generated'; // Return success message regardless
      }
      
      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour
      
      // Save reset token
      await client.query(
        'UPDATE users SET password_reset_token = $1, password_reset_expires = $2 WHERE email = $3',
        [resetToken, resetExpires, email]
      );
      
      MyLogger.success(action, { email });
      
      // In a real application, you would send this token via email
      // For now, we'll return it (remove this in production)
      return resetToken;
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Reset password with token
  static async resetPasswordWithToken(token: string, newPassword: string): Promise<void> {
    const action = 'Reset Password with Token';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { token: token.substring(0, 8) + '...' });
      
      // Find user with valid reset token
      const userResult = await client.query(
        'SELECT id FROM users WHERE password_reset_token = $1 AND password_reset_expires > CURRENT_TIMESTAMP',
        [token]
      );
      
      if (userResult.rows.length === 0) {
        throw createError('Invalid or expired reset token', 400);
      }
      
      const userId = userResult.rows[0].id;
      
      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, this.BCRYPT_ROUNDS);
      
      // Update password and clear reset token
      await client.query(
        'UPDATE users SET password_hash = $1, password_reset_token = NULL, password_reset_expires = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
        [hashedPassword, userId]
      );
      
      MyLogger.success(action, { user_id: userId });
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== RBAC METHODS FOR FRONTEND ====================

  // Get user with all permissions (for frontend RBAC)
  static async getUserWithPermissions(userId: number): Promise<UserWithPermissions> {
    const action = 'AuthMediator.getUserWithPermissions';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { userId });
      
      // Get basic user profile
      const user = await this.getUserProfile(userId);
      
      // Get user's role details
      const roleQuery = `
        SELECT r.* FROM roles r
        INNER JOIN users u ON u.role_id = r.id
        WHERE u.id = $1
      `;
      const roleResult = await client.query(roleQuery, [userId]);
      const userRole = roleResult.rows[0] || null;
      
      // Get role permissions
      const rolePermissionsQuery = `
        SELECT p.* FROM permissions p
        INNER JOIN role_permissions rp ON rp.permission_id = p.id
        INNER JOIN users u ON u.role_id = rp.role_id
        WHERE u.id = $1
      `;
      const rolePermissionsResult = await client.query(rolePermissionsQuery, [userId]);
      const rolePermissions = rolePermissionsResult.rows;
      
      // Get direct user permissions
      const directPermissionsQuery = `
        SELECT p.* FROM permissions p
        INNER JOIN user_permissions up ON up.permission_id = p.id
        WHERE up.user_id = $1 
          AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
      `;
      const directPermissionsResult = await client.query(directPermissionsQuery, [userId]);
      const directPermissions = directPermissionsResult.rows;
      
      // Combine all permissions (remove duplicates)
      const allPermissionsMap = new Map();
      [...rolePermissions, ...directPermissions].forEach(permission => {
        allPermissionsMap.set(permission.id, permission);
      });
      const allPermissions = Array.from(allPermissionsMap.values());
      
      const userWithPermissions: UserWithPermissions = {
        id: user.id,
        username: user.username,
        email: user.email,
        first_name: user.full_name.split(' ')[0] || user.full_name,
        last_name: user.full_name.split(' ').slice(1).join(' ') || '',
        phone: user.mobile_number,
        is_active: user.is_active,
        role: user.role,
        role_id: userRole?.id || user.role_id,
        role_details: userRole,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
        last_login: user.last_login?.toISOString(),
        role_permissions: rolePermissions,
        direct_permissions: directPermissions,
        all_permissions: allPermissions
      };
      
      MyLogger.success(action, { 
        userId, 
        rolePermissionsCount: rolePermissions.length,
        directPermissionsCount: directPermissions.length,
        totalPermissionsCount: allPermissions.length
      });
      
      return userWithPermissions;
      
    } catch (error) {
      MyLogger.error(action, error, { userId });
      throw error;
    } finally {
      client.release();
    }
  }

  // Check if user has a specific permission (delegates to RoleMediator)
  static async hasPermission(userId: number, check: PermissionCheck): Promise<boolean> {
    return RoleMediator.hasPermission(userId, check);
  }

  // Check if user has any of the specified permissions (delegates to RoleMediator)
  static async hasAnyPermission(userId: number, checks: PermissionCheck[]): Promise<boolean> {
    return RoleMediator.hasAnyPermission(userId, checks);
  }
}
