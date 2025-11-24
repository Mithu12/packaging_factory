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
import { generatePassword } from '@/utils/passwordGenerator';
import { getEmailService } from '@/utils/emailService';

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
        role: user.role,
        factory_id: user.factory_id ? user.factory_id : (user.role === UserRole.ADMIN ? -1 : null)
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
        registerData.role,
        true,
        false
      ]);

      const user = userResult.rows[0];

      // Generate JWT token
      const token = this.generateToken({
        user_id: user.id,
        username: user.username,
        role: user.role,
        factory_id: user.factory_id ? user.factory_id : (user.role === UserRole.ADMIN ? -1 : null)
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

      if (updateData.distribution_center_id !== undefined) {
        updateFields.push(`distribution_center_id = $${paramCount++}`);
        updateValues.push(updateData.distribution_center_id);
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

      const userWithPermissions = {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        mobile_number: user.mobile_number,
        departments: user.departments || [],
        is_active: user.is_active,
        role: user.role,
        role_id: userRole?.id || user.role_id,
        role_details: userRole,
        created_at: user.created_at.toISOString(),
        updated_at: user.updated_at.toISOString(),
        last_login: user.last_login?.toISOString(),
        distribution_center_id: user.distribution_center_id,
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

      return userWithPermissions as UserWithPermissions;

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

  // ==================== USER MANAGEMENT METHODS ====================

  // Get all users with RBAC data
  static async getAllUsers(): Promise<UserWithPermissions[]> {
    const action = 'AuthMediator.getAllUsers';
    const client = await pool.connect();

    try {


      MyLogger.info(action);

      const query = `
        SELECT 
          u.*,
          r.id as role_id,
          r.name as role_name,
          r.display_name as role_display_name,
          r.level as role_level,
          r.department as role_department
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.is_active = true
        ORDER BY u.created_at DESC
      `;

      const result = await client.query(query);
      const users = result.rows;

      // Get permissions for each user
      const usersWithPermissions: UserWithPermissions[] = [];

      for (const user of users) {
        try {
          // Get role permissions
          const rolePermissionsQuery = `
            SELECT p.* FROM permissions p
            INNER JOIN role_permissions rp ON rp.permission_id = p.id
            WHERE rp.role_id = $1
          `;
          const rolePermissionsResult = await client.query(rolePermissionsQuery, [user.role_id]);
          const rolePermissions = rolePermissionsResult.rows;

          // Get direct user permissions
          const directPermissionsQuery = `
            SELECT p.* FROM permissions p
            INNER JOIN user_permissions up ON up.permission_id = p.id
            WHERE up.user_id = $1
              AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
          `;
          const directPermissionsResult = await client.query(directPermissionsQuery, [user.id]);
          const directPermissions = directPermissionsResult.rows;

          // Combine all permissions (remove duplicates)
          const allPermissionsMap = new Map();
          [...rolePermissions, ...directPermissions].forEach(permission => {
            allPermissionsMap.set(permission.id, permission);
          });
          const allPermissions = Array.from(allPermissionsMap.values());

          const userWithPermissions = {
            id: user.id,
            username: user.username,
            distribution_center_id: user.distribution_center_id,
            email: user.email,
            full_name: user.full_name,
            mobile_number: user.mobile_number,
            departments: user.departments || [],
            role: user.role_name || 'No Role', // Legacy role field
            role_id: user.role_id,
            is_active: user.is_active,
            last_login: user.last_login?.toISOString(),
            created_at: user.created_at.toISOString(),
            updated_at: user.updated_at.toISOString(),
            role_details: user.role_id ? {
              id: user.role_id,
              name: user.role_name,
              display_name: user.role_display_name,
              level: user.role_level,
              department: user.role_department,
              is_active: true,
              created_at: user.created_at.toISOString(),
              updated_at: user.updated_at.toISOString()
            } : undefined,
            role_permissions: rolePermissions,
            direct_permissions: directPermissions,
            all_permissions: allPermissions
          };

          usersWithPermissions.push(userWithPermissions as UserWithPermissions);
        } catch (userError) {
          MyLogger.error(`Error processing user ${user.id}`, userError);
          // Continue with next user
        }
      }

      MyLogger.success(action, {
        totalUsers: usersWithPermissions.length,
        usersWithRoles: usersWithPermissions.filter(u => u.role_id).length
      });

      return usersWithPermissions;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Create new user with RBAC role
  static async createUser(userData: {
    username: string;
    email: string;
    full_name: string;
    mobile_number?: string;
    departments?: string[];
    role_id: number;
    password?: string;
    distribution_center_id?: number;
  }): Promise<UserWithPermissions> {
    const action = 'AuthMediator.createUser';
    const client = await pool.connect();
    let generatedPassword: string | undefined = undefined;

    try {
      MyLogger.info(action, { username: userData.username, email: userData.email });

      await client.query('BEGIN');

      // Check if username or email already exists
      const existingUserQuery = `
        SELECT id FROM users 
        WHERE username = $1 OR email = $2
      `;
      const existingUser = await client.query(existingUserQuery, [userData.username, userData.email]);

      if (existingUser.rows.length > 0) {
        throw createError('Username or email already exists', 400);
      }

      // Verify role exists
      const roleQuery = 'SELECT id FROM roles WHERE id = $1 AND is_active = true';
      const roleResult = await client.query(roleQuery, [userData.role_id]);

      if (roleResult.rows.length === 0) {
        throw createError('Invalid role specified', 400);
      }

      // Generate password if not provided
      const passwordToUse = userData.password || generatePassword();
      if (!userData.password) {
        generatedPassword = passwordToUse;
        MyLogger.info(action, {
          message: 'Password auto-generated',
          username: userData.username
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(passwordToUse, this.BCRYPT_ROUNDS);

      // Create user
      const insertQuery = `
        INSERT INTO users (
          username, email, full_name, mobile_number, 
          departments, role_id, password_hash, is_active, distribution_center_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8)
        RETURNING *
      `;

      const result = await client.query(insertQuery, [
        userData.username,
        userData.email,
        userData.full_name,
        userData.mobile_number,
        userData.departments || [],
        userData.role_id,
        hashedPassword,
        userData.distribution_center_id || null
      ]);

      const newUser = result.rows[0];

      await client.query('COMMIT');

      MyLogger.success(action, {
        userId: newUser.id,
        username: newUser.username,
        roleId: userData.role_id,
        passwordGenerated: !!generatedPassword
      });

      // Send welcome email with password if it was auto-generated
      if (generatedPassword) {
        try {
          const emailService = await getEmailService();
          const emailSent = await emailService.sendWelcomeEmail(
            userData.email,
            userData.full_name,
            userData.username,
            generatedPassword
          );

          if (emailSent) {
            MyLogger.success(action, {
              message: 'Welcome email sent successfully',
              email: userData.email
            });
          } else {
            MyLogger.warn(action, {
              message: 'Failed to send welcome email (user still created)',
              email: userData.email
            });
          }
        } catch (emailError) {
          // Don't fail user creation if email fails
          MyLogger.error(action, emailError, {
            message: 'Error sending welcome email (user still created)',
            email: userData.email
          });
        }
      }

      // Return user with permissions
      return await this.getUserWithPermissions(newUser.id);

    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { username: userData.username });
      throw error;
    } finally {
      client.release();
    }
  }

  // Update user with RBAC role
  static async updateUser(userId: number, userData: {
    username?: string;
    email?: string;
    full_name?: string;
    mobile_number?: string;
    departments?: string[];
    role_id?: number;
    distribution_center_id?: number;
  }): Promise<UserWithPermissions> {
    const action = 'AuthMediator.updateUser';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { userId, updates: Object.keys(userData) });

      await client.query('BEGIN');

      // Check if user exists
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        throw createError('User not found', 404);
      }

      // If updating username or email, check for conflicts
      if (userData.username || userData.email) {
        const conflictQuery = `
          SELECT id FROM users 
          WHERE (username = $1 OR email = $2) AND id != $3
        `;
        const conflictResult = await client.query(conflictQuery, [
          userData.username || '',
          userData.email || '',
          userId
        ]);

        if (conflictResult.rows.length > 0) {
          throw createError('Username or email already exists', 400);
        }
      }

      // If updating role, verify it exists
      if (userData.role_id) {
        const roleQuery = 'SELECT id FROM roles WHERE id = $1 AND is_active = true';
        const roleResult = await client.query(roleQuery, [userData.role_id]);

        if (roleResult.rows.length === 0) {
          throw createError('Invalid role specified', 400);
        }
      }

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramCount = 1;

      Object.entries(userData).forEach(([key, value]) => {
        if (value !== undefined) {
          updateFields.push(`${key} = $${paramCount}`);
          updateValues.push(value);
          paramCount++;
        }
      });

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

      const result = await client.query(updateQuery, updateValues);
      const updatedUser = result.rows[0];

      await client.query('COMMIT');

      MyLogger.success(action, {
        userId,
        updatedFields: Object.keys(userData),
        newRoleId: userData.role_id
      });

      // Return user with updated permissions
      return await this.getUserWithPermissions(userId);

    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { userId });
      throw error;
    } finally {
      client.release();
    }
  }

}
