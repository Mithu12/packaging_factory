import pool from "@/database/connection";
import { CreateWorkflowHistoryRequest, OrderWorkflowHistory } from "@/types/factory";
import { MyLogger } from "@/utils/new-logger";

export class OrderWorkflowHistoryMediator {
  /**
   * Log a workflow status change for audit trail
   */
  static async logWorkflowChange(
    workflowData: CreateWorkflowHistoryRequest
  ): Promise<OrderWorkflowHistory> {
    const action = "OrderWorkflowHistoryMediator.logWorkflowChange";
    const client = await pool.connect();

    try {
      MyLogger.info(action, {
        orderId: workflowData.order_id,
        fromStatus: workflowData.from_status,
        toStatus: workflowData.to_status,
        changedBy: workflowData.changed_by
      });

      const insertQuery = `
        INSERT INTO factory_order_workflow_history (
          order_id, from_status, to_status, changed_by, changed_at, notes, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;

      const values = [
        workflowData.order_id,
        workflowData.from_status,
        workflowData.to_status,
        workflowData.changed_by,
        new Date(),
        workflowData.notes || null,
        workflowData.metadata ? JSON.stringify(workflowData.metadata) : null
      ];

      const result = await client.query(insertQuery, values);
      const historyRecord = result.rows[0];

      // Get user name for the response
      const userQuery = "SELECT username FROM users WHERE id = $1";
      const userResult = await client.query(userQuery, [workflowData.changed_by]);
      const userName = userResult.rows[0]?.username || 'Unknown User';

      const workflowHistory: OrderWorkflowHistory = {
        id: historyRecord.id,
        order_id: historyRecord.order_id,
        from_status: historyRecord.from_status,
        to_status: historyRecord.to_status,
        changed_by: historyRecord.changed_by,
        changed_by_name: userName,
        changed_at: historyRecord.changed_at.toISOString(),
        notes: historyRecord.notes,
        metadata: historyRecord.metadata ? JSON.parse(historyRecord.metadata) : null
      };

      MyLogger.success(action, {
        orderId: workflowData.order_id,
        historyId: historyRecord.id
      });

      return workflowHistory;

    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get workflow history for a specific order
   */
  static async getOrderWorkflowHistory(orderId: number): Promise<OrderWorkflowHistory[]> {
    const action = "OrderWorkflowHistoryMediator.getOrderWorkflowHistory";

    try {
      MyLogger.info(action, { orderId });

      const query = `
        SELECT 
          h.*,
          u.username as changed_by_name
        FROM factory_order_workflow_history h
        LEFT JOIN users u ON h.changed_by = u.id
        WHERE h.order_id = $1
        ORDER BY h.changed_at DESC
      `;

      const result = await pool.query(query, [orderId]);

      const workflowHistory: OrderWorkflowHistory[] = result.rows.map(row => ({
        id: row.id,
        order_id: row.order_id,
        from_status: row.from_status,
        to_status: row.to_status,
        changed_by: row.changed_by,
        changed_by_name: row.changed_by_name || 'Unknown User',
        changed_at: row.changed_at.toISOString(),
        notes: row.notes,
        metadata: row.metadata ? JSON.parse(row.metadata) : null
      }));

      MyLogger.success(action, {
        orderId,
        historyCount: workflowHistory.length
      });

      return workflowHistory;

    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }

  /**
   * Get workflow statistics for reporting
   */
  static async getWorkflowStats(
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    total_changes: number;
    approvals: number;
    rejections: number;
    routings: number;
    average_approval_time_hours: number;
  }> {
    const action = "OrderWorkflowHistoryMediator.getWorkflowStats";

    try {
      MyLogger.info(action, { dateFrom, dateTo });

      let whereClause = "";
      const queryParams: any[] = [];

      if (dateFrom && dateTo) {
        whereClause = "WHERE h.changed_at BETWEEN $1 AND $2";
        queryParams.push(new Date(dateFrom), new Date(dateTo));
      } else if (dateFrom) {
        whereClause = "WHERE h.changed_at >= $1";
        queryParams.push(new Date(dateFrom));
      } else if (dateTo) {
        whereClause = "WHERE h.changed_at <= $1";
        queryParams.push(new Date(dateTo));
      }

      const statsQuery = `
        SELECT 
          COUNT(*) as total_changes,
          COUNT(CASE WHEN h.to_status = 'approved' THEN 1 END) as approvals,
          COUNT(CASE WHEN h.to_status = 'rejected' THEN 1 END) as rejections,
          COUNT(CASE WHEN h.to_status = 'routed' THEN 1 END) as routings,
          AVG(
            CASE 
              WHEN h.to_status = 'approved' AND h.from_status = 'pending_approval' 
              THEN EXTRACT(EPOCH FROM (h.changed_at - o.submitted_at)) / 3600 
            END
          ) as average_approval_time_hours
        FROM factory_order_workflow_history h
        LEFT JOIN factory_customer_orders o ON h.order_id = o.id
        ${whereClause}
      `;

      const result = await pool.query(statsQuery, queryParams);
      const stats = result.rows[0];

      const workflowStats = {
        total_changes: parseInt(stats.total_changes) || 0,
        approvals: parseInt(stats.approvals) || 0,
        rejections: parseInt(stats.rejections) || 0,
        routings: parseInt(stats.routings) || 0,
        average_approval_time_hours: parseFloat(stats.average_approval_time_hours) || 0
      };

      MyLogger.success(action, workflowStats);

      return workflowStats;

    } catch (error: any) {
      MyLogger.error(action, error);
      throw error;
    }
  }
}

export default OrderWorkflowHistoryMediator;