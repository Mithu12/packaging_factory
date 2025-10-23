import {
  SalesRepDelivery,
  DeliveryFilters,
  PaginationParams,
  PaginatedResponse,
} from '../../types';
import { MediatorInterface } from '@/types';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

class GetDeliveryInfoMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error('Not Implemented');
  }

  // Get paginated list of deliveries with filters
  async getDeliveries(filters?: DeliveryFilters, pagination?: PaginationParams): Promise<PaginatedResponse<SalesRepDelivery>> {
    let action = 'Get Deliveries';
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
        courier_service,
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
        conditions.push(`d.status = $${paramIndex}`);
        values.push(status);
        paramIndex++;
      }

      if (date_from) {
        conditions.push(`d.delivery_date >= $${paramIndex}`);
        values.push(date_from);
        paramIndex++;
      }

      if (date_to) {
        conditions.push(`d.delivery_date <= $${paramIndex}`);
        values.push(date_to);
        paramIndex++;
      }

      if (courier_service) {
        conditions.push(`d.courier_service = $${paramIndex}`);
        values.push(courier_service);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM sales_rep_deliveries d
        JOIN sales_rep_orders o ON d.order_id = o.id
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get deliveries with related data
      const deliveriesQuery = `
        SELECT
          d.id,
          d.order_id,
          d.delivery_number,
          d.delivery_date,
          d.status,
          d.tracking_number,
          d.courier_service,
          d.delivery_address,
          d.contact_person,
          d.contact_phone,
          d.notes,
          d.sales_rep_id,
          d.created_at,
          d.updated_at,
          o.order_number,
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone
        FROM sales_rep_deliveries d
        JOIN sales_rep_orders o ON d.order_id = o.id
        LEFT JOIN sales_rep_customers c ON o.customer_id = c.id
        ${whereClause}
        ORDER BY d.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);
      const deliveriesResult = await client.query(deliveriesQuery, values);

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        total,
        page,
        limit,
        totalPages,
        returnedCount: deliveriesResult.rows.length,
        filters: Object.keys(filters || {}).length
      });

      return {
        data: deliveriesResult.rows,
        page,
        limit,
        total,
        totalPages
      };
    } catch (error: any) {
      MyLogger.error(action, error, { filters, pagination });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get single delivery by ID
  async getDelivery(id: number): Promise<SalesRepDelivery | null> {
    let action = 'Get Delivery By ID';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { deliveryId: id });

      const deliveryQuery = `
        SELECT
          d.id,
          d.order_id,
          d.delivery_number,
          d.delivery_date,
          d.status,
          d.tracking_number,
          d.courier_service,
          d.delivery_address,
          d.contact_person,
          d.contact_phone,
          d.notes,
          d.sales_rep_id,
          d.created_at,
          d.updated_at,
          o.order_number,
          o.customer_id,
          c.name as customer_name,
          c.email as customer_email,
          c.phone as customer_phone,
          c.address as customer_address,
          c.city as customer_city,
          c.state as customer_state,
          c.postal_code as customer_postal_code
        FROM sales_rep_deliveries d
        JOIN sales_rep_orders o ON d.order_id = o.id
        LEFT JOIN sales_rep_customers c ON o.customer_id = c.id
        WHERE d.id = $1
      `;

      const result = await client.query(deliveryQuery, [id]);

      if (result.rows.length === 0) {
        MyLogger.info(action, { deliveryId: id, found: false });
        return null;
      }

      const deliveryRow = result.rows[0];

      const delivery: SalesRepDelivery = {
        ...deliveryRow,
        order: {
          id: deliveryRow.order_id,
          order_number: deliveryRow.order_number,
          customer_id: deliveryRow.customer_id,
          customer: deliveryRow.customer_id ? {
            id: deliveryRow.customer_id,
            name: deliveryRow.customer_name,
            email: deliveryRow.customer_email,
            phone: deliveryRow.customer_phone,
            address: deliveryRow.customer_address,
            city: deliveryRow.customer_city,
            state: deliveryRow.customer_state,
            postal_code: deliveryRow.customer_postal_code,
            credit_limit: 0,
            current_balance: 0,
            sales_rep_id: null,
            created_at: new Date(),
            updated_at: new Date()
          } : undefined
        }
      };

      MyLogger.success(action, {
        deliveryId: id,
        deliveryNumber: delivery.delivery_number,
        status: delivery.status,
        trackingNumber: delivery.tracking_number,
        found: true
      });

      return delivery;
    } catch (error: any) {
      MyLogger.error(action, error, { deliveryId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get delivery statistics
  async getDeliveryStats(): Promise<any> {
    let action = 'Get Delivery Statistics';
    const client = await pool.connect();

    try {
      MyLogger.info(action);

      const statsQuery = `
        SELECT
          COUNT(*) as total_deliveries,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_deliveries,
          COUNT(*) FILTER (WHERE status = 'in_transit') as in_transit_deliveries,
          COUNT(*) FILTER (WHERE status = 'delivered') as delivered_deliveries,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled_deliveries,
          COUNT(*) FILTER (WHERE delivery_date < CURRENT_DATE AND status IN ('pending', 'in_transit')) as overdue_deliveries
        FROM sales_rep_deliveries
      `;

      const result = await client.query(statsQuery);
      const stats = result.rows[0];

      MyLogger.success(action, {
        totalDeliveries: parseInt(stats.total_deliveries),
        pendingDeliveries: parseInt(stats.pending_deliveries),
        inTransitDeliveries: parseInt(stats.in_transit_deliveries),
        deliveredDeliveries: parseInt(stats.delivered_deliveries),
        cancelledDeliveries: parseInt(stats.cancelled_deliveries),
        overdueDeliveries: parseInt(stats.overdue_deliveries)
      });

      return {
        totalDeliveries: parseInt(stats.total_deliveries),
        pendingDeliveries: parseInt(stats.pending_deliveries),
        inTransitDeliveries: parseInt(stats.in_transit_deliveries),
        deliveredDeliveries: parseInt(stats.delivered_deliveries),
        cancelledDeliveries: parseInt(stats.cancelled_deliveries),
        overdueDeliveries: parseInt(stats.overdue_deliveries)
      };
    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new GetDeliveryInfoMediator();
