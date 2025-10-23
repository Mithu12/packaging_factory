import {
  SalesRepNotification,
  NotificationFilters,
  PaginationParams,
  PaginatedResponse,
} from '../../types';
import { MediatorInterface } from '@/types';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

class GetNotificationInfoMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error('Not Implemented');
  }

  // Get paginated list of notifications with filters
  async getNotifications(filters?: NotificationFilters, pagination?: PaginationParams): Promise<PaginatedResponse<SalesRepNotification>> {
    let action = 'Get Notifications';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { filters, pagination });

      const {
        page = 1,
        limit = 10,
        unread_only,
        type,
      } = filters || {};

      const offset = (page - 1) * limit;

      // Build WHERE conditions
      const conditions: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (unread_only) {
        conditions.push(`n.is_read = $${paramIndex}`);
        values.push(false);
        paramIndex++;
      }

      if (type) {
        conditions.push(`n.type = $${paramIndex}`);
        values.push(type);
        paramIndex++;
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM sales_rep_notifications n
        ${whereClause}
      `;

      const countResult = await client.query(countQuery, values);
      const total = parseInt(countResult.rows[0].total);

      // Get notifications
      const notificationsQuery = `
        SELECT
          n.id,
          n.title,
          n.message,
          n.type,
          n.is_read,
          n.related_entity_type,
          n.related_entity_id,
          n.sales_rep_id,
          n.created_at,
          n.updated_at
        FROM sales_rep_notifications n
        ${whereClause}
        ORDER BY n.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      values.push(limit, offset);
      const notificationsResult = await client.query(notificationsQuery, values);

      const totalPages = Math.ceil(total / limit);

      MyLogger.success(action, {
        total,
        page,
        limit,
        totalPages,
        returnedCount: notificationsResult.rows.length,
        filters: Object.keys(filters || {}).length
      });

      return {
        data: notificationsResult.rows,
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

  // Get single notification by ID
  async getNotification(id: number): Promise<SalesRepNotification | null> {
    let action = 'Get Notification By ID';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { notificationId: id });

      const notificationQuery = `
        SELECT
          n.id,
          n.title,
          n.message,
          n.type,
          n.is_read,
          n.related_entity_type,
          n.related_entity_id,
          n.sales_rep_id,
          n.created_at,
          n.updated_at
        FROM sales_rep_notifications n
        WHERE n.id = $1
      `;

      const result = await client.query(notificationQuery, [id]);

      if (result.rows.length === 0) {
        MyLogger.info(action, { notificationId: id, found: false });
        return null;
      }

      const notification = result.rows[0];

      MyLogger.success(action, {
        notificationId: id,
        title: notification.title,
        type: notification.type,
        isRead: notification.is_read,
        found: true
      });

      return notification;
    } catch (error: any) {
      MyLogger.error(action, error, { notificationId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get notification statistics
  async getNotificationStats(salesRepId?: number): Promise<any> {
    let action = 'Get Notification Statistics';
    const client = await pool.connect();

    try {
      MyLogger.info(action, { salesRepId });

      const salesRepCondition = salesRepId ? 'WHERE sales_rep_id = $1' : '';
      const params = salesRepId ? [salesRepId] : [];

      const statsQuery = `
        SELECT
          COUNT(*) as total_notifications,
          COUNT(*) FILTER (WHERE is_read = false) as unread_notifications,
          COUNT(*) FILTER (WHERE type = 'info') as info_notifications,
          COUNT(*) FILTER (WHERE type = 'warning') as warning_notifications,
          COUNT(*) FILTER (WHERE type = 'error') as error_notifications,
          COUNT(*) FILTER (WHERE type = 'success') as success_notifications
        FROM sales_rep_notifications
        ${salesRepCondition}
      `;

      const result = await client.query(statsQuery, params);
      const stats = result.rows[0];

      MyLogger.success(action, {
        salesRepId,
        totalNotifications: parseInt(stats.total_notifications),
        unreadNotifications: parseInt(stats.unread_notifications),
        infoNotifications: parseInt(stats.info_notifications),
        warningNotifications: parseInt(stats.warning_notifications),
        errorNotifications: parseInt(stats.error_notifications),
        successNotifications: parseInt(stats.success_notifications)
      });

      return {
        totalNotifications: parseInt(stats.total_notifications),
        unreadNotifications: parseInt(stats.unread_notifications),
        infoNotifications: parseInt(stats.info_notifications),
        warningNotifications: parseInt(stats.warning_notifications),
        errorNotifications: parseInt(stats.error_notifications),
        successNotifications: parseInt(stats.success_notifications)
      };
    } catch (error: any) {
      MyLogger.error(action, error, { salesRepId });
      throw error;
    } finally {
      client.release();
    }
  }
}

export default new GetNotificationInfoMediator();
