import { Request, Response, NextFunction } from "express";
import { GetCustomerOrderInfoMediator } from "../mediators/customerOrders/GetCustomerOrderInfo.mediator";
import { AddCustomerOrderMediator } from "../mediators/customerOrders/AddCustomerOrder.mediator";
import { UpdateCustomerOrderInfoMediator } from "../mediators/customerOrders/UpdateCustomerOrderInfo.mediator";
import { DeleteCustomerOrderMediator } from "../mediators/customerOrders/DeleteCustomerOrder.mediator";
import FactoryCustomerPaymentsMediator from "../mediators/customerOrders/FactoryCustomerPaymentsMediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import { CreateCustomerOrderRequest, UpdateCustomerOrderRequest, ApproveOrderRequest, UpdateOrderStatusRequest, FactoryCustomerOrderStatus, RecordFactoryOrderPaymentRequest } from "@/types/factory";

class CustomerOrdersController {
  // Get all customer orders with pagination and filtering
  async getAllCustomerOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/customer-orders";
      MyLogger.info(action, { query: req.query });
      const userId = req.user?.user_id;
      const result = await GetCustomerOrderInfoMediator.getCustomerOrders(req.query, userId);
      MyLogger.success(action, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        ordersCount: result.orders.length
      });
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Get customer order by ID
  async getCustomerOrderById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/customer-orders/:id";
      const { id } = req.params;
      MyLogger.info(action, { orderId: id });

      const userId = req.user?.user_id;
      const order = await GetCustomerOrderInfoMediator.getCustomerOrderById(id, userId);

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
    } catch (error) {
      next(error);
    }
  }

  // Get order statistics
  async getOrderStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/customer-orders/stats";
      MyLogger.info(action);
      const userId = req.user?.user_id;
      const stats = await GetCustomerOrderInfoMediator.getOrderStats(userId);
      MyLogger.success(action, stats);
      serializeSuccessResponse(res, stats, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Create new customer order
  async createCustomerOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      console.log('==============================================================================', req.user);
      
      const action = "POST /api/factory/customer-orders";
      MyLogger.info(action, { orderData: req.body });
      const orderData: CreateCustomerOrderRequest = {
        ...req.body,
        // factory_id: req.user?.factory_id
      };
      const userId = req.user?.user_id; // Get from authenticated user
      const result = await AddCustomerOrderMediator.createCustomerOrder(orderData, userId!.toString());
      MyLogger.success(action, { 
        orderId: result.id, 
        orderNumber: result.order_number,
        totalValue: result.total_value 
      });
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Update customer order
  async updateCustomerOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "PUT /api/factory/customer-orders/:id";
      MyLogger.info(action, { orderId: req.params.id, updateData: req.body });
      const orderId = req.params.id;
      const updateData: UpdateCustomerOrderRequest = {
        ...req.body,
        // factory_id: req.user?.factory_id
      };
      const userId = req.user?.user_id; // Get from authenticated user
      const result = await UpdateCustomerOrderInfoMediator.updateCustomerOrder(orderId, updateData, userId!.toString());
      MyLogger.success(action, { 
        orderId, 
        orderNumber: result.order_number,
        updatedFields: Object.keys(updateData)
      });
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Convert quotation / accept pending: apply line items and approve atomically
  async convertOrderWithLines(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/customer-orders/:id/convert-with-lines";
      const orderId = req.params.id;
      MyLogger.info(action, { orderId, bodyKeys: Object.keys(req.body || {}) });
      const userId = req.user?.user_id;
      const result = await UpdateCustomerOrderInfoMediator.convertOrderWithLinesAndApprove(
        orderId,
        req.body,
        userId!.toString()
      );
      MyLogger.success(action, { orderId, orderNumber: result.order_number });
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Approve/reject customer order
  async approveCustomerOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/customer-orders/:id/approve";
      MyLogger.info(action, { orderId: req.params.id, approvalData: req.body });
      const orderId = Number(req.params.id);
      const approvalData: ApproveOrderRequest = {
        ...req.body,
        // factory_id: req.user?.factory_id
      };
      const userId = req.user?.user_id; // Get from authenticated user

      const approvalRequest = {
        order_id: orderId,
        approved: approvalData.approved,
        notes: approvalData.notes
      };

      const result = await UpdateCustomerOrderInfoMediator.approveOrder(approvalRequest, userId!.toString());
      MyLogger.success(action, { 
        orderId, 
        approved: approvalData.approved,
        newStatus: result.status 
      });
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Update order status
  async updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/customer-orders/:id/status";
      MyLogger.info(action, { orderId: req.params.id, statusData: req.body });
      const orderId = Number(req.params.id);
      const statusData: UpdateOrderStatusRequest = req.body;
      const userId = req.user?.user_id; // Get from authenticated user

      const updateRequest = {
        order_id: orderId,
        status: statusData.status,
        notes: statusData.notes,
        factory_id: req.user?.factory_id
      };
      const result = await UpdateCustomerOrderInfoMediator.updateOrderStatus(updateRequest, userId!.toString());
      MyLogger.success(action, { 
        orderId, 
        newStatus: statusData.status 
      });
      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Bulk update order status
  async bulkUpdateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/customer-orders/bulk/status";
      MyLogger.info(action, { bulkData: req.body });
      const { orderIds, status, notes } = req.body;
      const userId = req.user?.user_id; // Get from authenticated user

      const result = await UpdateCustomerOrderInfoMediator.bulkUpdateOrderStatus(
        orderIds,
        status,
        userId!.toString(),
        notes
      );
      MyLogger.success(action, { 
        updatedCount: result.updated,
        newStatus: status 
      });
      serializeSuccessResponse(res, { updated: result.updated, errors: result.errors }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Export customer orders
  async exportCustomerOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/customer-orders/export";
      MyLogger.info(action, { query: req.query });
      
      // For now, return the orders as JSON since export functionality needs to be implemented in mediator
      const result = await GetCustomerOrderInfoMediator.getCustomerOrders(req.query);
      MyLogger.success(action, { 
        format: req.query.format || 'json',
        recordCount: result.orders.length 
      });
      
      // Set appropriate headers for file download
      const format = (req.query.format as string) || 'json';
      const filename = `customer-orders-${new Date().toISOString().split('T')[0]}.${format}`;
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        // Convert to CSV (simplified)
        const csvData = result.orders.map(order => 
          `${order.order_number},${order.factory_customer_name},${order.status},${order.total_value}`
        ).join('\n');
        res.send(`Order Number,Customer,Status,Total Value\n${csvData}`);
      } else {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.json(result.orders);
      }
    } catch (error) {
      next(error);
    }
  }

  // Export quotation PDF
  async exportQuotationPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/customer-orders/:id/pdf";
      const { id } = req.params;
      MyLogger.info(action, { orderId: id });

      const userId = req.user?.user_id;
      const order = await GetCustomerOrderInfoMediator.getCustomerOrderById(id, userId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: "Customer order/quotation not found",
          data: null
        });
        return;
      }

      // Import generator dynamically to avoid issues if puppeteer has loading problems
      const { PDFGenerator } = await import('@/services/pdf-generator');
      const pdfBuffer = await PDFGenerator.generateQuotationPDF(order);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="quotation-${order.order_number}.pdf"`);
      res.send(pdfBuffer);
      MyLogger.success(action, { orderId: id, pdfGenerated: true });
    } catch (error) {
      next(error);
    }
  }

  // Export Invoice (Bill) PDF
  async exportInvoicePdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/customer-orders/:id/invoice";
      const { id } = req.params;
      MyLogger.info(action, { orderId: id });

      const userId = req.user?.user_id;
      const order = await GetCustomerOrderInfoMediator.getCustomerOrderById(id, userId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: "Customer order not found",
          data: null
        });
        return;
      }

      const { PDFGenerator } = await import('@/services/pdf-generator');
      const pdfBuffer = await PDFGenerator.generateInvoicePDF(order);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="invoice-${order.order_number}.pdf"`);
      res.send(pdfBuffer);
      MyLogger.success(action, { orderId: id, pdfGenerated: true });
    } catch (error) {
      next(error);
    }
  }

  // Export Challan PDF
  async exportChallanPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/customer-orders/:id/challan";
      const { id } = req.params;
      MyLogger.info(action, { orderId: id });

      const userId = req.user?.user_id;
      const order = await GetCustomerOrderInfoMediator.getCustomerOrderById(id, userId);

      if (!order) {
        res.status(404).json({
          success: false,
          message: "Customer order not found",
          data: null
        });
        return;
      }

      const { PDFGenerator } = await import('@/services/pdf-generator');
      const pdfBuffer = await PDFGenerator.generateChallanPDF(order);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="challan-${order.order_number}.pdf"`);
      res.send(pdfBuffer);
      MyLogger.success(action, { orderId: id, pdfGenerated: true });
    } catch (error) {
      next(error);
    }
  }

  // Delete customer order
  async deleteCustomerOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "DELETE /api/factory/customer-orders/:id";
      MyLogger.info(action, { orderId: req.params.id });
      const orderId = req.params.id;
      const userId = req.user?.user_id; // Get from authenticated user
      const force = req.query.force === 'true';

      if (force) {
        await DeleteCustomerOrderMediator.deleteCustomerOrder(orderId, userId!.toString());
      } else {
        await DeleteCustomerOrderMediator.softDeleteCustomerOrder(orderId, userId!.toString());
      }
      
      MyLogger.success(action, { orderId, force });
      serializeSuccessResponse(res, { deleted: true }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Ship customer order (legacy entry point — delegates to delivery flow)
  async shipCustomerOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/customer-orders/:id/ship";
      const { id } = req.params;
      const { notes, tracking_number, carrier, estimated_delivery_date, items } = req.body || {};
      MyLogger.info(action, { orderId: id, shippingData: { notes, tracking_number, carrier, estimated_delivery_date, hasItems: Array.isArray(items) } });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const { CreateDeliveryMediator } = await import('../mediators/deliveries/CreateDelivery.mediator');

      // If caller supplied a partial-items array, treat this as a partial
      // delivery; otherwise ship all remaining qty (preserves the legacy
      // "Ship Order" UX as a one-click ship-everything-left).
      const result = Array.isArray(items) && items.length > 0
        ? await CreateDeliveryMediator.createPartialDelivery(
            id,
            { items, notes, tracking_number, carrier, estimated_delivery_date },
            userId
          )
        : await CreateDeliveryMediator.shipAllRemaining(
            id,
            { notes, tracking_number, carrier, estimated_delivery_date },
            userId
          );

      const updatedOrder = await GetCustomerOrderInfoMediator.getCustomerOrderById(id, userId);

      MyLogger.success(action, {
        orderId: id,
        deliveryId: result.delivery.id,
        deliveryNumber: result.delivery.delivery_number,
        invoiceId: result.invoice.id,
        invoiceNumber: result.invoice.invoice_number,
        finalStatus: updatedOrder?.status,
      });

      serializeSuccessResponse(
        res,
        {
          ...(updatedOrder ?? {}),
          invoice_id: result.invoice.id,
          invoice_number: result.invoice.invoice_number,
          delivery_id: result.delivery.id,
          delivery_number: result.delivery.delivery_number,
        },
        "Order shipped successfully"
      );
    } catch (error) {
      next(error);
    }
  }

  // Bulk delete customer orders
  async bulkDeleteCustomerOrders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "DELETE /api/factory/customer-orders/bulk";
      MyLogger.info(action, { bulkData: req.body });
      const { orderIds, force } = req.body;
      const userId = (req as any).user?.user_id || '1'; // Get from authenticated user

      const result = await DeleteCustomerOrderMediator.bulkDeleteCustomerOrders(orderIds, userId!.toString(), force);
      MyLogger.success(action, {
        deletedCount: result.deleted,
        force
      });
      serializeSuccessResponse(res, { deleted: result.deleted, errors: result.errors }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Record payment against customer order
  async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/customer-orders/:id/payments";
      const orderId = req.params.id;
      const userId = req.user?.user_id;
      
      MyLogger.info(action, { orderId, paymentData: req.body });

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const paymentData: RecordFactoryOrderPaymentRequest = req.body;
      const payment = await FactoryCustomerPaymentsMediator.recordPayment(
        orderId,
        paymentData,
        userId
      );

      MyLogger.success(action, {
        orderId,
        paymentId: payment.id,
        amount: payment.payment_amount
      });

      serializeSuccessResponse(res, payment, "Payment recorded successfully");
    } catch (error) {
      next(error);
    }
  }

  // Get payment history for customer order
  async getPaymentHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/customer-orders/:id/payments";
      const orderId = req.params.id;

      MyLogger.info(action, { orderId });

      const payments = await FactoryCustomerPaymentsMediator.getPaymentHistory(orderId);

      MyLogger.success(action, {
        orderId,
        paymentCount: payments.length
      });

      serializeSuccessResponse(res, { payments }, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Get payment summary for customer order
  async getPaymentSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/customer-orders/:id/payments/summary";
      const orderId = req.params.id;

      MyLogger.info(action, { orderId });

      const summary = await FactoryCustomerPaymentsMediator.getPaymentSummary(orderId);

      MyLogger.success(action, { orderId, summary });

      serializeSuccessResponse(res, summary, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }

  // Get all customer payments across all orders
  async getAllPayments(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "GET /api/factory/customer-orders/payments/all"; // Using a unique path to avoid conflict with /:id/payments
      MyLogger.info(action, { query: req.query });
      
      const result = await FactoryCustomerPaymentsMediator.getAllPayments(req.query);
      
      MyLogger.success(action, {
        total: result.total,
        count: result.payments.length
      });

      serializeSuccessResponse(res, result, "SUCCESS");
    } catch (error) {
      next(error);
    }
  }
}

export default new CustomerOrdersController();