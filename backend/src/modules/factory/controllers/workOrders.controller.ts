import { Request, Response, NextFunction } from "express";
import { GetWorkOrderInfoMediator } from "../mediators/workOrders/GetWorkOrderInfo.mediator";
import { AddWorkOrderMediator } from "../mediators/workOrders/AddWorkOrder.mediator";
import { UpdateWorkOrderMediator } from "../mediators/workOrders/UpdateWorkOrder.mediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import {
  CreateWorkOrderRequest,
  UpdateWorkOrderRequest,
  WorkOrderQueryParams,
  WorkOrderStatus
} from "@/types/factory";

class WorkOrdersController {
  // Get all work orders with pagination and filtering
  async getAllWorkOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/work-orders";
      MyLogger.info(action, { query: req.query });
      const userId = req.user?.user_id;
      const result = await GetWorkOrderInfoMediator.getWorkOrders(req.query as WorkOrderQueryParams, userId);
      MyLogger.success(action, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        workOrdersCount: result.work_orders.length
      });
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Get work order by ID
  async getWorkOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/work-orders/:id";
      const { id } = req.params;
      MyLogger.info(action, { workOrderId: id });

      const userId = req.user?.user_id;
      const workOrder = await GetWorkOrderInfoMediator.getWorkOrderById(id, userId);

      if (!workOrder) {
        res.status(404).json({
          success: false,
          message: "Work order not found",
          data: null
        });
        return;
      }

      MyLogger.success(action, { workOrderId: id, found: true });
      serializeSuccessResponse(res, workOrder, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Get work order statistics
  async getWorkOrderStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/work-orders/stats";
      MyLogger.info(action);
      const userId = req.user?.user_id;
      const stats = await GetWorkOrderInfoMediator.getWorkOrderStats(userId);
      MyLogger.success(action, stats);
      serializeSuccessResponse(res, stats, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Create new work order
  async createWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/work-orders";
      const workOrderData: CreateWorkOrderRequest = req.body;
      MyLogger.info(action, { workOrderData });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const newWorkOrder = await AddWorkOrderMediator.createWorkOrder(workOrderData, userId.toString());

      MyLogger.success(action, {
        workOrderId: newWorkOrder.id,
        workOrderNumber: newWorkOrder.work_order_number
      });

      serializeSuccessResponse(res, newWorkOrder, "Work order created successfully");
    } catch (error) {
      next(error);
    }
  }

  // Update work order
  async updateWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "PUT /api/factory/work-orders/:id";
      const { id } = req.params;
      const updateData: UpdateWorkOrderRequest = req.body;
      MyLogger.info(action, { workOrderId: id, updateData });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const updatedWorkOrder = await UpdateWorkOrderMediator.updateWorkOrder(id, updateData, userId.toString());

      MyLogger.success(action, {
        workOrderId: id,
        updatedFields: Object.keys(updateData)
      });

      serializeSuccessResponse(res, updatedWorkOrder, "Work order updated successfully");
    } catch (error) {
      next(error);
    }
  }

  // Update work order status
  async updateWorkOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/work-orders/:id/status";
      const { id } = req.params;
      const statusData = req.body;
      MyLogger.info(action, { workOrderId: id, statusData });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const updatedWorkOrder = await UpdateWorkOrderMediator.updateWorkOrderStatus(
        id,
        statusData.status,
        userId.toString(),
        statusData.notes
      );

      MyLogger.success(action, {
        workOrderId: id,
        newStatus: statusData.status
      });

      serializeSuccessResponse(res, updatedWorkOrder, "Work order status updated successfully");
    } catch (error) {
      next(error);
    }
  }

  // Delete work order
  async deleteWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "DELETE /api/factory/work-orders/:id";
      const { id } = req.params;
      const { force = false } = req.query;
      MyLogger.info(action, { workOrderId: id, force });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const result = await UpdateWorkOrderMediator.deleteWorkOrder(id, userId.toString(), force as boolean);

      MyLogger.success(action, {
        workOrderId: id,
        deleted: result.deleted
      });

      serializeSuccessResponse(res, result, "Work order deleted successfully");
    } catch (error) {
      next(error);
    }
  }

  // Get production lines
  async getProductionLines(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/production-lines";
      MyLogger.info(action);
      const productionLines = await GetWorkOrderInfoMediator.getProductionLines();
      MyLogger.success(action, { count: productionLines.length });
      serializeSuccessResponse(res, productionLines, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Get operators
  async getOperators(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/operators";
      MyLogger.info(action);
      const operators = await GetWorkOrderInfoMediator.getOperators();
      MyLogger.success(action, { count: operators.length });
      serializeSuccessResponse(res, operators, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Plan work order (assign production line, operators and change status to planned)
  async planWorkOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/work-orders/:id/plan";
      const { id } = req.params;
      const { production_line_id, assigned_operators, notes } = req.body;
      MyLogger.info(action, { workOrderId: id, production_line_id, assigned_operators, notes });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Use the combined planning method that handles both assignment and status change atomically
      const result = await UpdateWorkOrderMediator.planWorkOrder(
        id,
        { production_line_id, assigned_operators, notes },
        userId.toString()
      );

      MyLogger.success(action, {
        workOrderId: id,
        planned: true
      });

      serializeSuccessResponse(res, result, "Work order planned successfully");
    } catch (error) {
      next(error);
    }
  }

  // Bulk update work order status
  async bulkUpdateWorkOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/work-orders/bulk/status";
      const { work_order_ids, status, notes } = req.body;
      MyLogger.info(action, { workOrderIds: work_order_ids, status, notes });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Update each work order status
      const updatedWorkOrders = [];
      for (const workOrderId of work_order_ids) {
        try {
          const updatedWorkOrder = await UpdateWorkOrderMediator.updateWorkOrderStatus(
            workOrderId,
            status,
            userId.toString(),
            notes
          );
          updatedWorkOrders.push(updatedWorkOrder);
        } catch (error) {
          MyLogger.error(`Failed to update work order ${workOrderId}`, error);
          // Continue with other work orders
        }
      }

      MyLogger.success(action, {
        requestedCount: work_order_ids.length,
        updatedCount: updatedWorkOrders.length
      });

      serializeSuccessResponse(res, { updated_work_orders: updatedWorkOrders }, "Bulk status update completed");
    } catch (error) {
      next(error);
    }
  }

  // Record material consumption for work order completion
  async recordMaterialConsumptionForCompletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/work-orders/:id/complete-with-consumption";
      const { id } = req.params;
      const { material_consumptions, notes } = req.body;
      MyLogger.info(action, { workOrderId: id, consumptionsCount: material_consumptions?.length });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // Record material consumptions, then complete work order
      const result = await UpdateWorkOrderMediator.completeWithMaterialConsumption(
        id,
        material_consumptions || [],
        userId.toString(),
        notes
      );

      MyLogger.success(action, {
        workOrderId: id,
        materialsConsumed: material_consumptions?.length || 0
      });

      serializeSuccessResponse(res, result, "Work order completed with material consumption");
    } catch (error) {
      next(error);
    }
  }
}

export const workOrdersController = new WorkOrdersController();
