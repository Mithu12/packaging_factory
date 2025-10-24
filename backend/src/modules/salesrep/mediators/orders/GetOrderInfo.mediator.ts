import {
  SalesRepOrder,
  OrderFilters,
  PaginationParams,
  PaginatedResponse,
  SalesRepOrderItem,
} from "../../types";
import { MediatorInterface } from "@/types";
import pool from "@/database/connection";
import { MyLogger } from "@/utils/new-logger";

class GetOrderInfoMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error("Not Implemented");
  }

  // Get paginated list of orders with filters
  async getOrders(
    filters?: OrderFilters,
    pagination?: PaginationParams
  ): Promise<PaginatedResponse<SalesRepOrder>> {
    let action = "Get Orders";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { filters, pagination });

      const {
        page = 1,
        limit = 10,
        customer_id,
        status,
        date_from,
        date_to,
        min_amount,
        max_amount,
      } = filters || {};

      const offset = (page - 1) * limit;

      // Build WHERE conditions
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (customer_id) {
        conditions.push(`o.customer_id = $${paramIndex}`);
        values.push(customer_id);
        paramIndex++;
      }

      if (status) {
        conditions.push(`o.status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }

      if (date_from) {
        conditions.push(`o.order_date >= $${paramIndex}`);
        values.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        conditions.push(`o.order_date <= $${paramIndex}`);
        values.push(date_to);
        paramIndex++;
      }

      if (min_amount !== undefined) {
        conditions.push(`o.final_amount >= $${paramIndex}`);
        values.push(min_amount);
        paramIndex++;
      }

      if (max_amount !== undefined) {
        conditions.push(`o.final_amount <= $${paramIndex}`);
        values.push(max_amount);
        paramIndex++;
      }

      const whereClause =
        conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM sales_rep_orders o
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get orders with related data - check both sales_rep_customers and shared customers
      const ordersQuery = `
        SELECT
          o.id,
          o.customer_id,
          o.order_number,
          o.order_date,
          o.status,
          o.total_amount,
          o.discount_amount,
          o.tax_amount,
          o.final_amount,
          o.sales_rep_id,
          o.notes,
          o.created_at,
          o.updated_at,
          COALESCE(src.name, sc.name) as customer_name,
          COALESCE(src.email, sc.email) as customer_email,
          COALESCE(src.phone, sc.phone) as customer_phone
        FROM sales_rep_orders o
        LEFT JOIN sales_rep_customers src ON o.customer_id = src.id
        LEFT JOIN factory_customers sc ON o.customer_id = sc.id
        ${whereClause}
        ORDER BY o.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);
      const ordersResult = await client.query(ordersQuery, values);

      // Get order items for each order
      const orders: SalesRepOrder[] = [];
      for (const orderRow of ordersResult.rows) {
        const items = await this.getOrderItems(orderRow.id);

        orders.push({
          ...orderRow,
          customer: orderRow.customer_id
            ? {
                id: orderRow.customer_id,
                name: orderRow.customer_name,
                email: orderRow.customer_email,
                phone: orderRow.customer_phone,
                address: null,
                city: null,
                state: null,
                postal_code: null,
                credit_limit: 0,
                current_balance: 0,
                sales_rep_id: null,
                created_at: new Date(),
                updated_at: new Date(),
              }
            : undefined,
          items,
        });
      }

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        total,
        page,
        limit,
        totalPages,
        returnedCount: orders.length,
        filters: Object.keys(filters || {}).length,
      });

      return {
        data: orders,
        page,
        limit,
        total,
        totalPages,
      };
    } catch (error: any) {
      MyLogger.error(action, error, { filters, pagination });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get single order by ID
  async getOrder(id: number): Promise<SalesRepOrder | null> {
    let action = "Get Order By ID";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { orderId: id });

      const orderQuery = `
        SELECT
          o.id,
          o.customer_id,
          o.order_number,
          o.order_date,
          o.status,
          o.total_amount,
          o.discount_amount,
          o.tax_amount,
          o.final_amount,
          o.sales_rep_id,
          o.notes,
          o.created_at,
          o.updated_at,
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone,
          c.address as customer_address,
          c.city as customer_city,
          c.state as customer_state,
          c.postal_code as customer_postal_code
        FROM sales_rep_orders o
        LEFT JOIN sales_rep_customers c ON o.customer_id = c.id
        WHERE o.id = $1
      `;

      const result = await client.query(orderQuery, [id]);

      if (result.rows.length === 0) {
        MyLogger.info(action, { orderId: id, found: false });
        return null;
      }

      const orderRow = result.rows[0];
      const items = await this.getOrderItems(id);

      const order: SalesRepOrder = {
        ...orderRow,
        customer: orderRow.customer_id
          ? {
              id: orderRow.customer_id,
              name: orderRow.customer_name,
              email: orderRow.customer_email,
              phone: orderRow.customer_phone,
              address: orderRow.customer_address,
              city: orderRow.customer_city,
              state: orderRow.customer_state,
              postal_code: orderRow.customer_postal_code,
              credit_limit: 0,
              current_balance: 0,
              sales_rep_id: null,
              created_at: new Date(),
              updated_at: new Date(),
            }
          : undefined,
        items,
      };

      MyLogger.success(action, {
        orderId: id,
        orderNumber: order.order_number,
        status: order.status,
        itemsCount: items?.length || 0,
        found: true,
      });

      return order;
    } catch (error: any) {
      MyLogger.error(action, error, { orderId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get order statistics
  async getOrderStats(): Promise<any> {
    let action = "Get Order Statistics";
    const client = await pool.connect();

    try {
      MyLogger.info(action);

      const statsQuery = `
        SELECT
          COUNT(*) as total_orders,
          COUNT(*) FILTER (WHERE status = 'draft') as draft_orders,
          COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_orders,
          COUNT(*) FILTER (WHERE status = 'processing') as processing_orders,
          COUNT(*) FILTER (WHERE status = 'shipped') as shipped_orders,
          COUNT(*) FILTER (WHERE status = 'delivered') as delivered_orders,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_orders,
          COALESCE(SUM(final_amount) FILTER (WHERE status != 'cancelled'), 0) as total_order_value,
          COALESCE(AVG(final_amount) FILTER (WHERE status != 'cancelled'), 0) as average_order_value
        FROM sales_rep_orders
      `;

      const result = await client.query(statsQuery);
      const stats = result.rows[0];

      MyLogger.success(action, {
        totalOrders: parseInt(stats.total_orders),
        draftOrders: parseInt(stats.draft_orders),
        confirmedOrders: parseInt(stats.confirmed_orders),
        processingOrders: parseInt(stats.processing_orders),
        shippedOrders: parseInt(stats.shipped_orders),
        deliveredOrders: parseInt(stats.delivered_orders),
        cancelledOrders: parseInt(stats.cancelled_orders),
        totalOrderValue: parseFloat(stats.total_order_value),
        averageOrderValue: parseFloat(stats.average_order_value),
      });

      return {
        totalOrders: parseInt(stats.total_orders),
        draftOrders: parseInt(stats.draft_orders),
        confirmedOrders: parseInt(stats.confirmed_orders),
        processingOrders: parseInt(stats.processing_orders),
        shippedOrders: parseInt(stats.shipped_orders),
        deliveredOrders: parseInt(stats.delivered_orders),
        cancelledOrders: parseInt(stats.cancelled_orders),
        totalOrderValue: parseFloat(stats.total_order_value),
        averageOrderValue: parseFloat(stats.average_order_value),
      };
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Get order items for a specific order (helper method)
  private async getOrderItems(orderId: number): Promise<SalesRepOrderItem[]> {
    const itemsQuery = `
      SELECT
        oi.id,
        oi.order_id,
        oi.product_id,
        oi.product_name,
        oi.quantity,
        oi.unit_price,
        oi.discount,
        oi.total_price,
        oi.created_at,
        oi.updated_at
      FROM sales_rep_order_items oi
      WHERE oi.order_id = $1
      ORDER BY oi.id
    `;

    const itemsResult = await pool.query(itemsQuery, [orderId]);
    return itemsResult.rows;
  }
}

export default new GetOrderInfoMediator();
