import pool from "@/database/connection";
import { Factory, CreateFactoryRequest, UpdateFactoryRequest } from "@/types/factory";
import { MyLogger } from "@/utils/new-logger";

// Helper function to get user's accessible factories
async function getUserFactories(userId: number): Promise<{factory_id: string, factory_name: string, factory_code: string, role: string, is_primary: boolean}[]> {
  const query = 'SELECT * FROM get_user_factories($1)';
  const result = await pool.query(query, [userId]);
  return result.rows;
}

// Helper function to check if user is admin
async function isUserAdmin(userId: number): Promise<boolean> {
  const query = 'SELECT role_id FROM users WHERE id = $1';
  const result = await pool.query(query, [userId]);
  if (result.rows.length === 0) return false;

  // Assuming role_id 1 is admin based on common patterns
  return result.rows[0].role_id === 1;
}

// Helper function to check if user has factory access
async function userHasFactoryAccess(userId: number, factoryId: string): Promise<boolean> {
  const query = 'SELECT * FROM user_has_factory_access($1, $2)';
  const result = await pool.query(query, [userId, factoryId]);
  return result.rows[0].user_has_factory_access;
}

export class FactoryMediator {
  static async getAllFactories(params: any = {}, userId?: number): Promise<{
    factories: Factory[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const action = "FactoryMediator.getAllFactories";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params, userId });

      const {
        page = 1,
        limit = 20,
        search,
        is_active = true
      } = params;

      const offset = (page - 1) * limit;

      // Get user's accessible factories
      let userFactories: string[] = [];
      if (userId) {
        const isAdmin = await isUserAdmin(userId);
        if (!isAdmin) {
          const factories = await getUserFactories(userId);
          userFactories = factories.map(f => f.factory_id);
        }
      }

      // Build WHERE clause
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;
      let whereClauseParamCount = 0;

      if (search) {
        whereClause += ` AND (name ILIKE $${paramIndex} OR code ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        queryParams.push(`%${search}%`);
        paramIndex++;
        whereClauseParamCount++;
      }

      if (is_active !== undefined) {
        whereClause += ` AND is_active = $${paramIndex}`;
        queryParams.push(is_active);
        paramIndex++;
        whereClauseParamCount++;
      }

      // Add factory filtering for non-admin users
      if (userId && userFactories.length > 0) {
        const factoryIds = userFactories.map((_, index) => `$${paramIndex + index}`);
        whereClause += ` AND id IN (${factoryIds.join(', ')})`;
        queryParams.push(...userFactories);
        paramIndex += userFactories.length;
        whereClauseParamCount += userFactories.length;
      }

      // Get total count (use only WHERE clause parameters, not LIMIT/OFFSET)
      const countQuery = `SELECT COUNT(*) as total FROM factories ${whereClause}`;
      // Count query should use the first whereClauseParamCount parameters
      const countParams = queryParams.slice(0, whereClauseParamCount);
      const countResult = await client.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      // Get factories
      const query = `
        SELECT 
          f.*,
          cc.name as cost_center_name
        FROM factories f
        LEFT JOIN cost_centers cc ON f.cost_center_id = cc.id
        ${whereClause}
        ORDER BY f.name
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const result = await client.query(query, queryParams);
      const factories: Factory[] = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description,
        address: row.address,
        phone: row.phone,
        email: row.email,
        manager_id: row.manager_id,
        cost_center_id: row.cost_center_id,
        cost_center_name: row.cost_center_name,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        factoriesCount: factories.length,
        total,
        page,
        totalPages
      });

      return {
        factories,
        total,
        page,
        limit,
        totalPages
      };

    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getFactoryById(factoryId: string, userId?: number): Promise<Factory | null> {
    const action = "FactoryMediator.getFactoryById";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { factoryId, userId });

      // Check if user has access to this factory
      if (userId) {
        const isAdmin = await isUserAdmin(userId);
        if (!isAdmin) {
          const hasAccess = await userHasFactoryAccess(userId, factoryId);
          if (!hasAccess) {
            MyLogger.info(action, { factoryId, userId, accessDenied: true });
            return null;
          }
        }
      }

      const query = `
        SELECT 
          f.*,
          cc.name as cost_center_name
        FROM factories f
        LEFT JOIN cost_centers cc ON f.cost_center_id = cc.id
        WHERE f.id = $1
      `;
      const result = await client.query(query, [factoryId]);

      if (result.rows.length === 0) {
        MyLogger.info(action, { factoryId, found: false });
        return null;
      }

      const row = result.rows[0];
      const factory: Factory = {
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description,
        address: row.address,
        phone: row.phone,
        email: row.email,
        manager_id: row.manager_id,
        cost_center_id: row.cost_center_id,
        cost_center_name: row.cost_center_name,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at
      };

      MyLogger.success(action, { factoryId, found: true });
      return factory;

    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async createFactory(factoryData: CreateFactoryRequest, userId?: number): Promise<Factory> {
    const action = "FactoryMediator.createFactory";
    const client = await pool.connect();

    try {
      // Only admins can create factories
      if (userId) {
        const isAdmin = await isUserAdmin(userId);
        if (!isAdmin) {
          throw new Error('Only administrators can create factories');
        }
      }

      MyLogger.info(action, { factoryData, userId });

      const query = `
        INSERT INTO factories (name, code, description, address, phone, email, manager_id, cost_center_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const values = [
        factoryData.name,
        factoryData.code,
        factoryData.description || null,
        factoryData.address || {},
        factoryData.phone || null,
        factoryData.email || null,
        factoryData.manager_id || null,
        factoryData.cost_center_id || null
      ];

      const result = await client.query(query, values);
      const row = result.rows[0];

      const factory: Factory = {
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description,
        address: row.address,
        phone: row.phone,
        email: row.email,
        manager_id: row.manager_id,
        cost_center_id: row.cost_center_id,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at
      };

      MyLogger.success(action, {
        factoryId: factory.id,
        factoryCode: factory.code,
        factoryName: factory.name
      });

      return factory;

    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async updateFactory(factoryId: string, updateData: UpdateFactoryRequest, userId?: number): Promise<Factory> {
    const action = "FactoryMediator.updateFactory";
    const client = await pool.connect();

    try {
      // Only admins can update factories
      if (userId) {
        const isAdmin = await isUserAdmin(userId);
        if (!isAdmin) {
          throw new Error('Only administrators can update factories');
        }
      }

      MyLogger.info(action, { factoryId, updateData, userId });

      // Check if factory exists
      const existingQuery = 'SELECT * FROM factories WHERE id = $1';
      const existingResult = await client.query(existingQuery, [factoryId]);

      if (existingResult.rows.length === 0) {
        throw new Error(`Factory with ID ${factoryId} not found`);
      }

      // Build update query
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updateData.name) {
        updateFields.push(`name = $${paramIndex}`);
        updateValues.push(updateData.name);
        paramIndex++;
      }

      if (updateData.code) {
        updateFields.push(`code = $${paramIndex}`);
        updateValues.push(updateData.code);
        paramIndex++;
      }

      if (updateData.description !== undefined) {
        updateFields.push(`description = $${paramIndex}`);
        updateValues.push(updateData.description);
        paramIndex++;
      }

      if (updateData.address !== undefined) {
        updateFields.push(`address = $${paramIndex}`);
        updateValues.push(updateData.address);
        paramIndex++;
      }

      if (updateData.phone !== undefined) {
        updateFields.push(`phone = $${paramIndex}`);
        updateValues.push(updateData.phone);
        paramIndex++;
      }

      if (updateData.email !== undefined) {
        updateFields.push(`email = $${paramIndex}`);
        updateValues.push(updateData.email);
        paramIndex++;
      }

      if (updateData.manager_id !== undefined) {
        updateFields.push(`manager_id = $${paramIndex}`);
        updateValues.push(updateData.manager_id);
        paramIndex++;
      }

      if (updateData.cost_center_id !== undefined) {
        updateFields.push(`cost_center_id = $${paramIndex}`);
        updateValues.push(updateData.cost_center_id);
        paramIndex++;
      }

      if (updateData.is_active !== undefined) {
        updateFields.push(`is_active = $${paramIndex}`);
        updateValues.push(updateData.is_active);
        paramIndex++;
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      updateValues.push(factoryId);

      const query = `
        UPDATE factories
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      const result = await client.query(query, updateValues);
      const row = result.rows[0];

      const factory: Factory = {
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description,
        address: row.address,
        phone: row.phone,
        email: row.email,
        manager_id: row.manager_id,
        cost_center_id: row.cost_center_id,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at
      };

      MyLogger.success(action, {
        factoryId,
        updatedFields: Object.keys(updateData)
      });

      return factory;

    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async deleteFactory(factoryId: string, userId?: number): Promise<void> {
    const action = "FactoryMediator.deleteFactory";
    const client = await pool.connect();

    try {
      // Only admins can delete factories
      if (userId) {
        const isAdmin = await isUserAdmin(userId);
        if (!isAdmin) {
          throw new Error('Only administrators can delete factories');
        }
      }

      MyLogger.info(action, { factoryId, userId });

      // Check if factory exists
      const existingQuery = 'SELECT * FROM factories WHERE id = $1';
      const existingResult = await client.query(existingQuery, [factoryId]);

      if (existingResult.rows.length === 0) {
        throw new Error(`Factory with ID ${factoryId} not found`);
      }

      // Check if factory has dependent records
      const dependentsQuery = `
        SELECT COUNT(*) as orders_count FROM factory_customer_orders WHERE factory_id = $1
      `;
      const dependentsResult = await client.query(dependentsQuery, [factoryId]);
      const ordersCount = parseInt(dependentsResult.rows[0].orders_count);

      if (ordersCount > 0) {
        throw new Error(`Cannot delete factory with ${ordersCount} existing orders`);
      }

      // Delete factory
      const deleteQuery = 'DELETE FROM factories WHERE id = $1';
      await client.query(deleteQuery, [factoryId]);

      MyLogger.success(action, { factoryId });

    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getUserFactories(userId?: number): Promise<any[]> {
    if (!userId) return [];

    const action = "FactoryMediator.getUserFactories";
    MyLogger.info(action, { userId });

    const factories = await getUserFactories(userId);

    MyLogger.success(action, { factoriesCount: factories.length });
    return factories;
  }

  static async getFactoryUsers(factoryId: string, currentUserId?: number): Promise<any[]> {
    const action = "FactoryMediator.getFactoryUsers";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { factoryId, currentUserId });

      // Check if current user has access to this factory
      if (currentUserId) {
        const isAdmin = await isUserAdmin(currentUserId);
        if (!isAdmin) {
          const hasAccess = await userHasFactoryAccess(currentUserId, factoryId);
          if (!hasAccess) {
            MyLogger.info(action, { factoryId, currentUserId, accessDenied: true });
            return [];
          }
        }
      }

      const query = `
        SELECT
          uf.id,
          uf.user_id,
          uf.factory_id,
          uf.role,
          uf.is_primary,
          uf.assigned_at,
          u.username,
          u.full_name,
          u.email
        FROM user_factories uf
        JOIN users u ON uf.user_id = u.id
        WHERE uf.factory_id = $1
        AND u.is_active = true
        ORDER BY uf.assigned_at DESC
      `;

      const result = await client.query(query, [factoryId]);
      const users = result.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        factory_id: row.factory_id,
        role: row.role,
        is_primary: row.is_primary,
        assigned_at: row.assigned_at,
        username: row.username,
        full_name: row.full_name,
        email: row.email,
      }));

      MyLogger.success(action, { usersCount: users.length });
      return users;

    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async assignUserToFactory(factoryId: string, userId: number, role: string, isPrimary: boolean = false, assignedBy?: number): Promise<void> {
    const action = "FactoryMediator.assignUserToFactory";
    const client = await pool.connect();

    try {
      // Only admins can assign users to factories
      if (assignedBy) {
        const isAdmin = await isUserAdmin(assignedBy);
        if (!isAdmin) {
          throw new Error('Only administrators can assign users to factories');
        }
      }

      MyLogger.info(action, { factoryId, userId, role, isPrimary, assignedBy });

      // Check if factory exists
      const factoryQuery = 'SELECT * FROM factories WHERE id = $1';
      const factoryResult = await client.query(factoryQuery, [factoryId]);

      if (factoryResult.rows.length === 0) {
        throw new Error(`Factory with ID ${factoryId} not found`);
      }

      // Check if user exists
      const userQuery = 'SELECT * FROM users WHERE id = $1';
      const userResult = await client.query(userQuery, [userId]);

      if (userResult.rows.length === 0) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // If setting as primary, unset other primary factories for this user
      if (isPrimary) {
        await client.query(
          'UPDATE user_factories SET is_primary = false WHERE user_id = $1',
          [userId]
        );
      }

      // Insert or update user-factory assignment
      const upsertQuery = `
        INSERT INTO user_factories (user_id, factory_id, role, is_primary, assigned_by)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, factory_id)
        DO UPDATE SET
          role = EXCLUDED.role,
          is_primary = EXCLUDED.is_primary,
          assigned_at = CURRENT_TIMESTAMP,
          assigned_by = EXCLUDED.assigned_by
      `;

      await client.query(upsertQuery, [userId, factoryId, role, isPrimary, assignedBy]);

      MyLogger.success(action, { factoryId, userId, role, isPrimary });

    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async removeUserFromFactory(factoryId: string, userId: number, removedBy?: number): Promise<void> {
    const action = "FactoryMediator.removeUserFromFactory";
    const client = await pool.connect();

    try {
      // Only admins can remove users from factories
      if (removedBy) {
        const isAdmin = await isUserAdmin(removedBy);
        if (!isAdmin) {
          throw new Error('Only administrators can remove users from factories');
        }
      }

      MyLogger.info(action, { factoryId, userId, removedBy });

      // Delete user-factory assignment
      const deleteQuery = 'DELETE FROM user_factories WHERE user_id = $1 AND factory_id = $2';
      const result = await client.query(deleteQuery, [userId, factoryId]);

      if (result.rowCount === 0) {
        throw new Error(`User ${userId} is not assigned to factory ${factoryId}`);
      }

      MyLogger.success(action, { factoryId, userId });

    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default FactoryMediator;
