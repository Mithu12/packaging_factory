import { Request, Response } from 'express';
import GetCustomerInfoMediator from '../mediators/customers/GetCustomerInfo.mediator';
import AddCustomerMediator from '../mediators/customers/AddCustomer.mediator';
import UpdateCustomerMediator from '../mediators/customers/UpdateCustomer.mediator';
import DeleteCustomerMediator from '../mediators/customers/DeleteCustomer.mediator';
import GetOrderInfoMediator from '../mediators/orders/GetOrderInfo.mediator';
import AddOrderMediator from '../mediators/orders/AddOrder.mediator';
import UpdateOrderMediator from '../mediators/orders/UpdateOrder.mediator';
import DeleteOrderMediator from '../mediators/orders/DeleteOrder.mediator';
import GetNotificationInfoMediator from '../mediators/notifications/GetNotificationInfo.mediator';
import MarkNotificationAsReadMediator from '../mediators/notifications/MarkNotificationAsRead.mediator';
import DeleteNotificationMediator from '../mediators/notifications/DeleteNotification.mediator';
import GetDashboardStatsMediator from '../mediators/dashboard/GetDashboardStats.mediator';
import { ApiResponse } from '../types';

export class SalesRepController {
  // Dashboard
  async getDashboardStats(req: Request, res: Response<ApiResponse<any>>) {
    try {
      const userId = req.user?.user_id;
      const stats = await GetDashboardStatsMediator.getDashboardStats(userId);

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

      const result = await GetCustomerInfoMediator.getCustomers(filters, { page, limit });

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
      const customer = await GetCustomerInfoMediator.getCustomer(parseInt(id));

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }


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
      const customerData = req.body;
      const userId = req.user?.user_id;
      const customer = await AddCustomerMediator.createCustomer(customerData, userId);

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
      const { id } = req.params;
      const customerData = req.body;
      const customer = await UpdateCustomerMediator.updateCustomer(parseInt(id), customerData);

      if (!customer) {
        return res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
      }

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
      await DeleteCustomerMediator.deleteCustomer(parseInt(id));

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

      const result = await GetOrderInfoMediator.getOrders(filters, { page, limit });

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
      const order = await GetOrderInfoMediator.getOrder(parseInt(id));

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

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
      const orderData = req.body;
      const userId = req.user?.user_id;
      const order = await AddOrderMediator.createOrder(orderData, userId);

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
      const { id } = req.params;
      const orderData = req.body;
      const order = await UpdateOrderMediator.updateOrder(parseInt(id), orderData);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

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
      const { id } = req.params;
      const { status, notes } = req.body;
      const order = await UpdateOrderMediator.updateOrderStatus(parseInt(id), status, notes);

      if (!order) {
        return res.status(404).json({
          success: false,
          error: 'Order not found',
        });
      }

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
      await DeleteOrderMediator.deleteOrder(parseInt(id));

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
      const invoiceData = req.body;
      const userId = req.user?.user_id;
      const invoice = await salesRepService.createInvoice(invoiceData, userId);

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
      const paymentData = req.body;
      const userId = req.user?.user_id;
      const payment = await salesRepService.createPayment(paymentData, userId);

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
      const deliveryData = req.body;
      const userId = req.user?.user_id;
      const delivery = await salesRepService.createDelivery(deliveryData, userId);

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
      const { id } = req.params;
      const deliveryData = req.body;
      const delivery = await salesRepService.updateDelivery(parseInt(id), deliveryData);

      if (!delivery) {
        return res.status(404).json({
          success: false,
          error: 'Delivery not found',
        });
      }

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
      const { id } = req.params;
      const { status, notes } = req.body;
      const delivery = await salesRepService.updateDeliveryStatus(parseInt(id), status);

      if (!delivery) {
        return res.status(404).json({
          success: false,
          error: 'Delivery not found',
        });
      }

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

      const result = await GetNotificationInfoMediator.getNotifications(filters, { page, limit });

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
      const notification = await MarkNotificationAsReadMediator.markNotificationAsRead(parseInt(id));

      if (!notification) {
        return res.status(404).json({
          success: false,
          error: 'Notification not found',
        });
      }

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
      const userId = req.user?.user_id;
      await MarkNotificationAsReadMediator.markAllNotificationsAsRead(userId);

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
      await DeleteNotificationMediator.deleteNotification(parseInt(id));

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
      const { report_type, date_from, date_to } = req.body;
      const userId = req.user?.user_id;
      const report = await salesRepService.generateReport(report_type, date_from, date_to, userId);

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

