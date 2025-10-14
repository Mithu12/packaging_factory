import pool from "@/database/connection";
import { FactoryCustomerOrder, OrderLineItem, OrderQueryParams, OrderStats } from "@/types/factory";
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

export class GetCustomerOrderInfoMediator {
  static async getCustomerOrders(params: OrderQueryParams = {}, userId?: number): Promise<{
    orders: FactoryCustomerOrder[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const action = "GetCustomerOrderInfoMediator.getCustomerOrders";
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
MyLogger.info('userFactories',userFactories)
      const {
        page = 1,
        limit = 20,
        search,
        status,
        priority,
        factory_customer_id,
        date_from,
        date_to,
        sales_person,
        sort_by = 'order_date',
        sort_order = 'desc'
      } = params;

      const offset = (page - 1) * limit;

      // Build WHERE clause
      let whereClause = 'WHERE 1=1';
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Add factory filtering for non-admin users
      if (userId && userFactories.length > 0) {
        const factoryIds = userFactories.map((_, index) => `$${paramIndex + index}`);
        whereClause += ` AND co.factory_id IN (${factoryIds.join(', ')})`;
        queryParams.push(...userFactories);
        paramIndex += userFactories.length;
      }

      if (search) {
        whereClause += ` AND (
          co.order_number ILIKE $${paramIndex} OR 
          co.factory_customer_name ILIKE $${paramIndex} OR
          co.factory_customer_email ILIKE $${paramIndex}
        )`;
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (status && status !== '') {
        whereClause += ` AND co.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      if (priority) {
        whereClause += ` AND co.priority = $${paramIndex}`;
        queryParams.push(priority);
        paramIndex++;
      }

      if (factory_customer_id) {
        whereClause += ` AND co.factory_customer_id = $${paramIndex}`;
        queryParams.push(factory_customer_id);
        paramIndex++;
      }

      if (date_from) {
        whereClause += ` AND co.order_date >= $${paramIndex}`;
        queryParams.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        whereClause += ` AND co.order_date <= $${paramIndex}`;
        queryParams.push(date_to);
        paramIndex++;
      }

      if (sales_person) {
        whereClause += ` AND co.sales_person ILIKE $${paramIndex}`;
        queryParams.push(`%${sales_person}%`);
        paramIndex++;
      }

      // Build ORDER BY clause
      const validSortColumns = {
        'order_date': 'co.order_date',
        'required_date': 'co.required_date',
        'total_value': 'co.total_value',
        'factory_customer_name': 'co.factory_customer_name'
      };
      
      const sortColumn = validSortColumns[sort_by as keyof typeof validSortColumns] || 'co.order_date';
      const orderClause = `ORDER BY ${sortColumn} ${sort_order.toUpperCase()}`;

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM factory_customer_orders co
        ${whereClause}
      `;
      const countResult = await client.query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0].total);

      // Get orders
      const ordersQuery = `
        SELECT 
          co.*,
          f.id as factory_id,
          f.name as factory_name,
          f.cost_center_id as factory_cost_center_id,
          cc.name as factory_cost_center_name,
          COALESCE(
            json_agg(
              json_build_object(
                'id', li.id,
                'order_id', li.order_id,
                'product_id', li.product_id,
                'product_name', li.product_name,
                'product_sku', li.product_sku,
                'description', li.description,
                'quantity', li.quantity,
                'unit_price', li.unit_price,
                'discount_percentage', li.discount_percentage,
                'discount_amount', li.discount_amount,
                'line_total', li.line_total,
                'unit_of_measure', li.unit_of_measure,
                'specifications', li.specifications,
                'delivery_date', li.delivery_date,
                'is_optional', li.is_optional,
                'created_at', li.created_at
              ) ORDER BY li.created_at
            ) FILTER (WHERE li.id IS NOT NULL),
            '[]'::json
          ) as line_items
        FROM factory_customer_orders co
        LEFT JOIN factory_customer_order_line_items li ON co.id = li.order_id
        JOIN factories f ON co.factory_id = f.id
        LEFT JOIN cost_centers cc ON f.cost_center_id = cc.id
        ${whereClause}
        GROUP BY co.id, f.id, f.name, f.cost_center_id, cc.name
        ${orderClause}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      // MyLogger.info('ordersQuery',{ordersQuery,queryParams})
      const ordersResult = await client.query(ordersQuery, queryParams);
// MyLogger.info('asd================================', ordersResult.rows)
      const orders: FactoryCustomerOrder[] = ordersResult.rows.map(row => ({
        id: row.id,
        order_number: row.order_number,
        factory_id: row.factory_id,
        factory_name: row.factory_name,
        factory_cost_center_id: row.factory_cost_center_id,
        factory_cost_center_name: row.factory_cost_center_name,
        factory_customer_id: row.factory_customer_id,
        factory_customer_name: row.factory_customer_name,
        factory_customer_email: row.factory_customer_email,
        factory_customer_phone: row.factory_customer_phone,
        order_date: row.order_date,
        required_date: row.required_date,
        status: row.status,
        priority: row.priority,
        total_value: parseFloat(row.total_value),
        currency: row.currency,
        sales_person: row.sales_person,
        notes: row.notes,
        terms: row.terms,
        payment_terms: row.payment_terms,
        shipping_address: row.shipping_address,
        billing_address: row.billing_address,
        line_items: row.line_items.map((item: any) => ({
          ...item,
          unit_price: parseFloat(item.unit_price),
          discount_amount: item.discount_amount ? parseFloat(item.discount_amount) : undefined,
          line_total: parseFloat(item.line_total),
          delivery_date: item.delivery_date ? item.delivery_date : undefined,
          created_at: item.created_at
        })),
        attachments: row.attachments,
        created_by: row.created_by,
        created_at: row.created_at,
        updated_by: row.updated_by,
        updated_at: row.updated_at,
        approved_by: row.approved_by,
        approved_at: row.approved_at ,
      }));

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        ordersCount: orders.length,
        total,
        page,
        totalPages
      });

      return {
        orders,
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

  static async getCustomerOrderById(orderId: string, userId?: number): Promise<FactoryCustomerOrder | null> {
    const action = "GetCustomerOrderInfoMediator.getCustomerOrderById";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { orderId, userId });

      // Get user's accessible factories for filtering
      let factoryFilter = '';
      const queryParams: any[] = [orderId];
      if (userId) {
        const isAdmin = await isUserAdmin(userId);
        if (!isAdmin) {
          const factories = await getUserFactories(userId);
          const userFactories = factories.map(f => f.factory_id);
          if (userFactories.length > 0) {
            const factoryIds = userFactories.map((_, index) => `$${queryParams.length + index + 1}`);
            factoryFilter = ` AND co.factory_id IN (${factoryIds.join(', ')})`;
            queryParams.push(...userFactories);
          }
        }
      }

      const query = `
        SELECT
          co.*,
          f.id as factory_id,
          f.name as factory_name,
          f.cost_center_id as factory_cost_center_id,
          cc.name as factory_cost_center_name,
          COALESCE(
            json_agg(
              json_build_object(
                'id', li.id,
                'order_id', li.order_id,
                'product_id', li.product_id,
                'product_name', li.product_name,
                'product_sku', li.product_sku,
                'description', li.description,
                'quantity', li.quantity,
                'unit_price', li.unit_price,
                'discount_percentage', li.discount_percentage,
                'discount_amount', li.discount_amount,
                'line_total', li.line_total,
                'unit_of_measure', li.unit_of_measure,
                'specifications', li.specifications,
                'delivery_date', li.delivery_date,
                'is_optional', li.is_optional,
                'created_at', li.created_at
              ) ORDER BY li.created_at
            ) FILTER (WHERE li.id IS NOT NULL),
            '[]'::json
          ) as line_items
        FROM factory_customer_orders co
        LEFT JOIN factory_customer_order_line_items li ON co.id = li.order_id
        JOIN factories f ON co.factory_id = f.id
        LEFT JOIN cost_centers cc ON f.cost_center_id = cc.id
        WHERE co.id = $1${factoryFilter}
        GROUP BY co.id, f.id, f.name, f.cost_center_id, cc.name
      `;

      const result = await client.query(query, queryParams);

      if (result.rows.length === 0) {
        MyLogger.info(action, { orderId, found: false });
        return null;
      }

      const row = result.rows[0];
      const order: FactoryCustomerOrder = {
        id: row.id,
        order_number: row.order_number,
        factory_customer_id: row.factory_customer_id,
        factory_customer_name: row.factory_customer_name,
        factory_customer_email: row.factory_customer_email,
        factory_customer_phone: row.factory_customer_phone,
        order_date: row.order_date,
        required_date: row.required_date,
        status: row.status,
        priority: row.priority,
        total_value: parseFloat(row.total_value),
        currency: row.currency,
        sales_person: row.sales_person,
        notes: row.notes,
        terms: row.terms,
        payment_terms: row.payment_terms,
        shipping_address: (row.shipping_address),
        billing_address: (row.billing_address),
        line_items: row.line_items.map((item: any) => ({
          ...item,
          unit_price: parseFloat(item.unit_price),
          discount_amount: item.discount_amount ? parseFloat(item.discount_amount) : undefined,
          line_total: parseFloat(item.line_total),
          delivery_date: item.delivery_date ? item.delivery_date : undefined,
          created_at: item.created_at
        })),
        attachments: (row.attachments),
        created_by: row.created_by,
        created_at: row.created_at,
        updated_by: row.updated_by,
        updated_at: row.updated_at ? row.updated_at : undefined,
        approved_by: row.approved_by,
        approved_at: row.approved_at ? row.approved_at : undefined,
        factory_id: row.factory_id,
        factory_name: row.factory_name,
        factory_cost_center_id: row.factory_cost_center_id,
        factory_cost_center_name: row.factory_cost_center_name,
      };

      MyLogger.success(action, { orderId, found: true });
      return order;

    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async getOrderStats(userId?: number): Promise<OrderStats> {
    const action = "GetCustomerOrderInfoMediator.getOrderStats";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { userId });

      // Get user's accessible factories for filtering
      let factoryFilter = '';
      const queryParams: any[] = [];
      if (userId) {
        const isAdmin = await isUserAdmin(userId);
        if (!isAdmin) {
          const factories = await getUserFactories(userId);
          const userFactories = factories.map(f => f.factory_id);
          if (userFactories.length > 0) {
            const factoryIds = userFactories.map((_, index) => `$${queryParams.length + index + 1}`);
            factoryFilter = ` AND factory_id IN (${factoryIds.join(', ')})`;
            queryParams.push(...userFactories);
          }
        }
      }

      const query = `
        SELECT
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_orders,
          COUNT(*) FILTER (WHERE status = 'quoted') as quoted_orders,
          COUNT(*) FILTER (WHERE status = 'approved') as approved_orders,
          COUNT(*) FILTER (WHERE status = 'in_production') as in_production_orders,
          COUNT(*) FILTER (WHERE status = 'completed') as completed_orders,
          COALESCE(SUM(total_value), 0) as total_value,
          COALESCE(AVG(total_value), 0) as average_order_value,
          COALESCE(
            COUNT(*) FILTER (WHERE status = 'completed' AND required_date >= order_date) * 100.0 /
            NULLIF(COUNT(*) FILTER (WHERE status = 'completed'), 0),
            0
          ) as on_time_delivery
        FROM factory_customer_orders
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'${factoryFilter}
      `;

      const result = await client.query(query, queryParams);
      const row = result.rows[0];

      const stats: OrderStats = {
        total_orders: parseInt(row.total_orders),
        pending_orders: parseInt(row.pending_orders),
        quoted_orders: parseInt(row.quoted_orders),
        approved_orders: parseInt(row.approved_orders),
        in_production_orders: parseInt(row.in_production_orders),
        completed_orders: parseInt(row.completed_orders),
        total_value: parseFloat(row.total_value),
        average_order_value: parseFloat(row.average_order_value),
        on_time_delivery: parseFloat(row.on_time_delivery)
      };

      MyLogger.success(action, stats);
      return stats;

    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default GetCustomerOrderInfoMediator;
