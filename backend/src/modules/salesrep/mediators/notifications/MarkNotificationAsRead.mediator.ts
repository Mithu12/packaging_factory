import {
  SalesRepNotification,
} from '../../types';
import { MediatorInterface } from '@/types';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

class MarkNotificationAsReadMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error('Not Implemented');
  }

  // Mark single notification as read
  async markNotificationAsRead(id: number): Promise<SalesRepNotification | null> {
    let action = 'Mark Notification As Read';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { notificationId: id });

      // Check if notification exists
      const existingNotification = await this.getNotification(id);
      if (!existingNotification) {
        throw new Error('Notification not found');
      }

      // Mark as read
      const updateQuery = `
        UPDATE sales_rep_notifications SET
          is_read = true,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING
          id,
          title,
          message,
          type,
          is_read,
          related_entity_type,
          related_entity_id,
          sales_rep_id,
          created_at,
          updated_at
      `;

      const result = await client.query(updateQuery, [id]);
      const notification = result.rows[0];

      await client.query('COMMIT');
      MyLogger.success(action, {
        notificationId: id,
        title: notification.title,
        wasRead: existingNotification.is_read,
        nowRead: true,
        updated: true
      });

      return notification;
    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { notificationId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Mark all notifications as read for a sales rep
  async markAllNotificationsAsRead(salesRepId?: number): Promise<void> {
    let action = 'Mark All Notifications As Read';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { salesRepId });

      const updateQuery = `
        UPDATE sales_rep_notifications SET
          is_read = true,
          updated_at = CURRENT_TIMESTAMP
        WHERE is_read = false
        ${salesRepId ? 'AND sales_rep_id = $1' : ''}
        RETURNING id
      `;

      const result = await client.query(updateQuery, salesRepId ? [salesRepId] : []);
      const updatedCount = result.rows.length;

      await client.query('COMMIT');
      MyLogger.success(action, {
        salesRepId,
        updatedCount,
        markedAsRead: true
      });

    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { salesRepId });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get notification by ID (helper method)
  private async getNotification(id: number): Promise<SalesRepNotification | null> {
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

    const result = await pool.query(notificationQuery, [id]);
    return result.rows.length > 0 ? result.rows[0] : null;
  }
}

export default new MarkNotificationAsReadMediator();
