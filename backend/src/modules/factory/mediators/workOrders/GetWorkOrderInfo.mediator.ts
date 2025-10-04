import pool from "@/database/connection";
import {
  WorkOrder,
  WorkOrderQueryParams,
  WorkOrderStats,
  ProductionLine,
  Operator
} from "@/types/factory";
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
  // You might need to adjust this based on your actual role structure
  return result.rows[0].role_id === 1;
}

export class GetWorkOrderInfoMediator {
  static async getWorkOrders(params: WorkOrderQueryParams = {}, userId?: number): Promise<{
    work_orders: WorkOrder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const action = "GetWorkOrderInfoMediator.getWorkOrders";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { params, userId });

      // Get user's accessible factories
      let userFactories: string[] = [];
      if (userId) {
        const isAdmin = await isUserAdmin(userId);
        if (!isAdmin) {
          const factories = await getUserFactories(userId);
          userFactories = factories.map(f => f.factory_id);
        }
      }

      const {
        page = 1,
        limit = 20,
        search,
        status,
        priority,
        production_line_id,
        assigned_operator_id,
        customer_order_id,
        created_date_from,
        created_date_to,
        deadline_from,
        deadline_to,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = params;

      // Build WHERE conditions
      const conditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Add factory filter for non-admin users
      if (userFactories.length > 0) {
        conditions.push(`wo.factory_id IN (${userFactories.map(() => `$${paramIndex++}`).join(',')})`);
        queryParams.push(...userFactories);
      }

      // Search condition
      if (search) {
        conditions.push(`(
          wo.work_order_number ILIKE $${paramIndex} OR
          wo.product_name ILIKE $${paramIndex} OR
          wo.product_sku ILIKE $${paramIndex}
        )`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      // Status filter
      if (status) {
        conditions.push(`wo.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      // Priority filter
      if (priority) {
        conditions.push(`wo.priority = $${paramIndex}`);
        queryParams.push(priority);
        paramIndex++;
      }

      // Production line filter
      if (production_line_id) {
        conditions.push(`wo.production_line_id = $${paramIndex}`);
        queryParams.push(production_line_id);
        paramIndex++;
      }

      // Customer order filter
      if (customer_order_id) {
        conditions.push(`wo.customer_order_id = $${paramIndex}`);
        queryParams.push(customer_order_id);
        paramIndex++;
      }

      // Date range filters
      if (created_date_from) {
        conditions.push(`wo.created_at >= $${paramIndex}`);
        queryParams.push(created_date_from);
        paramIndex++;
      }

      if (created_date_to) {
        conditions.push(`wo.created_at <= $${paramIndex}`);
        queryParams.push(created_date_to);
        paramIndex++;
      }

      if (deadline_from) {
        conditions.push(`wo.deadline >= $${paramIndex}`);
        queryParams.push(deadline_from);
        paramIndex++;
      }

      if (deadline_to) {
        conditions.push(`wo.deadline <= $${paramIndex}`);
        queryParams.push(deadline_to);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Calculate offset
      const offset = (page - 1) * limit;

      // Build ORDER BY clause
      const validSortFields = ['created_at', 'deadline', 'priority', 'status', 'progress'];
      const sortField = validSortFields.includes(sort_by) ? sort_by : 'created_at';
      const orderByClause = `ORDER BY wo.${sortField} ${sort_order.toUpperCase()}`;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM work_orders wo
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, queryParams.slice(0, queryParams.length - (conditions.length * 0))); // Adjust params for count query
      const total = parseInt(countResult.rows[0].total);

      // Get work orders with pagination
      const workOrdersQuery = `
        SELECT
          wo.id,
          wo.work_order_number,
          wo.customer_order_id,
          wo.product_id,
          wo.product_name,
          wo.product_sku,
          wo.quantity,
          wo.unit_of_measure,
          wo.deadline,
          wo.status,
          wo.priority,
          wo.progress,
          wo.estimated_hours,
          wo.actual_hours,
          wo.production_line_id,
          pl.name as production_line_name,
          wo.assigned_operators,
          wo.created_by,
          wo.created_at,
          wo.updated_by,
          wo.updated_at,
          wo.started_at,
          wo.completed_at,
          wo.notes,
          wo.specifications
        FROM work_orders wo
        LEFT JOIN production_lines pl ON wo.production_line_id = pl.id
        ${whereClause}
        ${orderByClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const workOrdersResult = await client.query(workOrdersQuery, queryParams);

      const work_orders: WorkOrder[] = workOrdersResult.rows.map(row => ({
        id: row.id,
        work_order_number: row.work_order_number,
        customer_order_id: row.customer_order_id,
        product_id: row.product_id,
        product_name: row.product_name,
        product_sku: row.product_sku,
        quantity: parseFloat(row.quantity),
        unit_of_measure: row.unit_of_measure,
        deadline: row.deadline,
        status: row.status,
        priority: row.priority,
        progress: parseFloat(row.progress),
        estimated_hours: parseFloat(row.estimated_hours),
        actual_hours: parseFloat(row.actual_hours),
        production_line_id: row.production_line_id,
        production_line_name: row.production_line_name,
        assigned_operator_ids: row.assigned_operators || [],
        created_by: row.created_by,
        created_at: row.created_at,
        updated_by: row.updated_by,
        updated_at: row.updated_at,
        started_at: row.started_at,
        completed_at: row.completed_at,
        notes: row.notes,
        specifications: row.specifications
      }));

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        ordersCount: work_orders.length,
        total,
        page,
        totalPages
      });

      return {
        work_orders,
        total,
        page,
        limit,
        totalPages
      };

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getWorkOrderById(workOrderId: string, userId?: number): Promise<WorkOrder | null> {
    const action = "GetWorkOrderInfoMediator.getWorkOrderById";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { workOrderId, userId });

      // Get user's accessible factories
      let userFactories: string[] = [];
      if (userId) {
        const isAdmin = await isUserAdmin(userId);
        if (!isAdmin) {
          const factories = await getUserFactories(userId);
          userFactories = factories.map(f => f.factory_id);
        }
      }

      // Build WHERE conditions
      const conditions: string[] = ['wo.id = $1'];
      const queryParams: any[] = [workOrderId];
      let paramIndex = 2;

      // Add factory filter for non-admin users
      if (userFactories.length > 0) {
        conditions.push(`wo.factory_id IN (${userFactories.map(() => `$${paramIndex++}`).join(',')})`);
        queryParams.push(...userFactories);
      }

      const whereClause = `WHERE ${conditions.join(' AND ')}`;

      const query = `
        SELECT
          wo.id,
          wo.work_order_number,
          wo.customer_order_id,
          wo.product_id,
          wo.product_name,
          wo.product_sku,
          wo.quantity,
          wo.unit_of_measure,
          wo.deadline,
          wo.status,
          wo.priority,
          wo.progress,
          wo.estimated_hours,
          wo.actual_hours,
          wo.production_line_id,
          pl.name as production_line_name,
          wo.assigned_operators,
          wo.created_by,
          wo.created_at,
          wo.updated_by,
          wo.updated_at,
          wo.started_at,
          wo.completed_at,
          wo.notes,
          wo.specifications
        FROM work_orders wo
        LEFT JOIN production_lines pl ON wo.production_line_id = pl.id
        ${whereClause}
      `;

      const result = await client.query(query, queryParams);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      const workOrder: WorkOrder = {
        id: row.id,
        work_order_number: row.work_order_number,
        customer_order_id: row.customer_order_id,
        product_id: row.product_id,
        product_name: row.product_name,
        product_sku: row.product_sku,
        quantity: parseFloat(row.quantity),
        unit_of_measure: row.unit_of_measure,
        deadline: row.deadline,
        status: row.status,
        priority: row.priority,
        progress: parseFloat(row.progress),
        estimated_hours: parseFloat(row.estimated_hours),
        actual_hours: parseFloat(row.actual_hours),
        production_line_id: row.production_line_id,
        production_line_name: row.production_line_name,
        assigned_operator_ids: row.assigned_operators || [],
        created_by: row.created_by,
        created_at: row.created_at,
        updated_by: row.updated_by,
        updated_at: row.updated_at,
        started_at: row.started_at,
        completed_at: row.completed_at,
        notes: row.notes,
        specifications: row.specifications
      };

      MyLogger.success(action, { workOrderId });
      return workOrder;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getWorkOrderStats(userId?: number): Promise<WorkOrderStats> {
    const action = "GetWorkOrderInfoMediator.getWorkOrderStats";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { userId });

      // Get user's accessible factories
      let userFactories: string[] = [];
      if (userId) {
        const isAdmin = await isUserAdmin(userId);
        if (!isAdmin) {
          const factories = await getUserFactories(userId);
          userFactories = factories.map(f => f.factory_id);
        }
      }

      // Build WHERE conditions
      const conditions: string[] = [];
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Add factory filter for non-admin users
      if (userFactories.length > 0) {
        conditions.push(`wo.factory_id IN (${userFactories.map(() => `$${paramIndex++}`).join(',')})`);
        queryParams.push(...userFactories);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const statsQuery = `
        SELECT
          COUNT(*) as total_work_orders,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_work_orders,
          COUNT(CASE WHEN status = 'planned' THEN 1 END) as planned_work_orders,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_work_orders,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_work_orders,
          COUNT(CASE WHEN status = 'on_hold' THEN 1 END) as on_hold_work_orders,
          COALESCE(SUM(estimated_hours), 0) as total_estimated_hours,
          COALESCE(SUM(actual_hours), 0) as total_actual_hours,
          CASE
            WHEN COUNT(*) > 0 THEN
              ROUND(
                (COUNT(CASE WHEN status = 'completed' THEN 1 END) * 100.0 / COUNT(*)), 2
              )
            ELSE 0
          END as average_completion_rate,
          CASE
            WHEN COUNT(CASE WHEN deadline < CURRENT_TIMESTAMP AND status = 'completed' THEN 1 END) > 0 THEN
              ROUND(
                (COUNT(CASE WHEN deadline >= CURRENT_TIMESTAMP AND status = 'completed' THEN 1 END) * 100.0 /
                 COUNT(CASE WHEN deadline < CURRENT_TIMESTAMP AND status = 'completed' THEN 1 END)), 2
              )
            ELSE 100
          END as on_time_delivery_rate
        FROM work_orders wo
        ${whereClause}
      `;

      const result = await client.query(statsQuery, queryParams);
      const stats = result.rows[0];

      const workOrderStats: WorkOrderStats = {
        total_work_orders: parseInt(stats.total_work_orders),
        draft_work_orders: parseInt(stats.draft_work_orders),
        planned_work_orders: parseInt(stats.planned_work_orders),
        in_progress_work_orders: parseInt(stats.in_progress_work_orders),
        completed_work_orders: parseInt(stats.completed_work_orders),
        on_hold_work_orders: parseInt(stats.on_hold_work_orders),
        total_estimated_hours: parseFloat(stats.total_estimated_hours),
        total_actual_hours: parseFloat(stats.total_actual_hours),
        average_completion_rate: parseFloat(stats.average_completion_rate),
        on_time_delivery_rate: parseFloat(stats.on_time_delivery_rate)
      };

      MyLogger.success(action, workOrderStats);
      return workOrderStats;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getProductionLines(): Promise<ProductionLine[]> {
    const action = "GetWorkOrderInfoMediator.getProductionLines";
    const client = await pool.connect();

    try {
      MyLogger.info(action);

      const query = `
        SELECT
          id,
          name,
          code,
          description,
          capacity,
          current_load,
          status,
          location,
          is_active,
          created_at,
          updated_at
        FROM production_lines
        WHERE is_active = true
        ORDER BY name
      `;

      const result = await client.query(query);

      const productionLines: ProductionLine[] = result.rows.map(row => ({
        id: row.id,
        name: row.name,
        code: row.code,
        description: row.description,
        capacity: parseFloat(row.capacity),
        current_load: parseFloat(row.current_load),
        status: row.status,
        location: row.location,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at
      }));

      MyLogger.success(action, { count: productionLines.length });
      return productionLines;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getOperators(): Promise<Operator[]> {
    const action = "GetWorkOrderInfoMediator.getOperators";
    const client = await pool.connect();

    try {
      MyLogger.info(action);

      const query = `
        SELECT
          o.id,
          o.user_id,
          o.employee_id,
          u.full_name as user_name,
          u.email as user_email,
          o.skill_level,
          o.department,
          o.current_work_order_id,
          o.availability_status,
          o.hourly_rate,
          o.is_active,
          o.created_at,
          o.updated_at
        FROM operators o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE o.is_active = true
        ORDER BY u.full_name
      `;

      const result = await client.query(query);

      const operators: Operator[] = result.rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        employee_id: row.employee_id,
        skill_level: row.skill_level,
        department: row.department,
        current_work_order_id: row.current_work_order_id,
        availability_status: row.availability_status,
        hourly_rate: row.hourly_rate ? parseFloat(row.hourly_rate) : undefined,
        is_active: row.is_active,
        created_at: row.created_at,
        updated_at: row.updated_at,
        user_name: row.user_name,
        user_email: row.user_email
      }));

      MyLogger.success(action, { count: operators.length });
      return operators;

    } catch (error) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}
