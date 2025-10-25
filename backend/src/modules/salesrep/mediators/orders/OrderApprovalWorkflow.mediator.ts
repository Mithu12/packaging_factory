import pool from "@/database/connection";
import {
  SalesRepOrder,
  SubmitDraftOrderRequest,
  AdminApprovalRequest,
  AdminApprovalWithProductFactoryRequest,
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

  // Admin approval/rejection with factory selection (legacy method)
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

  // Admin approval/rejection with per-product factory assignment
  static async adminApproveOrderWithProductFactoryAssignment(
    approvalData: AdminApprovalWithProductFactoryRequest,
    userId: string
  ): Promise<SalesRepOrder> {
    const action =
      "OrderApprovalWorkflowMediator.adminApproveOrderWithProductFactoryAssignment";
    const client = await pool.connect();
    let transactionActive = false;

    try {
      await client.query("BEGIN");
      transactionActive = true;

      MyLogger.info(action, {
        orderId: approvalData.order_id,
        approved: approvalData.approved,
        productAssignments: approvalData.product_assignments,
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

      // If approved, validate factory assignments
      if (approvalData.approved) {
        // Check if we have product assignments or legacy factory assignment
        if (
          approvalData.product_assignments &&
          approvalData.product_assignments.length > 0
        ) {
          // Validate all product assignments
          for (const assignment of approvalData.product_assignments) {
            // Verify factory exists
            const factoryQuery =
              "SELECT id FROM factories WHERE id = $1 AND is_active = true";
            const factoryResult = await client.query(factoryQuery, [
              assignment.assigned_factory_id,
            ]);

            if (factoryResult.rows.length === 0) {
              throw new Error(
                `Factory with ID ${assignment.assigned_factory_id} not found or inactive`
              );
            }

            // Verify order item exists
            const itemQuery =
              "SELECT id FROM sales_rep_order_items WHERE id = $1 AND order_id = $2";
            const itemResult = await client.query(itemQuery, [
              assignment.item_id,
              approvalData.order_id,
            ]);

            if (itemResult.rows.length === 0) {
              throw new Error(
                `Order item with ID ${assignment.item_id} not found in order ${approvalData.order_id}`
              );
            }
          }
        } else if (approvalData.assigned_factory_id) {
          // Legacy single factory assignment
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
        } else {
          throw new Error("Factory must be assigned when approving an order");
        }
      }

      const newStatus = approvalData.approved ? "approved" : "rejected";

      // Update order status
      const updateOrderQuery = `
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

      const updateOrderValues = [
        newStatus,
        userId,
        new Date(),
        approvalData.approved ? approvalData.assigned_factory_id || null : null,
        approvalData.approved ? null : approvalData.rejection_reason,
        approvalData.order_id,
      ];

      await client.query(updateOrderQuery, updateOrderValues);

      // If approved and we have product assignments, update each order item
      if (
        approvalData.approved &&
        approvalData.product_assignments &&
        approvalData.product_assignments.length > 0
      ) {
        for (const assignment of approvalData.product_assignments) {
          const updateItemQuery = `
            UPDATE sales_rep_order_items 
            SET 
                assigned_factory_id = $1,
                factory_assigned_by = $2,
                factory_assigned_at = $3,
                updated_at = $3
            WHERE id = $4 AND order_id = $5
          `;

          await client.query(updateItemQuery, [
            assignment.assigned_factory_id,
            userId,
            new Date(),
            assignment.item_id,
            approvalData.order_id,
          ]);
        }
      } else if (approvalData.approved && approvalData.assigned_factory_id) {
        // Legacy: assign all items to the same factory
        const updateAllItemsQuery = `
          UPDATE sales_rep_order_items 
          SET 
              assigned_factory_id = $1,
              factory_assigned_by = $2,
              factory_assigned_at = $3,
              updated_at = $3
          WHERE order_id = $4
        `;

        await client.query(updateAllItemsQuery, [
          approvalData.assigned_factory_id,
          userId,
          new Date(),
          approvalData.order_id,
        ]);
      }

      await client.query("COMMIT");
      transactionActive = false;

      MyLogger.success(action, {
        orderId: approvalData.order_id,
        approved: approvalData.approved,
        newStatus,
        productAssignments: approvalData.product_assignments,
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
