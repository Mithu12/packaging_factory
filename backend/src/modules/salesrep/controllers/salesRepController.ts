import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import salesRepService from '../services/salesRepService';
import { ApiResponse } from '../types';
import { auditService } from '../../../services/auditService';

export class SalesRepController {
  // Dashboard
  async getDashboardStats(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const userId = req.user?.id;
      const stats = await salesRepService.getDashboardStats(userId);

      await auditService.log({
        user_id: userId,
        action: 'GET /api/salesrep/dashboard/stats',
        entity_type: 'dashboard',
        entity_id: null,
        details: 'Viewed dashboard statistics',
        metadata: { timestamp: new Date().toISOString() },
      });

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch dashboard statistics',
      });
    }
  }

  // Customers
  async getCustomers(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const filters = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await salesRepService.getCustomers(filters, { page, limit });

      await auditService.log({
        user_id: req.user?.id,
        action: 'GET /api/salesrep/customers',
        entity_type: 'customers',
        entity_id: null,
        details: 'Viewed customers list',
        metadata: { filters, pagination: { page, limit } },
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customers',
      });
    }
  }

  async getCustomer(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { id } = req.params;
      const customer = await salesRepService.getCustomer(parseInt(id));

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }

      await auditService.log({
        user_id: req.user?.id,
        action: `GET /api/salesrep/customers/${id}`,
        entity_type: 'customer',
        entity_id: parseInt(id),
        details: 'Viewed customer details',
        metadata: { customer_id: id },
      });

      res.json({
        success: true,
        data: customer,
      });
    } catch (error) {
      console.error('Error fetching customer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch customer',
      });
    }
  }

  async createCustomer(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: errors.array(),
        });
      }

      const customerData = req.body;
      const userId = req.user?.id;
      const customer = await salesRepService.createCustomer(customerData, userId);

      await auditService.log({
        user_id: userId,
        action: 'POST /api/salesrep/customers',
        entity_type: 'customer',
        entity_id: customer.id,
        details: 'Created new customer',
        metadata: { customer_name: customer.name },
      });

      res.status(201).json({
        success: true,
        data: customer,
        message: 'Customer created successfully',
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create customer',
      });
    }
  }

  async updateCustomer(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: errors.array(),
        });
      }

      const { id } = req.params;
      const customerData = req.body;
      const customer = await salesRepService.updateCustomer(parseInt(id), customerData);

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }

      await auditService.log({
        user_id: req.user?.id,
        action: `PUT /api/salesrep/customers/${id}`,
        entity_type: 'customer',
        entity_id: parseInt(id),
        details: 'Updated customer information',
        metadata: { customer_id: id },
      });

      res.json({
        success: true,
        data: customer,
        message: 'Customer updated successfully',
      });
    } catch (error) {
      console.error('Error updating customer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update customer',
      });
    }
  }

  async deleteCustomer(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { id } = req.params;
      await salesRepService.deleteCustomer(parseInt(id));

      await auditService.log({
        user_id: req.user?.id,
        action: `DELETE /api/salesrep/customers/${id}`,
        entity_type: 'customer',
        entity_id: parseInt(id),
        details: 'Deleted customer',
        metadata: { customer_id: id },
      });

      res.json({
        success: true,
        message: 'Customer deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting customer:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete customer',
      });
    }
  }

  // Orders
  async getOrders(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const filters = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await salesRepService.getOrders(filters, { page, limit });

      await auditService.log({
        user_id: req.user?.id,
        action: 'GET /api/salesrep/orders',
        entity_type: 'orders',
        entity_id: null,
        details: 'Viewed orders list',
        metadata: { filters, pagination: { page, limit } },
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch orders',
      });
    }
  }

  async getOrder(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { id } = req.params;
      const order = await salesRepService.getOrder(parseInt(id));

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

      await auditService.log({
        user_id: req.user?.id,
        action: `GET /api/salesrep/orders/${id}`,
        entity_type: 'order',
        entity_id: parseInt(id),
        details: 'Viewed order details',
        metadata: { order_id: id },
      });

      res.json({
        success: true,
        data: order,
      });
    } catch (error) {
      console.error('Error fetching order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch order',
      });
    }
  }

  async createOrder(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: errors.array(),
        });
      }

      const orderData = req.body;
      const userId = req.user?.id;
      const order = await salesRepService.createOrder(orderData, userId);

      await auditService.log({
        user_id: userId,
        action: 'POST /api/salesrep/orders',
        entity_type: 'order',
        entity_id: order.id,
        details: 'Created new order',
        metadata: { order_number: order.order_number, customer_id: order.customer_id },
      });

      res.status(201).json({
        success: true,
        data: order,
        message: 'Order created successfully',
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create order',
      });
    }
  }

  async updateOrder(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: errors.array(),
        });
      }

      const { id } = req.params;
      const orderData = req.body;
      const order = await salesRepService.updateOrder(parseInt(id), orderData);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

      await auditService.log({
        user_id: req.user?.id,
        action: `PUT /api/salesrep/orders/${id}`,
        entity_type: 'order',
        entity_id: parseInt(id),
        details: 'Updated order information',
        metadata: { order_id: id },
      });

      res.json({
        success: true,
        data: order,
        message: 'Order updated successfully',
      });
    } catch (error) {
      console.error('Error updating order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update order',
      });
    }
  }

  async updateOrderStatus(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: errors.array(),
        });
      }

      const { id } = req.params;
      const { status, notes } = req.body;
      const order = await salesRepService.updateOrderStatus(parseInt(id), status, notes);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

      await auditService.log({
        user_id: req.user?.id,
        action: `PATCH /api/salesrep/orders/${id}/status`,
        entity_type: 'order',
        entity_id: parseInt(id),
        details: `Updated order status to ${status}`,
        metadata: { order_id: id, new_status: status, notes },
      });

      res.json({
        success: true,
        data: order,
        message: 'Order status updated successfully',
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update order status',
      });
    }
  }

  async deleteOrder(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { id } = req.params;
      await salesRepService.deleteOrder(parseInt(id));

      await auditService.log({
        user_id: req.user?.id,
        action: `DELETE /api/salesrep/orders/${id}`,
        entity_type: 'order',
        entity_id: parseInt(id),
        details: 'Deleted order',
        metadata: { order_id: id },
      });

      res.json({
        success: true,
        message: 'Order deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting order:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete order',
      });
    }
  }

  // Invoices
  async getInvoices(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const filters = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await salesRepService.getInvoices(filters, { page, limit });

      await auditService.log({
        user_id: req.user?.id,
        action: 'GET /api/salesrep/invoices',
        entity_type: 'invoices',
        entity_id: null,
        details: 'Viewed invoices list',
        metadata: { filters, pagination: { page, limit } },
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching invoices:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch invoices',
      });
    }
  }

  async getInvoice(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { id } = req.params;
      const invoice = await salesRepService.getInvoice(parseInt(id));

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      await auditService.log({
        user_id: req.user?.id,
        action: `GET /api/salesrep/invoices/${id}`,
        entity_type: 'invoice',
        entity_id: parseInt(id),
        details: 'Viewed invoice details',
        metadata: { invoice_id: id },
      });

      res.json({
        success: true,
        data: invoice,
      });
    } catch (error) {
      console.error('Error fetching invoice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch invoice',
      });
    }
  }

  async createInvoice(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: errors.array(),
        });
      }

      const invoiceData = req.body;
      const userId = req.user?.id;
      const invoice = await salesRepService.createInvoice(invoiceData, userId);

      await auditService.log({
        user_id: userId,
        action: 'POST /api/salesrep/invoices',
        entity_type: 'invoice',
        entity_id: invoice.id,
        details: 'Generated new invoice',
        metadata: { invoice_number: invoice.invoice_number, order_id: invoice.order_id },
      });

      res.status(201).json({
        success: true,
        data: invoice,
        message: 'Invoice generated successfully',
      });
    } catch (error) {
      console.error('Error creating invoice:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate invoice',
      });
    }
  }

  async sendInvoice(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { id } = req.params;
      const invoice = await salesRepService.sendInvoice(parseInt(id));

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: 'Invoice not found',
        });
      }

      await auditService.log({
        user_id: req.user?.id,
        action: `POST /api/salesrep/invoices/${id}/send`,
        entity_type: 'invoice',
        entity_id: parseInt(id),
        details: 'Sent invoice to customer',
        metadata: { invoice_id: id, invoice_number: invoice.invoice_number },
      });

      res.json({
        success: true,
        data: invoice,
        message: 'Invoice sent successfully',
      });
    } catch (error) {
      console.error('Error sending invoice:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send invoice',
      });
    }
  }

  // Payments
  async getPayments(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const filters = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await salesRepService.getPayments(filters, { page, limit });

      await auditService.log({
        user_id: req.user?.id,
        action: 'GET /api/salesrep/payments',
        entity_type: 'payments',
        entity_id: null,
        details: 'Viewed payments list',
        metadata: { filters, pagination: { page, limit } },
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching payments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payments',
      });
    }
  }

  async getPayment(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { id } = req.params;
      const payment = await salesRepService.getPayment(parseInt(id));

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: 'Payment not found',
        });
      }

      await auditService.log({
        user_id: req.user?.id,
        action: `GET /api/salesrep/payments/${id}`,
        entity_type: 'payment',
        entity_id: parseInt(id),
        details: 'Viewed payment details',
        metadata: { payment_id: id },
      });

      res.json({
        success: true,
        data: payment,
      });
    } catch (error) {
      console.error('Error fetching payment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch payment',
      });
    }
  }

  async createPayment(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: errors.array(),
        });
      }

      const paymentData = req.body;
      const userId = req.user?.id;
      const payment = await salesRepService.createPayment(paymentData, userId);

      await auditService.log({
        user_id: userId,
        action: 'POST /api/salesrep/payments',
        entity_type: 'payment',
        entity_id: payment.id,
        details: 'Recorded new payment',
        metadata: { payment_number: payment.payment_number, amount: payment.amount, invoice_id: payment.invoice_id },
      });

      res.status(201).json({
        success: true,
        data: payment,
        message: 'Payment recorded successfully',
      });
    } catch (error) {
      console.error('Error creating payment:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record payment',
      });
    }
  }

  // Deliveries
  async getDeliveries(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const filters = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await salesRepService.getDeliveries(filters, { page, limit });

      await auditService.log({
        user_id: req.user?.id,
        action: 'GET /api/salesrep/deliveries',
        entity_type: 'deliveries',
        entity_id: null,
        details: 'Viewed deliveries list',
        metadata: { filters, pagination: { page, limit } },
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching deliveries:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch deliveries',
      });
    }
  }

  async getDelivery(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { id } = req.params;
      const delivery = await salesRepService.getDelivery(parseInt(id));

      if (!delivery) {
        return res.status(404).json({
          success: false,
          error: 'Delivery not found',
        });
      }

      await auditService.log({
        user_id: req.user?.id,
        action: `GET /api/salesrep/deliveries/${id}`,
        entity_type: 'delivery',
        entity_id: parseInt(id),
        details: 'Viewed delivery details',
        metadata: { delivery_id: id },
      });

      res.json({
        success: true,
        data: delivery,
      });
    } catch (error) {
      console.error('Error fetching delivery:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch delivery',
      });
    }
  }

  async createDelivery(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: errors.array(),
        });
      }

      const deliveryData = req.body;
      const userId = req.user?.id;
      const delivery = await salesRepService.createDelivery(deliveryData, userId);

      await auditService.log({
        user_id: userId,
        action: 'POST /api/salesrep/deliveries',
        entity_type: 'delivery',
        entity_id: delivery.id,
        details: 'Scheduled new delivery',
        metadata: { delivery_number: delivery.delivery_number, order_id: delivery.order_id },
      });

      res.status(201).json({
        success: true,
        data: delivery,
        message: 'Delivery scheduled successfully',
      });
    } catch (error) {
      console.error('Error creating delivery:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to schedule delivery',
      });
    }
  }

  async updateDelivery(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: errors.array(),
        });
      }

      const { id } = req.params;
      const deliveryData = req.body;
      const delivery = await salesRepService.updateDelivery(parseInt(id), deliveryData);

      if (!delivery) {
        return res.status(404).json({
          success: false,
          error: 'Delivery not found',
        });
      }

      await auditService.log({
        user_id: req.user?.id,
        action: `PUT /api/salesrep/deliveries/${id}`,
        entity_type: 'delivery',
        entity_id: parseInt(id),
        details: 'Updated delivery information',
        metadata: { delivery_id: id },
      });

      res.json({
        success: true,
        data: delivery,
        message: 'Delivery updated successfully',
      });
    } catch (error) {
      console.error('Error updating delivery:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update delivery',
      });
    }
  }

  async updateDeliveryStatus(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: errors.array(),
        });
      }

      const { id } = req.params;
      const { status, notes } = req.body;
      const delivery = await salesRepService.updateDeliveryStatus(parseInt(id), status);

      if (!delivery) {
        return res.status(404).json({
          success: false,
          error: 'Delivery not found',
        });
      }

      await auditService.log({
        user_id: req.user?.id,
        action: `PATCH /api/salesrep/deliveries/${id}/status`,
        entity_type: 'delivery',
        entity_id: parseInt(id),
        details: `Updated delivery status to ${status}`,
        metadata: { delivery_id: id, new_status: status, notes },
      });

      res.json({
        success: true,
        data: delivery,
        message: 'Delivery status updated successfully',
      });
    } catch (error) {
      console.error('Error updating delivery status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update delivery status',
      });
    }
  }

  // Notifications
  async getNotifications(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const filters = req.query;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await salesRepService.getNotifications(filters, { page, limit });

      await auditService.log({
        user_id: req.user?.id,
        action: 'GET /api/salesrep/notifications',
        entity_type: 'notifications',
        entity_id: null,
        details: 'Viewed notifications list',
        metadata: { filters, pagination: { page, limit } },
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch notifications',
      });
    }
  }

  async markNotificationAsRead(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { id } = req.params;
      const notification = await salesRepService.markNotificationAsRead(parseInt(id));

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
        });
      }

      await auditService.log({
        user_id: req.user?.id,
        action: `PATCH /api/salesrep/notifications/${id}/read`,
        entity_type: 'notification',
        entity_id: parseInt(id),
        details: 'Marked notification as read',
        metadata: { notification_id: id },
      });

      res.json({
        success: true,
        data: notification,
        message: 'Notification marked as read',
      });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark notification as read',
      });
    }
  }

  async markAllNotificationsAsRead(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const userId = req.user?.id;
      await salesRepService.markAllNotificationsAsRead(userId);

      await auditService.log({
        user_id: userId,
        action: 'PATCH /api/salesrep/notifications/mark-all-read',
        entity_type: 'notifications',
        entity_id: null,
        details: 'Marked all notifications as read',
        metadata: { user_id: userId },
      });

      res.json({
        success: true,
        message: 'All notifications marked as read',
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark all notifications as read',
      });
    }
  }

  async deleteNotification(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { id } = req.params;
      await salesRepService.deleteNotification(parseInt(id));

      await auditService.log({
        user_id: req.user?.id,
        action: `DELETE /api/salesrep/notifications/${id}`,
        entity_type: 'notification',
        entity_id: parseInt(id),
        details: 'Deleted notification',
        metadata: { notification_id: id },
      });

      res.json({
        success: true,
        message: 'Notification deleted successfully',
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete notification',
      });
    }
  }

  // Reports
  async getReports(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const { report_type, date_from, date_to } = req.query;
      const reports = await salesRepService.getReports(
        report_type as string,
        date_from as string,
        date_to as string
      );

      await auditService.log({
        user_id: req.user?.id,
        action: 'GET /api/salesrep/reports',
        entity_type: 'reports',
        entity_id: null,
        details: 'Viewed reports list',
        metadata: { report_type, date_from, date_to },
      });

      res.json({
        success: true,
        data: reports,
      });
    } catch (error) {
      console.error('Error fetching reports:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch reports',
      });
    }
  }

  async generateReport(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          message: errors.array(),
        });
      }

      const { report_type, date_from, date_to } = req.body;
      const userId = req.user?.id;
      const report = await salesRepService.generateReport(report_type, date_from, date_to, userId);

      await auditService.log({
        user_id: userId,
        action: 'POST /api/salesrep/reports/generate',
        entity_type: 'report',
        entity_id: report.id,
        details: 'Generated new report',
        metadata: { report_type, date_range: { from: date_from, to: date_to } },
      });

      res.status(201).json({
        success: true,
        data: report,
        message: 'Report generated successfully',
      });
    } catch (error) {
      console.error('Error generating report:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate report',
      });
    }
  }

  async exportReport(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { format = 'pdf' } = req.query;

      // For now, return a placeholder response
      // In a real implementation, you would generate the actual PDF/Excel/CSV file
      const report = await salesRepService.getReports().then(reports =>
        reports.find(r => r.id === parseInt(id))
      );

      if (!report) {
        return res.status(404).json({
          success: false,
          error: 'Report not found',
        });
      }

      await auditService.log({
        user_id: req.user?.id,
        action: `GET /api/salesrep/reports/${id}/export`,
        entity_type: 'report',
        entity_id: parseInt(id),
        details: `Exported report in ${format} format`,
        metadata: { report_id: id, format },
      });

      // Set appropriate headers based on format
      const headers: Record<string, string> = {
        pdf: 'application/pdf',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        csv: 'text/csv',
      };

      res.setHeader('Content-Type', headers[format as string] || 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename="report-${id}.${format}"`);

      // For now, return JSON data
      // In a real implementation, you would generate the actual file content
      res.json({
        success: true,
        data: report,
        message: `Report exported as ${format}`,
      });
    } catch (error) {
      console.error('Error exporting report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export report',
      });
    }
  }
}

export default new SalesRepController();

