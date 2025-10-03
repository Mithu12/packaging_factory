import pool from "@/database/connection";
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

export class DeleteCustomerOrderMediator {
  static async deleteCustomerOrder(orderId: string, userId: string): Promise<boolean> {
    const action = "DeleteCustomerOrderMediator.deleteCustomerOrder";
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      MyLogger.info(action, { orderId, userId });

      // Get user's accessible factories for filtering
      const currentUserId = parseInt(userId);
      let userFactories: string[] = [];
      if (currentUserId) {
        const isAdmin = await isUserAdmin(currentUserId);
        if (!isAdmin) {
          const factories = await getUserFactories(currentUserId);
          userFactories = factories.map(f => f.factory_id);
        }
      }

      // Check if order exists and get current status, with factory access control
      let orderQuery = "SELECT id, order_number, status FROM factory_customer_orders WHERE id = $1";
      let queryParams: any[] = [orderId];

      if (currentUserId && userFactories.length > 0) {
        const factoryIds = userFactories.map((_, index) => `$${queryParams.length + index + 1}`);
        orderQuery += ` AND factory_id IN (${factoryIds.join(', ')})`;
        queryParams.push(...userFactories);
      }

      const orderResult = await client.query(orderQuery, queryParams);

      if (orderResult.rows.length === 0) {
        throw new Error(`Customer order with ID ${orderId} not found or access denied`);
      }

      const order = orderResult.rows[0];

      // Check if order can be deleted (only draft and pending orders)
      if (!['draft', 'pending'].includes(order.status)) {
        throw new Error(`Cannot delete order in ${order.status} status. Only draft and pending orders can be deleted.`);
      }

      // Delete line items first (foreign key constraint)
      const deleteLineItemsQuery = "DELETE FROM factory_customer_order_line_items WHERE order_id = $1";
      const lineItemsResult = await client.query(deleteLineItemsQuery, [orderId]);

      // Delete the order
      const deleteOrderQuery = "DELETE FROM factory_customer_orders WHERE id = $1";
      const orderDeleteResult = await client.query(deleteOrderQuery, [orderId]);

      if (orderDeleteResult.rowCount === 0) {
        throw new Error(`Failed to delete factory_customer order with ID ${orderId}`);
      }

      await client.query('COMMIT');

      MyLogger.success(action, { 
        orderId, 
        orderNumber: order.order_number,
        deletedLineItems: lineItemsResult.rowCount,
        status: order.status
      });

      return true;

    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async softDeleteCustomerOrder(orderId: string, userId: string): Promise<boolean> {
    const action = "DeleteCustomerOrderMediator.softDeleteCustomerOrder";
    const client = await pool.connect();

    try {
      MyLogger.info(action, { orderId, userId });

      // Check if order exists
      const orderQuery = "SELECT id, order_number, status FROM factory_customer_orders WHERE id = $1";
      const orderResult = await client.query(orderQuery, [orderId]);
      
      if (orderResult.rows.length === 0) {
        throw new Error(`Customer order with ID ${orderId} not found`);
      }

      const order = orderResult.rows[0];

      // Check if order can be soft deleted (not already cancelled or completed/shipped)
      if (['cancelled', 'completed', 'shipped'].includes(order.status)) {
        throw new Error(`Cannot cancel order in ${order.status} status`);
      }

      // Update status to cancelled
      const updateQuery = `
        UPDATE factory_customer_orders 
        SET 
          status = 'cancelled',
          updated_by = $1,
          updated_at = $2,
          notes = COALESCE(notes, '') || CASE WHEN notes IS NOT NULL THEN E'\n' ELSE '' END || 'Order cancelled by user'
        WHERE id = $3
        RETURNING *
      `;

      const updateResult = await client.query(updateQuery, [userId, new Date(), orderId]);

      if (updateResult.rowCount === 0) {
        throw new Error(`Failed to cancel factory_customer order with ID ${orderId}`);
      }

      MyLogger.success(action, { 
        orderId, 
        orderNumber: order.order_number,
        previousStatus: order.status,
        newStatus: 'cancelled'
      });

      return true;

    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  static async bulkDeleteCustomerOrders(
    orderIds: string[], 
    userId: string, 
    softDelete: boolean = true
  ): Promise<{ deleted: number; errors: string[] }> {
    const action = "DeleteCustomerOrderMediator.bulkDeleteCustomerOrders";
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      MyLogger.info(action, { 
        orderCount: orderIds.length, 
        userId, 
        softDelete 
      });

      let deleted = 0;
      const errors: string[] = [];

      for (const orderId of orderIds) {
        try {
          if (softDelete) {
            await this.softDeleteCustomerOrder(orderId, userId);
          } else {
            await this.deleteCustomerOrder(orderId, userId);
          }
          deleted++;
        } catch (error: any) {
          errors.push(`Order ${orderId}: ${error.message}`);
        }
      }

      await client.query('COMMIT');

      MyLogger.success(action, { 
        totalOrders: orderIds.length,
        deleted, 
        errors: errors.length,
        softDelete
      });

      return { deleted, errors };

    } catch (error: any) {
      await client.query('ROLLBACK');
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default DeleteCustomerOrderMediator;
