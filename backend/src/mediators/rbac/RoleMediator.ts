import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';
import { createError } from '@/utils/responseHelper';
import {
  Role,
  Permission,
  RoleWithPermissions,
  UserWithPermissions,
  CreateRoleRequest,
  UpdateRoleRequest,
  RolePermissionRequest,
  AssignPermissionRequest,
  PermissionCheck,
  PermissionContext,
  DepartmentStats,
  PermissionStats,
  ROLE_NAMES
} from '@/types/rbac';

export class RoleMediator {
  
  // ==================== ROLE MANAGEMENT ====================
  
  static async getAllRoles(): Promise<Role[]> {
    const action = 'RoleMediator.getAllRoles';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action);
      
      const query = `
        SELECT * FROM roles 
        WHERE is_active = true
        ORDER BY level ASC, display_name ASC
      `;
      
      const result = await client.query(query);
      
      MyLogger.success(action, { rolesCount: result.rows.length });
      return result.rows;
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getRoleById(roleId: number): Promise<RoleWithPermissions> {
    const action = 'RoleMediator.getRoleById';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { roleId });
      
      // Get role details
      const roleQuery = `
        SELECT r.*, 
               COUNT(u.id) as user_count
        FROM roles r
        LEFT JOIN users u ON u.role_id = r.id AND u.is_active = true
        WHERE r.id = $1
        GROUP BY r.id
      `;
      
      const roleResult = await client.query(roleQuery, [roleId]);
      
      if (roleResult.rows.length === 0) {
        throw createError('Role not found', 404);
      }
      
      const role = roleResult.rows[0];
      
      // Get role permissions
      const permissionsQuery = `
        SELECT p.* 
        FROM permissions p
        INNER JOIN role_permissions rp ON rp.permission_id = p.id
        WHERE rp.role_id = $1
        ORDER BY p.module, p.action, p.resource
      `;
      
      const permissionsResult = await client.query(permissionsQuery, [roleId]);
      
      const roleWithPermissions: RoleWithPermissions = {
        ...role,
        permissions: permissionsResult.rows,
        user_count: parseInt(role.user_count)
      };
      
      MyLogger.success(action, { roleId, permissionsCount: permissionsResult.rows.length });
      return roleWithPermissions;
      
    } catch (error) {
      MyLogger.error(action, error, { roleId });
      throw error;
    } finally {
      client.release();
    }
  }

  static async createRole(data: CreateRoleRequest, createdBy: number): Promise<Role> {
    const action = 'RoleMediator.createRole';
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      MyLogger.info(action, { roleName: data.name });
      
      // Check if role name already exists
      const existingRole = await client.query('SELECT id FROM roles WHERE name = $1', [data.name]);
      if (existingRole.rows.length > 0) {
        throw createError('Role name already exists', 400);
      }
      
      // Create role
      const roleQuery = `
        INSERT INTO roles (name, display_name, description, level, department)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `;
      
      const roleResult = await client.query(roleQuery, [
        data.name,
        data.display_name,
        data.description,
        data.level,
        data.department
      ]);
      
      const role = roleResult.rows[0];
      
      // Assign permissions if provided
      if (data.permission_ids && data.permission_ids.length > 0) {
        await this.assignPermissionsToRole(client, role.id, data.permission_ids, createdBy);
      }
      
      await client.query('COMMIT');
      
      MyLogger.success(action, { roleId: role.id, roleName: role.name });
      return role;
      
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { roleName: data.name });
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateRole(roleId: number, data: UpdateRoleRequest, updatedBy: number): Promise<Role> {
    const action = 'RoleMediator.updateRole';
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      MyLogger.info(action, { roleId });
      
      // Build dynamic update query
      const updateFields = [];
      const values = [];
      let paramCount = 1;
      
      if (data.display_name !== undefined) {
        updateFields.push(`display_name = $${paramCount++}`);
        values.push(data.display_name);
      }
      
      if (data.description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        values.push(data.description);
      }
      
      if (data.level !== undefined) {
        updateFields.push(`level = $${paramCount++}`);
        values.push(data.level);
      }
      
      if (data.department !== undefined) {
        updateFields.push(`department = $${paramCount++}`);
        values.push(data.department);
      }
      
      if (data.is_active !== undefined) {
        updateFields.push(`is_active = $${paramCount++}`);
        values.push(data.is_active);
      }
      
      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      values.push(roleId);
      
      const updateQuery = `
        UPDATE roles 
        SET ${updateFields.join(', ')}
        WHERE id = $${paramCount}
        RETURNING *
      `;
      
      const result = await client.query(updateQuery, values);
      
      if (result.rows.length === 0) {
        throw createError('Role not found', 404);
      }
      
      const role = result.rows[0];
      
      // Update permissions if provided
      if (data.permission_ids !== undefined) {
        // Remove existing permissions
        await client.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
        
        // Add new permissions
        if (data.permission_ids.length > 0) {
          await this.assignPermissionsToRole(client, roleId, data.permission_ids, updatedBy);
        }
      }
      
      await client.query('COMMIT');
      
      MyLogger.success(action, { roleId, roleName: role.name });
      return role;
      
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { roleId });
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteRole(roleId: number): Promise<void> {
    const action = 'RoleMediator.deleteRole';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { roleId });
      
      // Check if role is being used by any users
      const usersResult = await client.query('SELECT COUNT(*) as count FROM users WHERE role_id = $1', [roleId]);
      const userCount = parseInt(usersResult.rows[0].count);
      
      if (userCount > 0) {
        throw createError(`Cannot delete role. It is assigned to ${userCount} user(s)`, 400);
      }
      
      // Soft delete by setting is_active to false
      const result = await client.query(`
        UPDATE roles 
        SET is_active = false, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $1
        RETURNING name
      `, [roleId]);
      
      if (result.rows.length === 0) {
        throw createError('Role not found', 404);
      }
      
      MyLogger.success(action, { roleId, roleName: result.rows[0].name });
      
    } catch (error) {
      MyLogger.error(action, error, { roleId });
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== PERMISSION MANAGEMENT ====================
  
  static async getAllPermissions(): Promise<Permission[]> {
    const action = 'RoleMediator.getAllPermissions';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action);
      
      const query = `
        SELECT * FROM permissions 
        ORDER BY module, action, resource
      `;
      
      const result = await client.query(query);
      
      MyLogger.success(action, { permissionsCount: result.rows.length });
      return result.rows;
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getPermissionsByModule(module: string): Promise<Permission[]> {
    const action = 'RoleMediator.getPermissionsByModule';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { module });
      
      const query = `
        SELECT * FROM permissions 
        WHERE module = $1
        ORDER BY action, resource
      `;
      
      const result = await client.query(query, [module]);
      
      MyLogger.success(action, { module, permissionsCount: result.rows.length });
      return result.rows;
      
    } catch (error) {
      MyLogger.error(action, error, { module });
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== USER PERMISSION MANAGEMENT ====================
  
  static async getUserPermissions(userId: number): Promise<UserWithPermissions> {
    const action = 'RoleMediator.getUserPermissions';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { userId });
      
      // Get user with role information
      const userQuery = `
        SELECT u.*, r.name as role_name, r.display_name as role_display_name, 
               r.level as role_level, r.department as role_department
        FROM users u
        LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.id = $1
      `;
      
      const userResult = await client.query(userQuery, [userId]);
      
      if (userResult.rows.length === 0) {
        throw createError('User not found', 404);
      }
      
      const user = userResult.rows[0];
      
      // Get role-based permissions
      const rolePermissionsQuery = `
        SELECT DISTINCT p.* 
        FROM permissions p
        INNER JOIN role_permissions rp ON rp.permission_id = p.id
        WHERE rp.role_id = $1
        ORDER BY p.module, p.action, p.resource
      `;
      
      let rolePermissions = [];
      if (user.role_id) {
        const rolePermResult = await client.query(rolePermissionsQuery, [user.role_id]);
        rolePermissions = rolePermResult.rows;
      }
      
      // Get direct user permissions
      const directPermissionsQuery = `
        SELECT p.* 
        FROM permissions p
        INNER JOIN user_permissions up ON up.permission_id = p.id
        WHERE up.user_id = $1 
          AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
        ORDER BY p.module, p.action, p.resource
      `;
      
      const directPermResult = await client.query(directPermissionsQuery, [userId]);
      const directPermissions = directPermResult.rows;
      
      // Combine all permissions (remove duplicates)
      const allPermissionsMap = new Map();
      
      rolePermissions.forEach(perm => {
        allPermissionsMap.set(perm.name, perm);
      });
      
      directPermissions.forEach(perm => {
        allPermissionsMap.set(perm.name, perm);
      });
      
      const allPermissions = Array.from(allPermissionsMap.values());
      
      const userWithPermissions: UserWithPermissions = {
        ...user,
        role_permissions: rolePermissions,
        direct_permissions: directPermissions,
        all_permissions: allPermissions
      };
      
      MyLogger.success(action, { 
        userId, 
        rolePermissions: rolePermissions.length,
        directPermissions: directPermissions.length,
        totalPermissions: allPermissions.length
      });
      
      return userWithPermissions;
      
    } catch (error) {
      MyLogger.error(action, error, { userId });
      throw error;
    } finally {
      client.release();
    }
  }

  static async assignPermissionsToUser(data: AssignPermissionRequest, assignedBy: number): Promise<void> {
    const action = 'RoleMediator.assignPermissionsToUser';
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      MyLogger.info(action, { userId: data.user_id, permissionCount: data.permission_ids.length });
      
      // Remove existing direct permissions for this user
      await client.query('DELETE FROM user_permissions WHERE user_id = $1', [data.user_id]);
      
      // Add new permissions
      for (const permissionId of data.permission_ids) {
        await client.query(`
          INSERT INTO user_permissions (user_id, permission_id, granted_by, expires_at)
          VALUES ($1, $2, $3, $4)
        `, [data.user_id, permissionId, assignedBy, data.expires_at || null]);
      }
      
      await client.query('COMMIT');
      
      MyLogger.success(action, { userId: data.user_id, permissionsAssigned: data.permission_ids.length });
      
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { userId: data.user_id });
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== PERMISSION CHECKING ====================
  
  static async hasPermission(userId: number, check: PermissionCheck): Promise<boolean> {
    const action = 'RoleMediator.hasPermission';
    const client = await pool.connect();
    
    try {
      // Check for exact permission match
      const query = `
        SELECT 1 FROM (
          -- Role-based permissions
          SELECT p.module, p.action, p.resource
          FROM permissions p
          INNER JOIN role_permissions rp ON rp.permission_id = p.id
          INNER JOIN users u ON u.role_id = rp.role_id
          WHERE u.id = $1 AND u.is_active = true
          
          UNION
          
          -- Direct user permissions
          SELECT p.module, p.action, p.resource
          FROM permissions p
          INNER JOIN user_permissions up ON up.permission_id = p.id
          WHERE up.user_id = $1 
            AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
        ) perms
        WHERE perms.module = $2 AND perms.action = $3 AND perms.resource = $4
        LIMIT 1
      `;
      
      const result = await client.query(query, [userId, check.module, check.action, check.resource]);
      
      const hasAccess = result.rows.length > 0;
      
      MyLogger.info(action, { 
        userId, 
        permission: `${check.module}.${check.action}.${check.resource}`,
        hasAccess 
      });
      
      return hasAccess;
      
    } catch (error) {
      MyLogger.error(action, error, { userId, check });
      return false;
    } finally {
      client.release();
    }
  }

  static async hasAnyPermission(userId: number, checks: PermissionCheck[]): Promise<boolean> {
    for (const check of checks) {
      if (await this.hasPermission(userId, check)) {
        return true;
      }
    }
    return false;
  }

  static async getUserPermissionNames(userId: number): Promise<string[]> {
    const action = 'RoleMediator.getUserPermissionNames';
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT DISTINCT p.name
        FROM permissions p
        WHERE p.id IN (
          -- Role-based permissions
          SELECT rp.permission_id
          FROM role_permissions rp
          INNER JOIN users u ON u.role_id = rp.role_id
          WHERE u.id = $1 AND u.is_active = true
          
          UNION
          
          -- Direct user permissions
          SELECT up.permission_id
          FROM user_permissions up
          WHERE up.user_id = $1 
            AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
        )
        ORDER BY p.name
      `;
      
      const result = await client.query(query, [userId]);
      const permissions = result.rows.map(row => row.name);
      
      MyLogger.success(action, { userId, permissionCount: permissions.length });
      return permissions;
      
    } catch (error) {
      MyLogger.error(action, error, { userId });
      throw error;
    } finally {
      client.release();
    }
  }

  // ==================== ANALYTICS & REPORTING ====================

  // ==================== HELPER METHODS ====================
  
  private static async assignPermissionsToRole(
    client: any, 
    roleId: number, 
    permissionIds: number[], 
    assignedBy: number
  ): Promise<void> {
    for (const permissionId of permissionIds) {
      await client.query(`
        INSERT INTO role_permissions (role_id, permission_id, granted_by)
        VALUES ($1, $2, $3)
        ON CONFLICT (role_id, permission_id) DO NOTHING
      `, [roleId, permissionId, assignedBy]);
    }
  }

  // Check if user has admin privileges
  static async isSystemAdmin(userId: number): Promise<boolean> {
    const action = 'RoleMediator.isSystemAdmin';
    const client = await pool.connect();
    
    try {
      const query = `
        SELECT 1 FROM users u
        INNER JOIN roles r ON r.id = u.role_id
        WHERE u.id = $1 AND u.is_active = true 
          AND r.name = $2 AND r.is_active = true
        LIMIT 1
      `;
      
      const result = await client.query(query, [userId, ROLE_NAMES.SYSTEM_ADMIN]);
      
      return result.rows.length > 0;
      
    } catch (error) {
      MyLogger.error(action, error, { userId });
      return false;
    } finally {
      client.release();
    }
  }

  // ==================== ADDITIONAL METHODS FOR COMPREHENSIVE API ====================

  static async getPermissionById(permissionId: number): Promise<Permission> {
    const action = 'RoleMediator.getPermissionById';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { permissionId });
      
      const query = `
        SELECT * FROM permissions 
        WHERE id = $1
      `;
      
      const result = await client.query(query, [permissionId]);
      
      if (result.rows.length === 0) {
        throw createError('Permission not found', 404);
      }
      
      MyLogger.success(action, { permissionId, permissionName: result.rows[0].name });
      return result.rows[0];
      
    } catch (error) {
      MyLogger.error(action, error, { permissionId });
      throw error;
    } finally {
      client.release();
    }
  }

  static async assignPermissionsToRolePublic(
    roleId: number, 
    permissionIds: number[], 
    assignedBy: number
  ): Promise<void> {
    const action = 'RoleMediator.assignPermissionsToRolePublic';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { roleId, permissionIds, assignedBy });
      
      await client.query('BEGIN');
      
      // Check if role exists
      const roleCheck = await client.query('SELECT id FROM roles WHERE id = $1', [roleId]);
      if (roleCheck.rows.length === 0) {
        throw createError('Role not found', 404);
      }
      
      // Assign permissions to role
      await this.assignPermissionsToRole(client, roleId, permissionIds, assignedBy);
      
      await client.query('COMMIT');
      
      MyLogger.success(action, { roleId, assignedPermissions: permissionIds.length, assignedBy });
      
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { roleId, permissionIds, assignedBy });
      throw error;
    } finally {
      client.release();
    }
  }

  static async removePermissionsFromRole(
    roleId: number, 
    permissionIds: number[], 
    removedBy: number
  ): Promise<void> {
    const action = 'RoleMediator.removePermissionsFromRole';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { roleId, permissionIds, removedBy });
      
      await client.query('BEGIN');
      
      // Check if role exists
      const roleCheck = await client.query('SELECT id FROM roles WHERE id = $1', [roleId]);
      if (roleCheck.rows.length === 0) {
        throw createError('Role not found', 404);
      }
      
      // Remove permissions from role
      for (const permissionId of permissionIds) {
        await client.query(`
          DELETE FROM role_permissions 
          WHERE role_id = $1 AND permission_id = $2
        `, [roleId, permissionId]);
      }
      
      await client.query('COMMIT');
      
      MyLogger.success(action, { roleId, removedPermissions: permissionIds.length, removedBy });
      
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { roleId, permissionIds, removedBy });
      throw error;
    } finally {
      client.release();
    }
  }

  static async removePermissionsFromUser(
    userId: number, 
    permissionIds: number[], 
    removedBy: number
  ): Promise<void> {
    const action = 'RoleMediator.removePermissionsFromUser';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { userId, permissionIds, removedBy });
      
      await client.query('BEGIN');
      
      // Check if user exists
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        throw createError('User not found', 404);
      }
      
      // Remove permissions from user
      for (const permissionId of permissionIds) {
        await client.query(`
          DELETE FROM user_permissions 
          WHERE user_id = $1 AND permission_id = $2
        `, [userId, permissionId]);
      }
      
      await client.query('COMMIT');
      
      MyLogger.success(action, { userId, removedPermissions: permissionIds.length, removedBy });
      
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { userId, permissionIds, removedBy });
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateUserRole(userId: number, roleId: number, updatedBy: number): Promise<void> {
    const action = 'RoleMediator.updateUserRole';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { userId, roleId, updatedBy });
      
      await client.query('BEGIN');
      
      // Check if user exists
      const userCheck = await client.query('SELECT id FROM users WHERE id = $1', [userId]);
      if (userCheck.rows.length === 0) {
        throw createError('User not found', 404);
      }
      
      // Check if role exists
      const roleCheck = await client.query('SELECT id FROM roles WHERE id = $1 AND is_active = true', [roleId]);
      if (roleCheck.rows.length === 0) {
        throw createError('Role not found or inactive', 404);
      }
      
      // Update user's role
      await client.query(`
        UPDATE users 
        SET role_id = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [roleId, userId]);
      
      await client.query('COMMIT');
      
      MyLogger.success(action, { userId, newRoleId: roleId, updatedBy });
      
    } catch (error) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { userId, roleId, updatedBy });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getRoleStats(): Promise<any> {
    const action = 'RoleMediator.getRoleStats';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action);
      
      const stats = await client.query(`
        SELECT 
          COUNT(*) as total_roles,
          COUNT(*) FILTER (WHERE is_active = true) as active_roles,
          COUNT(*) FILTER (WHERE is_active = false) as inactive_roles,
          COUNT(DISTINCT department) as unique_departments,
          AVG(level) as average_level,
          MIN(level) as min_level,
          MAX(level) as max_level
        FROM roles
      `);
      
      const departmentStats = await client.query(`
        SELECT 
          COALESCE(department, 'General') as department,
          COUNT(*) as role_count,
          COUNT(*) FILTER (WHERE is_active = true) as active_count
        FROM roles
        GROUP BY department
        ORDER BY role_count DESC
      `);
      
      const levelStats = await client.query(`
        SELECT 
          level,
          COUNT(*) as role_count,
          COUNT(*) FILTER (WHERE is_active = true) as active_count
        FROM roles
        GROUP BY level
        ORDER BY level
      `);
      
      const result = {
        overview: stats.rows[0],
        by_department: departmentStats.rows,
        by_level: levelStats.rows
      };
      
      MyLogger.success(action, { totalRoles: stats.rows[0].total_roles });
      return result;
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getUsersWithPermission(permissionCheck: PermissionCheck): Promise<any[]> {
    const action = 'RoleMediator.getUsersWithPermission';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action, { permissionCheck });
      
      const query = `
        SELECT DISTINCT 
          u.id,
          u.username,
          u.email,
          u.full_name,
          u.is_active,
          u.last_login,
          r.name as role_name,
          r.display_name as role_display_name,
          'role' as permission_source
        FROM users u
        LEFT JOIN roles r ON r.id = u.role_id
        WHERE u.id IN (
          -- Users with role-based permission
          SELECT DISTINCT u.id
          FROM users u
          INNER JOIN roles r ON r.id = u.role_id
          INNER JOIN role_permissions rp ON rp.role_id = r.id
          INNER JOIN permissions p ON p.id = rp.permission_id
          WHERE u.is_active = true 
            AND r.is_active = true
            AND p.module = $1 
            AND p.action = $2 
            AND p.resource = $3
          
          UNION
          
          -- Users with direct permission
          SELECT DISTINCT u.id
          FROM users u
          INNER JOIN user_permissions up ON up.user_id = u.id
          INNER JOIN permissions p ON p.id = up.permission_id
          WHERE u.is_active = true
            AND (up.expires_at IS NULL OR up.expires_at > CURRENT_TIMESTAMP)
            AND p.module = $1 
            AND p.action = $2 
            AND p.resource = $3
        )
        ORDER BY u.full_name
      `;
      
      const result = await client.query(query, [
        permissionCheck.module,
        permissionCheck.action,
        permissionCheck.resource
      ]);
      
      MyLogger.success(action, { 
        permission: `${permissionCheck.module}.${permissionCheck.action}.${permissionCheck.resource}`,
        userCount: result.rows.length
      });
      
      return result.rows;
      
    } catch (error) {
      MyLogger.error(action, error, { permissionCheck });
      throw error;
    } finally {
      client.release();
    }
  }

  static async getDepartmentStats(): Promise<any[]> {
    const action = 'RoleMediator.getDepartmentStats';
    const client = await pool.connect();
    
    try {
      MyLogger.info(action);
      
      const query = `
        SELECT 
          COALESCE(r.department, 'General') as department,
          COUNT(r.id) as total_roles,
          COUNT(r.id) FILTER (WHERE r.is_active = true) as active_roles,
          COUNT(u.id) as total_users,
          COUNT(u.id) FILTER (WHERE u.is_active = true) as active_users,
          AVG(r.level) as average_role_level,
          MIN(r.level) as min_role_level,
          MAX(r.level) as max_role_level,
          COUNT(DISTINCT rp.permission_id) as unique_permissions
        FROM roles r
        LEFT JOIN users u ON u.role_id = r.id
        LEFT JOIN role_permissions rp ON rp.role_id = r.id
        GROUP BY COALESCE(r.department, 'General')
        ORDER BY total_roles DESC, department ASC
      `;
      
      const result = await client.query(query);
      
      const departmentStats = result.rows.map(row => ({
        department: row.department,
        total_roles: parseInt(row.total_roles) || 0,
        active_roles: parseInt(row.active_roles) || 0,
        total_users: parseInt(row.total_users) || 0,
        active_users: parseInt(row.active_users) || 0,
        average_role_level: parseFloat(row.average_role_level) || 0,
        min_role_level: parseInt(row.min_role_level) || 0,
        max_role_level: parseInt(row.max_role_level) || 0,
        unique_permissions: parseInt(row.unique_permissions) || 0
      }));
      
      MyLogger.success(action, { 
        departmentCount: departmentStats.length,
        totalRoles: departmentStats.reduce((sum, dept) => sum + dept.total_roles, 0),
        totalUsers: departmentStats.reduce((sum, dept) => sum + dept.total_users, 0)
      });
      
      return departmentStats;
      
    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}
