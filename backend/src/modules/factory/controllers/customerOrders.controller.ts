import { Request, Response, NextFunction } from "express";
import { GetCustomerOrderInfoMediator } from "../mediators/customerOrders/GetCustomerOrderInfo.mediator";
import { AddCustomerOrderMediator } from "../mediators/customerOrders/AddCustomerOrder.mediator";
import { UpdateCustomerOrderInfoMediator } from "../mediators/customerOrders/UpdateCustomerOrderInfo.mediator";
import { DeleteCustomerOrderMediator } from "../mediators/customerOrders/DeleteCustomerOrder.mediator";
import FactoryCustomerPaymentsMediator from "../mediators/customerOrders/FactoryCustomerPaymentsMediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import { MyLogger } from "@/utils/new-logger";
import { CreateCustomerOrderRequest, UpdateCustomerOrderRequest, ApproveOrderRequest, UpdateOrderStatusRequest, FactoryCustomerOrderStatus, RecordFactoryOrderPaymentRequest } from "@/types/factory";
import pool from "@/database/connection";

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

  // Ship customer order
  async shipCustomerOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = "POST /api/factory/customer-orders/:id/ship";
      const { id } = req.params;
      const { notes, tracking_number, carrier, estimated_delivery_date } = req.body;
      MyLogger.info(action, { orderId: id, shippingData: { notes, tracking_number, carrier, estimated_delivery_date } });

      const userId = req.user?.user_id;
      if (!userId) {
        throw new Error('User not authenticated');
      }

      // First, check if the order can be shipped (must be completed and not already shipped)
      const orderCheckQuery = `
        SELECT id, status, order_number
        FROM factory_customer_orders
        WHERE id = $1
      `;
      const orderResult = await pool.query(orderCheckQuery, [id]);

      if (orderResult.rows.length === 0) {
        throw new Error('Customer order not found');
      }

      const order = orderResult.rows[0];

      if (order.status !== 'completed') {
        throw new Error(`Cannot ship order in ${order.status} status. Order must be completed first.`);
      }

      if (order.status === 'shipped') {
        throw new Error('Order is already shipped');
      }

      // Update order status to shipped and add shipping details
      const updateFields = ['status = $1', 'shipped_at = CURRENT_TIMESTAMP', 'shipped_by = $2', 'updated_at = CURRENT_TIMESTAMP'];
      const updateValues = ['shipped', userId, id];
      let paramIndex = 4;

      if (tracking_number) {
        updateFields.push(`tracking_number = $${paramIndex}`);
        updateValues.push(tracking_number);
        paramIndex++;
      }

      if (carrier) {
        updateFields.push(`carrier = $${paramIndex}`);
        updateValues.push(carrier);
        paramIndex++;
      }

      if (estimated_delivery_date) {
        updateFields.push(`estimated_delivery_date = $${paramIndex}`);
        updateValues.push(estimated_delivery_date);
        paramIndex++;
      }

      if (notes && notes.trim() !== '') {
        updateFields.push(`notes = CASE
          WHEN notes IS NOT NULL THEN notes || E'\n' || $${paramIndex}
          ELSE $${paramIndex}
        END`);
        updateValues.push(notes);
        paramIndex++;
      }

      const updateQuery = `
        UPDATE factory_customer_orders
        SET ${updateFields.join(', ')}
        WHERE id = $3
        RETURNING *
      `;

      const updateResult = await pool.query(updateQuery, updateValues);

      if (updateResult.rows.length === 0) {
        throw new Error('Failed to update order status');
      }

      const updatedOrder = updateResult.rows[0];

      // Auto-generate invoice for shipped order
      try {
        const { SalesInvoiceMediator } = await import('../mediators/salesInvoices/SalesInvoiceMediator');
        
        // Check if invoice already exists
        const existingInvoiceCheck = await pool.query(
          'SELECT id, invoice_number FROM factory_sales_invoices WHERE customer_order_id = $1',
          [id]
        );

        if (existingInvoiceCheck.rows.length === 0) {
          // Generate invoice
          const invoice = await SalesInvoiceMediator.createInvoiceFromOrder(
            {
              customer_order_id: id,
              notes: `Invoice for ${updatedOrder.order_number} - Shipped on ${new Date().toISOString().split('T')[0]}`
            },
            userId
          );

          MyLogger.success(`${action}.invoiceGenerated`, {
            orderId: id,
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoice_number
          });

          updatedOrder.invoice_number = invoice.invoice_number;
          updatedOrder.invoice_id = invoice.id;
        } else {
          MyLogger.info(`${action}.invoiceExists`, {
            orderId: id,
            invoiceNumber: existingInvoiceCheck.rows[0].invoice_number
          });
          updatedOrder.invoice_number = existingInvoiceCheck.rows[0].invoice_number;
          updatedOrder.invoice_id = existingInvoiceCheck.rows[0].id;
        }
      } catch (invoiceError: any) {
        MyLogger.error(`${action}.invoiceGenerationFailed`, invoiceError, {
          orderId: id,
          message: 'Failed to generate invoice, but order shipping succeeded'
        });
        // Don't fail the shipping operation if invoice generation fails
      }

      MyLogger.success(action, {
        orderId: id,
        orderNumber: updatedOrder.order_number,
        shipped: true,
        trackingNumber: tracking_number,
        carrier: carrier
      });

      // Return the updated order
      serializeSuccessResponse(res, updatedOrder, "Order shipped successfully");
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
}

export default new CustomerOrdersController();