import { MediatorInterface } from '@/types';
import pool from '@/database/connection';
import { MyLogger } from '@/utils/new-logger';

class DeleteNotificationMediator implements MediatorInterface {
  async process(data: any): Promise<any> {
    throw new Error('Not Implemented');
  }

  // Delete notification
  async deleteNotification(id: number): Promise<void> {
    let action = 'Delete Notification';
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      MyLogger.info(action, { notificationId: id });

      // Check if notification exists
      const existingNotification = await this.getNotification(id);
      if (!existingNotification) {
        throw new Error('Notification not found');
      }

      // Delete notification
      const deleteQuery = 'DELETE FROM sales_rep_notifications WHERE id = $1';
      await client.query(deleteQuery, [id]);

      await client.query('COMMIT');
      MyLogger.success(action, {
        notificationId: id,
        title: existingNotification.title,
        type: existingNotification.type,
        deleted: true
      });

    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error, { notificationId: id });
      throw error;
    } finally {
      client.release();
    }
  }

  // Get notification by ID (helper method)
  private async getNotification(id: number): Promise<any | null> {
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

export default new DeleteNotificationMediator();
