import { NextFunction, Request, Response } from "express";
import { AddCustomerOrderMediator } from "../mediators/customerOrders/AddCustomerOrder.mediator";
import { GetCustomerOrderInfoMediator } from "../mediators/customerOrders/GetCustomerOrderInfo.mediator";
import { UpdateCustomerOrderInfoMediator } from "../mediators/customerOrders/UpdateCustomerOrderInfo.mediator";
import { DeleteCustomerOrderMediator } from "../mediators/customerOrders/DeleteCustomerOrder.mediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import { CreateCustomerOrderRequest, UpdateCustomerOrderRequest, ApproveOrderRequest, UpdateOrderStatusRequest } from "@/types/factory";

class CustomerOrdersController {
  async getAllCustomerOrders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const action = "GET /api/factory/customer-orders";
    try {
      MyLogger.info(action, { query: req.query });
      const result = await GetCustomerOrderInfoMediator.getCustomerOrders(req.query);
      MyLogger.success(action, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        ordersCount: result.orders.length
      });
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query });
      next(error);
    }
  }

  async getCustomerOrderById(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const action = "GET /api/factory/customer-orders/:id";
    try {
      const { id } = req.params;
      MyLogger.info(action, { orderId: id });
      
      const order = await GetCustomerOrderInfoMediator.getCustomerOrderById(id);
      
      if (!order) {
        res.status(404).json({
          success: false,
          message: "Customer order not found",
          data: null
        });
        return;
      }

      MyLogger.success(action, { orderId: id, found: true });
      serializeSuccessResponse(res, order, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error, { orderId: req.params.id });
      next(error);
    }
  }

  async getOrderStats(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const action = "GET /api/factory/customer-orders/stats";
    try {
      MyLogger.info(action);
      const stats = await GetCustomerOrderInfoMediator.getOrderStats();
      MyLogger.success(action, stats);
      serializeSuccessResponse(res, stats, "SUCCESS");
    } catch (error: any) {
      MyLogger.error(action, error);
      next(error);
    }
  }

  async createCustomerOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const action = "POST /api/factory/customer-orders";
    try {
      const orderData: CreateCustomerOrderRequest = req.body;
      const userId = req.user?.id || 'system'; // Assuming user info is in req.user
      
      MyLogger.info(action, { 
        customerId: orderData.customer_id,
        lineItemsCount: orderData.line_items.length,
        userId 
      });

      const newOrder = await AddCustomerOrderMediator.createCustomerOrder(orderData, userId);
      
      MyLogger.success(action, { 
        orderId: newOrder.id,
        orderNumber: newOrder.order_number,
        totalValue: newOrder.total_value
      });
      
      serializeSuccessResponse(res, newOrder, "Customer order created successfully", 201);
    } catch (error: any) {
      MyLogger.error(action, error, { customerId: req.body.customer_id });
      next(error);
    }
  }

  async updateCustomerOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const action = "PUT /api/factory/customer-orders/:id";
    try {
      const { id } = req.params;
      const updateData: UpdateCustomerOrderRequest = req.body;
      const userId = req.user?.id || 'system';
      
      MyLogger.info(action, { 
        orderId: id,
        updateFields: Object.keys(updateData),
        userId 
      });

      const updatedOrder = await UpdateCustomerOrderInfoMediator.updateCustomerOrder(id, updateData, userId);
      
      MyLogger.success(action, { 
        orderId: id,
        totalValue: updatedOrder.total_value
      });
      
      serializeSuccessResponse(res, updatedOrder, "Customer order updated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { orderId: req.params.id });
      next(error);
    }
  }

  async approveCustomerOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const action = "POST /api/factory/customer-orders/:id/approve";
    try {
      const { id } = req.params;
      const { approved, notes } = req.body;
      const userId = req.user?.id || 'system';
      
      const approvalData: ApproveOrderRequest = {
        order_id: id,
        approved: approved,
        notes: notes
      };
      
      MyLogger.info(action, { 
        orderId: id,
        approved,
        userId 
      });

      const updatedOrder = await UpdateCustomerOrderInfoMediator.approveOrder(approvalData, userId);
      
      MyLogger.success(action, { 
        orderId: id,
        approved,
        newStatus: updatedOrder.status
      });
      
      serializeSuccessResponse(res, updatedOrder, `Customer order ${approved ? 'approved' : 'rejected'} successfully`);
    } catch (error: any) {
      MyLogger.error(action, error, { orderId: req.params.id });
      next(error);
    }
  }

  async updateOrderStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const action = "POST /api/factory/customer-orders/:id/status";
    try {
      const { id } = req.params;
      const { status, notes } = req.body;
      const userId = req.user?.id || 'system';
      
      const statusData: UpdateOrderStatusRequest = {
        order_id: id,
        status: status,
        notes: notes
      };
      
      MyLogger.info(action, { 
        orderId: id,
        newStatus: status,
        userId 
      });

      const updatedOrder = await UpdateCustomerOrderInfoMediator.updateOrderStatus(statusData, userId);
      
      MyLogger.success(action, { 
        orderId: id,
        newStatus: status
      });
      
      serializeSuccessResponse(res, updatedOrder, "Order status updated successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { orderId: req.params.id });
      next(error);
    }
  }

  async bulkUpdateOrderStatus(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const action = "POST /api/factory/customer-orders/bulk/status";
    try {
      const { order_ids, status, notes } = req.body;
      const userId = req.user?.id || 'system';
      
      MyLogger.info(action, { 
        orderCount: order_ids.length,
        newStatus: status,
        userId 
      });

      const result = await UpdateCustomerOrderInfoMediator.bulkUpdateOrderStatus(order_ids, status, userId, notes);
      
      MyLogger.success(action, { 
        totalOrders: order_ids.length,
        updated: result.updated,
        errors: result.errors.length
      });
      
      serializeSuccessResponse(res, result, "Bulk status update completed");
    } catch (error: any) {
      MyLogger.error(action, error, { orderIds: req.body.order_ids });
      next(error);
    }
  }

  async deleteCustomerOrder(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const action = "DELETE /api/factory/customer-orders/:id";
    try {
      const { id } = req.params;
      const { soft_delete = true } = req.query;
      const userId = req.user?.id || 'system';
      
      MyLogger.info(action, { 
        orderId: id,
        softDelete: soft_delete,
        userId 
      });

      let result: boolean;
      if (soft_delete === 'false' || soft_delete === false) {
        result = await DeleteCustomerOrderMediator.deleteCustomerOrder(id, userId);
      } else {
        result = await DeleteCustomerOrderMediator.softDeleteCustomerOrder(id, userId);
      }
      
      MyLogger.success(action, { 
        orderId: id,
        deleted: result,
        softDelete: soft_delete
      });
      
      serializeSuccessResponse(res, { deleted: result }, "Customer order deleted successfully");
    } catch (error: any) {
      MyLogger.error(action, error, { orderId: req.params.id });
      next(error);
    }
  }

  async bulkDeleteCustomerOrders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const action = "DELETE /api/factory/customer-orders/bulk";
    try {
      const { order_ids, soft_delete = true } = req.body;
      const userId = req.user?.id || 'system';
      
      MyLogger.info(action, { 
        orderCount: order_ids.length,
        softDelete: soft_delete,
        userId 
      });

      const result = await DeleteCustomerOrderMediator.bulkDeleteCustomerOrders(order_ids, userId, soft_delete);
      
      MyLogger.success(action, { 
        totalOrders: order_ids.length,
        deleted: result.deleted,
        errors: result.errors.length,
        softDelete: soft_delete
      });
      
      serializeSuccessResponse(res, result, "Bulk delete completed");
    } catch (error: any) {
      MyLogger.error(action, error, { orderIds: req.body.order_ids });
      next(error);
    }
  }

  async exportCustomerOrders(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const action = "GET /api/factory/customer-orders/export";
    try {
      const { format = 'csv', ...filters } = req.query;
      
      MyLogger.info(action, { format, filters });

      // Get orders based on filters
      const result = await GetCustomerOrderInfoMediator.getCustomerOrders({
        ...filters,
        limit: 10000 // Large limit for export
      });

      // For now, just return the data - in a real implementation, 
      // you would format this as CSV, Excel, or PDF
      MyLogger.success(action, { 
        format,
        ordersCount: result.orders.length
      });
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=customer-orders.csv');
        // TODO: Implement CSV formatting
        res.send('CSV export not implemented yet');
      } else {
        serializeSuccessResponse(res, result.orders, "Orders exported successfully");
      }
    } catch (error: any) {
      MyLogger.error(action, error, { query: req.query });
      next(error);
    }
  }
}

export default new CustomerOrdersController();
