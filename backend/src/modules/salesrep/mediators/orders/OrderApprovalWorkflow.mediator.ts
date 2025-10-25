import pool from "@/database/connection";
import {
  SalesRepOrder,
  SubmitDraftOrderRequest,
  AdminApprovalRequest,
  FactoryManagerAcceptanceRequest,
} from "../../types";
import { MyLogger } from "@/utils/new-logger";

// Helper function to get user's accessible factories
async function getUserFactories(userId: number): Promise<
  {
    factory_id: string;
    factory_name: string;
    factory_code: string;
    role: string;
    is_primary: boolean;
  }[]
> {
  const query = "SELECT * FROM get_user_factories($1)";
  const result = await pool.query(query, [userId]);
  return result.rows;
}

// Helper function to check if user is admin
async function isUserAdmin(userId: number): Promise<boolean> {
  const query = "SELECT role_id FROM users WHERE id = $1";
  const result = await pool.query(query, [userId]);
  if (result.rows.length === 0) return false;
  // Assuming role_id 1 is admin based on common patterns
  return result.rows[0].role_id === 1;
}

export class OrderApprovalWorkflowMediator {
  // Submit draft order for admin approval
  static async submitDraftOrderForApproval(
    submissionData: SubmitDraftOrderRequest,
    userId: string
  ): Promise<SalesRepOrder> {
    const action = "OrderApprovalWorkflowMediator.submitDraftOrderForApproval";
    const client = await pool.connect();
    let transactionActive = false;

    try {
      await client.query("BEGIN");
      transactionActive = true;

      MyLogger.info(action, {
        orderId: submissionData.order_id,
        userId,
      });

      // Check if order exists and is in draft status
      const orderQuery = "SELECT * FROM sales_rep_orders WHERE id = $1";
      const orderResult = await client.query(orderQuery, [
        submissionData.order_id,
      ]);

      if (orderResult.rows.length === 0) {
        throw new Error(
          `Sales rep order with ID ${submissionData.order_id} not found`
        );
      }

      const order = orderResult.rows[0];

      if (order.status !== "draft") {
        throw new Error(
          `Order cannot be submitted for approval from ${order.status} status. Only draft orders can be submitted.`
        );
      }

      // Update order status to submitted_for_approval
      const updateQuery = `
                UPDATE sales_rep_orders 
                SET 
                    status = 'submitted_for_approval',
                    submitted_for_approval_at = $1,
                    submitted_for_approval_by = $2,
                    updated_at = $1
                WHERE id = $3
                RETURNING *
            `;

      const updateValues = [new Date(), userId, submissionData.order_id];

      await client.query(updateQuery, updateValues);

      await client.query("COMMIT");
      transactionActive = false;

      MyLogger.success(action, {
        orderId: submissionData.order_id,
        newStatus: "submitted_for_approval",
      });

      // Get updated order with items
      const GetOrderInfoMediator = (await import("./GetOrderInfo.mediator"))
        .default;
      const updatedOrder = await GetOrderInfoMediator.getOrder(
        submissionData.order_id
      );

      return updatedOrder;
    } catch (error) {
      if (transactionActive) {
        await client.query("ROLLBACK");
      }
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Admin approval/rejection with factory selection
  static async adminApproveOrder(
    approvalData: AdminApprovalRequest,
    userId: string
  ): Promise<SalesRepOrder> {
    const action = "OrderApprovalWorkflowMediator.adminApproveOrder";
    const client = await pool.connect();
    let transactionActive = false;

    try {
      await client.query("BEGIN");
      transactionActive = true;

      MyLogger.info(action, {
        orderId: approvalData.order_id,
        approved: approvalData.approved,
        assignedFactoryId: approvalData.assigned_factory_id,
        userId,
      });

      // Check if order exists and is in submitted_for_approval status
      const orderQuery = "SELECT * FROM sales_rep_orders WHERE id = $1";
      const orderResult = await client.query(orderQuery, [
        approvalData.order_id,
      ]);

      if (orderResult.rows.length === 0) {
        throw new Error(
          `Sales rep order with ID ${approvalData.order_id} not found`
        );
      }

      const order = orderResult.rows[0];

      if (order.status !== "submitted_for_approval") {
        throw new Error(
          `Order cannot be approved from ${order.status} status. Only orders submitted for approval can be processed.`
        );
      }

      // If approved, factory must be assigned
      if (approvalData.approved && !approvalData.assigned_factory_id) {
        throw new Error("Factory must be assigned when approving an order");
      }

      // If approved, verify factory exists
      if (approvalData.approved && approvalData.assigned_factory_id) {
        const factoryQuery =
          "SELECT id FROM factories WHERE id = $1 AND is_active = true";
        const factoryResult = await client.query(factoryQuery, [
          approvalData.assigned_factory_id,
        ]);

        if (factoryResult.rows.length === 0) {
          throw new Error(
            `Factory with ID ${approvalData.assigned_factory_id} not found or inactive`
          );
        }
      }

      const newStatus = approvalData.approved ? "approved" : "rejected";
      const updateQuery = `
                UPDATE sales_rep_orders 
                SET 
                    status = $1,
                    admin_approved_by = $2,
                    admin_approved_at = $3,
                    assigned_factory_id = $4,
                    admin_rejection_reason = $5,
                    updated_at = $3
                WHERE id = $6
                RETURNING *
            `;

      const updateValues = [
        newStatus,
        userId,
        new Date(),
        approvalData.approved ? approvalData.assigned_factory_id : null,
        approvalData.approved ? null : approvalData.rejection_reason,
        approvalData.order_id,
      ];

      await client.query(updateQuery, updateValues);

      await client.query("COMMIT");
      transactionActive = false;

      MyLogger.success(action, {
        orderId: approvalData.order_id,
        approved: approvalData.approved,
        newStatus,
        assignedFactoryId: approvalData.assigned_factory_id,
      });

      // Get updated order with items
      const GetOrderInfoMediator = (await import("./GetOrderInfo.mediator"))
        .default;
      const updatedOrder = await GetOrderInfoMediator.getOrder(
        approvalData.order_id
      );

      return updatedOrder;
    } catch (error) {
      if (transactionActive) {
        await client.query("ROLLBACK");
      }
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }

  // Factory manager acceptance
  static async factoryManagerAcceptOrder(
    acceptanceData: FactoryManagerAcceptanceRequest,
    userId: string
  ): Promise<SalesRepOrder> {
    const action = "OrderApprovalWorkflowMediator.factoryManagerAcceptOrder";
    const client = await pool.connect();
    let transactionActive = false;

    try {
      await client.query("BEGIN");
      transactionActive = true;

      MyLogger.info(action, {
        orderId: acceptanceData.order_id,
        accepted: acceptanceData.accepted,
        userId,
      });

      // Get user's accessible factories for filtering
      const currentUserId = parseInt(userId);
      let userFactories: string[] = [];
      if (currentUserId) {
        const isAdmin = await isUserAdmin(currentUserId);
        if (!isAdmin) {
          const factories = await getUserFactories(currentUserId);
          userFactories = factories.map((f) => f.factory_id);
        }
      }

      // Check if order exists and is in approved status
      let orderQuery = "SELECT * FROM sales_rep_orders WHERE id = $1";
      let queryParams: any[] = [acceptanceData.order_id];

      if (currentUserId && userFactories.length > 0) {
        const factoryIds = userFactories.map(
          (_, index) => `$${queryParams.length + index + 1}`
        );
        orderQuery += ` AND assigned_factory_id IN (${factoryIds.join(", ")})`;
        queryParams.push(...userFactories);
      }

      const orderResult = await client.query(orderQuery, queryParams);

      if (orderResult.rows.length === 0) {
        throw new Error(
          `Sales rep order with ID ${acceptanceData.order_id} not found or access denied`
        );
      }

      const order = orderResult.rows[0];

      if (order.status !== "approved") {
        throw new Error(
          `Order cannot be accepted from ${order.status} status. Only approved orders can be accepted by factory manager.`
        );
      }

      const newStatus = acceptanceData.accepted
        ? "factory_accepted"
        : "rejected";
      const updateQuery = `
                UPDATE sales_rep_orders 
                SET 
                    status = $1,
                    factory_manager_accepted_by = $2,
                    factory_manager_accepted_at = $3,
                    factory_manager_rejection_reason = $4,
                    updated_at = $3
                WHERE id = $5
                RETURNING *
            `;

      const updateValues = [
        newStatus,
        userId,
        new Date(),
        acceptanceData.accepted ? null : acceptanceData.rejection_reason,
        acceptanceData.order_id,
      ];

      await client.query(updateQuery, updateValues);

      await client.query("COMMIT");
      transactionActive = false;

      MyLogger.success(action, {
        orderId: acceptanceData.order_id,
        accepted: acceptanceData.accepted,
        newStatus,
      });

      // Get updated order with items
      const GetOrderInfoMediator = (await import("./GetOrderInfo.mediator"))
        .default;
      const updatedOrder = await GetOrderInfoMediator.getOrder(
        acceptanceData.order_id
      );

      return updatedOrder;
    } catch (error) {
      if (transactionActive) {
        await client.query("ROLLBACK");
      }
      MyLogger.error(action, error);
      throw error;
    } finally {
      client.release();
    }
  }
}

export default OrderApprovalWorkflowMediator;
