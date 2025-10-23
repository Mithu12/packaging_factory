import { AppDataSource } from '../../../config/database';
import {
  SalesRepCustomer,
  SalesRepOrder,
  SalesRepOrderItem,
  SalesRepInvoice,
  SalesRepPayment,
  SalesRepDelivery,
  SalesRepNotification,
  SalesRepReport,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CreateOrderRequest,
  UpdateOrderRequest,
  CreateInvoiceRequest,
  CreatePaymentRequest,
  CreateDeliveryRequest,
  UpdateDeliveryRequest,
  CustomerFilters,
  OrderFilters,
  InvoiceFilters,
  PaymentFilters,
  DeliveryFilters,
  NotificationFilters,
  PaginationParams,
  PaginatedResponse,
  DashboardStats,
} from '../types';

export class SalesRepService {
  private customerRepo = AppDataSource.getRepository(SalesRepCustomer);
  private orderRepo = AppDataSource.getRepository(SalesRepOrder);
  private orderItemRepo = AppDataSource.getRepository(SalesRepOrderItem);
  private invoiceRepo = AppDataSource.getRepository(SalesRepInvoice);
  private paymentRepo = AppDataSource.getRepository(SalesRepPayment);
  private deliveryRepo = AppDataSource.getRepository(SalesRepDelivery);
  private notificationRepo = AppDataSource.getRepository(SalesRepNotification);
  private reportRepo = AppDataSource.getRepository(SalesRepReport);

  // Customer operations
  async getCustomers(filters?: CustomerFilters, pagination?: PaginationParams): Promise<PaginatedResponse<SalesRepCustomer>> {
    const query = this.customerRepo.createQueryBuilder('customer');

    if (filters?.search) {
      query.where('(customer.name ILIKE :search OR customer.email ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }

    if (filters?.city) {
      query.andWhere('customer.city = :city', { city: filters.city });
    }

    if (filters?.state) {
      query.andWhere('customer.state = :state', { state: filters.state });
    }

    if (filters?.credit_limit_min !== undefined) {
      query.andWhere('customer.credit_limit >= :credit_limit_min', { credit_limit_min: filters.credit_limit_min });
    }

    if (filters?.credit_limit_max !== undefined) {
      query.andWhere('customer.credit_limit <= :credit_limit_max', { credit_limit_max: filters.credit_limit_max });
    }

    if (filters?.balance_min !== undefined) {
      query.andWhere('customer.current_balance >= :balance_min', { balance_min: filters.balance_min });
    }

    if (filters?.balance_max !== undefined) {
      query.andWhere('customer.current_balance <= :balance_max', { balance_max: filters.balance_max });
    }

    const total = await query.getCount();
    const totalPages = Math.ceil(total / (pagination?.limit || 10));

    if (pagination) {
      query.skip((pagination.page - 1) * pagination.limit).take(pagination.limit);
    }

    query.orderBy('customer.created_at', 'DESC');

    const data = await query.getMany();

    return {
      data,
      pagination: {
        page: pagination?.page || 1,
        limit: pagination?.limit || 10,
        total,
        total_pages: totalPages,
      },
    };
  }

  async getCustomer(id: number): Promise<SalesRepCustomer | null> {
    return await this.customerRepo.findOne({ where: { id } });
  }

  async createCustomer(data: CreateCustomerRequest, salesRepId?: number): Promise<SalesRepCustomer> {
    const customer = this.customerRepo.create({
      ...data,
      sales_rep_id: salesRepId,
    });
    return await this.customerRepo.save(customer);
  }

  async updateCustomer(id: number, data: UpdateCustomerRequest): Promise<SalesRepCustomer | null> {
    await this.customerRepo.update(id, data);
    return await this.getCustomer(id);
  }

  async deleteCustomer(id: number): Promise<void> {
    await this.customerRepo.delete(id);
  }

  // Order operations
  async getOrders(filters?: OrderFilters, pagination?: PaginationParams): Promise<PaginatedResponse<SalesRepOrder>> {
    const query = this.orderRepo.createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.items', 'items');

    if (filters?.customer_id) {
      query.andWhere('order.customer_id = :customer_id', { customer_id: filters.customer_id });
    }

    if (filters?.status) {
      query.andWhere('order.status = :status', { status: filters.status });
    }

    if (filters?.date_from) {
      query.andWhere('order.order_date >= :date_from', { date_from: filters.date_from });
    }

    if (filters?.date_to) {
      query.andWhere('order.order_date <= :date_to', { date_to: filters.date_to });
    }

    if (filters?.min_amount !== undefined) {
      query.andWhere('order.final_amount >= :min_amount', { min_amount: filters.min_amount });
    }

    if (filters?.max_amount !== undefined) {
      query.andWhere('order.final_amount <= :max_amount', { max_amount: filters.max_amount });
    }

    const total = await query.getCount();
    const totalPages = Math.ceil(total / (pagination?.limit || 10));

    if (pagination) {
      query.skip((pagination.page - 1) * pagination.limit).take(pagination.limit);
    }

    query.orderBy('order.created_at', 'DESC');

    const data = await query.getMany();

    return {
      data,
      pagination: {
        page: pagination?.page || 1,
        limit: pagination?.limit || 10,
        total,
        total_pages: totalPages,
      },
    };
  }

  async getOrder(id: number): Promise<SalesRepOrder | null> {
    return await this.orderRepo.findOne({
      where: { id },
      relations: ['customer', 'items'],
    });
  }

  async createOrder(data: CreateOrderRequest, salesRepId?: number): Promise<SalesRepOrder> {
    const order = this.orderRepo.create({
      ...data,
      order_number: await this.generateOrderNumber(),
      sales_rep_id: salesRepId,
      status: 'draft',
    });

    const savedOrder = await this.orderRepo.save(order);

    // Create order items
    if (data.items && data.items.length > 0) {
      const orderItems = data.items.map(item =>
        this.orderItemRepo.create({
          ...item,
          order_id: savedOrder.id,
          total_price: (item.quantity * item.unit_price) - item.discount,
        })
      );
      await this.orderItemRepo.save(orderItems);
    }

    return await this.getOrder(savedOrder.id) as SalesRepOrder;
  }

  async updateOrder(id: number, data: UpdateOrderRequest): Promise<SalesRepOrder | null> {
    await this.orderRepo.update(id, {
      customer_id: data.customer_id,
      discount_amount: data.discount_amount,
      tax_amount: data.tax_amount,
      notes: data.notes,
      status: data.status,
    });

    // Update order items if provided
    if (data.items) {
      await this.orderItemRepo.delete({ order_id: id });

      const orderItems = data.items.map(item =>
        this.orderItemRepo.create({
          ...item,
          order_id: id,
          total_price: (item.quantity * item.unit_price) - item.discount,
        })
      );
      await this.orderItemRepo.save(orderItems);
    }

    return await this.getOrder(id);
  }

  async updateOrderStatus(id: number, status: string, notes?: string): Promise<SalesRepOrder | null> {
    await this.orderRepo.update(id, { status });
    return await this.getOrder(id);
  }

  async deleteOrder(id: number): Promise<void> {
    await this.orderRepo.delete(id);
  }

  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.orderRepo.count({
      where: { order_date: today },
    });
    return `SR-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  // Invoice operations
  async getInvoices(filters?: InvoiceFilters, pagination?: PaginationParams): Promise<PaginatedResponse<SalesRepInvoice>> {
    const query = this.invoiceRepo.createQueryBuilder('invoice')
      .leftJoinAndSelect('invoice.order', 'order')
      .leftJoinAndSelect('order.customer', 'customer');

    if (filters?.customer_id) {
      query.andWhere('order.customer_id = :customer_id', { customer_id: filters.customer_id });
    }

    if (filters?.status) {
      query.andWhere('invoice.status = :status', { status: filters.status });
    }

    if (filters?.date_from) {
      query.andWhere('invoice.invoice_date >= :date_from', { date_from: filters.date_from });
    }

    if (filters?.date_to) {
      query.andWhere('invoice.invoice_date <= :date_to', { date_to: filters.date_to });
    }

    if (filters?.min_amount !== undefined) {
      query.andWhere('invoice.total_amount >= :min_amount', { min_amount: filters.min_amount });
    }

    if (filters?.max_amount !== undefined) {
      query.andWhere('invoice.total_amount <= :max_amount', { max_amount: filters.max_amount });
    }

    if (filters?.overdue_only) {
      query.andWhere('invoice.due_date < CURRENT_DATE AND invoice.status != :paid_status', {
        paid_status: 'paid'
      });
    }

    const total = await query.getCount();
    const totalPages = Math.ceil(total / (pagination?.limit || 10));

    if (pagination) {
      query.skip((pagination.page - 1) * pagination.limit).take(pagination.limit);
    }

    query.orderBy('invoice.created_at', 'DESC');

    const data = await query.getMany();

    return {
      data,
      pagination: {
        page: pagination?.page || 1,
        limit: pagination?.limit || 10,
        total,
        total_pages: totalPages,
      },
    };
  }

  async getInvoice(id: number): Promise<SalesRepInvoice | null> {
    return await this.invoiceRepo.findOne({
      where: { id },
      relations: ['order', 'order.customer'],
    });
  }

  async createInvoice(data: CreateInvoiceRequest, salesRepId?: number): Promise<SalesRepInvoice> {
    const order = await this.getOrder(data.order_id);
    if (!order) {
      throw new Error('Order not found');
    }

    const invoice = this.invoiceRepo.create({
      order_id: data.order_id,
      invoice_number: await this.generateInvoiceNumber(),
      invoice_date: new Date(),
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      status: 'draft',
      total_amount: order.final_amount,
      paid_amount: 0,
      balance_amount: order.final_amount,
      sales_rep_id: salesRepId,
    });

    const savedInvoice = await this.invoiceRepo.save(invoice);

    // Update order status to invoiced
    await this.updateOrderStatus(order.id, 'processing');

    return await this.getInvoice(savedInvoice.id) as SalesRepInvoice;
  }

  async sendInvoice(id: number): Promise<SalesRepInvoice | null> {
    await this.invoiceRepo.update(id, {
      status: 'sent',
      updated_at: new Date(),
    });
    return await this.getInvoice(id);
  }

  private async generateInvoiceNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.invoiceRepo.count({
      where: { invoice_date: today },
    });
    return `INV-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  // Payment operations
  async getPayments(filters?: PaymentFilters, pagination?: PaginationParams): Promise<PaginatedResponse<SalesRepPayment>> {
    const query = this.paymentRepo.createQueryBuilder('payment')
      .leftJoinAndSelect('payment.invoice', 'invoice')
      .leftJoinAndSelect('invoice.order', 'order')
      .leftJoinAndSelect('order.customer', 'customer');

    if (filters?.customer_id) {
      query.andWhere('order.customer_id = :customer_id', { customer_id: filters.customer_id });
    }

    if (filters?.payment_method) {
      query.andWhere('payment.payment_method = :payment_method', { payment_method: filters.payment_method });
    }

    if (filters?.date_from) {
      query.andWhere('payment.payment_date >= :date_from', { date_from: filters.date_from });
    }

    if (filters?.date_to) {
      query.andWhere('payment.payment_date <= :date_to', { date_to: filters.date_to });
    }

    if (filters?.min_amount !== undefined) {
      query.andWhere('payment.amount >= :min_amount', { min_amount: filters.min_amount });
    }

    if (filters?.max_amount !== undefined) {
      query.andWhere('payment.amount <= :max_amount', { max_amount: filters.max_amount });
    }

    const total = await query.getCount();
    const totalPages = Math.ceil(total / (pagination?.limit || 10));

    if (pagination) {
      query.skip((pagination.page - 1) * pagination.limit).take(pagination.limit);
    }

    query.orderBy('payment.created_at', 'DESC');

    const data = await query.getMany();

    return {
      data,
      pagination: {
        page: pagination?.page || 1,
        limit: pagination?.limit || 10,
        total,
        total_pages: totalPages,
      },
    };
  }

  async getPayment(id: number): Promise<SalesRepPayment | null> {
    return await this.paymentRepo.findOne({
      where: { id },
      relations: ['invoice', 'invoice.order', 'invoice.order.customer'],
    });
  }

  async createPayment(data: CreatePaymentRequest, salesRepId?: number): Promise<SalesRepPayment> {
    const payment = this.paymentRepo.create({
      ...data,
      payment_number: await this.generatePaymentNumber(),
      sales_rep_id: salesRepId,
    });

    const savedPayment = await this.paymentRepo.save(payment);

    // Update invoice amounts
    const invoice = await this.getInvoice(data.invoice_id);
    if (invoice) {
      const newPaidAmount = invoice.paid_amount + data.amount;
      const newBalanceAmount = invoice.total_amount - newPaidAmount;

      await this.invoiceRepo.update(invoice.id, {
        paid_amount: newPaidAmount,
        balance_amount: newBalanceAmount,
        status: newBalanceAmount <= 0 ? 'paid' : invoice.status,
      });
    }

    return await this.getPayment(savedPayment.id) as SalesRepPayment;
  }

  private async generatePaymentNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.paymentRepo.count({
      where: { payment_date: today },
    });
    return `PAY-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  // Delivery operations
  async getDeliveries(filters?: DeliveryFilters, pagination?: PaginationParams): Promise<PaginatedResponse<SalesRepDelivery>> {
    const query = this.deliveryRepo.createQueryBuilder('delivery')
      .leftJoinAndSelect('delivery.order', 'order')
      .leftJoinAndSelect('order.customer', 'customer');

    if (filters?.customer_id) {
      query.andWhere('order.customer_id = :customer_id', { customer_id: filters.customer_id });
    }

    if (filters?.status) {
      query.andWhere('delivery.status = :status', { status: filters.status });
    }

    if (filters?.date_from) {
      query.andWhere('delivery.delivery_date >= :date_from', { date_from: filters.date_from });
    }

    if (filters?.date_to) {
      query.andWhere('delivery.delivery_date <= :date_to', { date_to: filters.date_to });
    }

    if (filters?.courier_service) {
      query.andWhere('delivery.courier_service = :courier_service', { courier_service: filters.courier_service });
    }

    const total = await query.getCount();
    const totalPages = Math.ceil(total / (pagination?.limit || 10));

    if (pagination) {
      query.skip((pagination.page - 1) * pagination.limit).take(pagination.limit);
    }

    query.orderBy('delivery.created_at', 'DESC');

    const data = await query.getMany();

    return {
      data,
      pagination: {
        page: pagination?.page || 1,
        limit: pagination?.limit || 10,
        total,
        total_pages: totalPages,
      },
    };
  }

  async getDelivery(id: number): Promise<SalesRepDelivery | null> {
    return await this.deliveryRepo.findOne({
      where: { id },
      relations: ['order', 'order.customer'],
    });
  }

  async createDelivery(data: CreateDeliveryRequest, salesRepId?: number): Promise<SalesRepDelivery> {
    const delivery = this.deliveryRepo.create({
      ...data,
      delivery_number: await this.generateDeliveryNumber(),
      status: 'pending',
      sales_rep_id: salesRepId,
    });

    const savedDelivery = await this.deliveryRepo.save(delivery);

    // Update order status to shipped
    await this.updateOrderStatus(data.order_id, 'shipped');

    return await this.getDelivery(savedDelivery.id) as SalesRepDelivery;
  }

  async updateDelivery(id: number, data: UpdateDeliveryRequest): Promise<SalesRepDelivery | null> {
    await this.deliveryRepo.update(id, data);
    return await this.getDelivery(id);
  }

  async updateDeliveryStatus(id: number, status: string): Promise<SalesRepDelivery | null> {
    await this.deliveryRepo.update(id, { status });

    // If delivered, update order status
    if (status === 'delivered') {
      const delivery = await this.getDelivery(id);
      if (delivery) {
        await this.updateOrderStatus(delivery.order_id, 'delivered');
      }
    }

    return await this.getDelivery(id);
  }

  private async generateDeliveryNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const count = await this.deliveryRepo.count({
      where: { delivery_date: today },
    });
    return `DEL-${dateStr}-${String(count + 1).padStart(4, '0')}`;
  }

  // Notification operations
  async getNotifications(filters?: NotificationFilters, pagination?: PaginationParams): Promise<PaginatedResponse<SalesRepNotification>> {
    const query = this.notificationRepo.createQueryBuilder('notification');

    if (filters?.unread_only) {
      query.andWhere('notification.is_read = false');
    }

    if (filters?.type) {
      query.andWhere('notification.type = :type', { type: filters.type });
    }

    const total = await query.getCount();
    const totalPages = Math.ceil(total / (pagination?.limit || 10));

    if (pagination) {
      query.skip((pagination.page - 1) * pagination.limit).take(pagination.limit);
    }

    query.orderBy('notification.created_at', 'DESC');

    const data = await query.getMany();

    return {
      data,
      pagination: {
        page: pagination?.page || 1,
        limit: pagination?.limit || 10,
        total,
        total_pages: totalPages,
      },
    };
  }

  async markNotificationAsRead(id: number): Promise<SalesRepNotification | null> {
    await this.notificationRepo.update(id, { is_read: true });
    return await this.notificationRepo.findOne({ where: { id } });
  }

  async markAllNotificationsAsRead(salesRepId?: number): Promise<void> {
    const query = this.notificationRepo.createQueryBuilder()
      .update()
      .set({ is_read: true });

    if (salesRepId) {
      query.andWhere('sales_rep_id = :sales_rep_id', { sales_rep_id: salesRepId });
    }

    await query.execute();
  }

  async createNotification(data: Omit<SalesRepNotification, 'id' | 'created_at' | 'updated_at'>): Promise<SalesRepNotification> {
    const notification = this.notificationRepo.create(data);
    return await this.notificationRepo.save(notification);
  }

  async deleteNotification(id: number): Promise<void> {
    await this.notificationRepo.delete(id);
  }

  // Dashboard stats
  async getDashboardStats(salesRepId?: number): Promise<DashboardStats> {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // Total customers
    const totalCustomers = await this.customerRepo.count({
      where: salesRepId ? { sales_rep_id: salesRepId } : {},
    });

    // Active orders (not delivered or cancelled)
    const activeOrders = await this.orderRepo.count({
      where: {
        status: ['draft', 'confirmed', 'processing', 'shipped'],
        ...(salesRepId ? { sales_rep_id: salesRepId } : {}),
      },
    });

    // Pending invoices (sent but not paid)
    const pendingInvoices = await this.invoiceRepo.count({
      where: {
        status: 'sent',
        ...(salesRepId ? { sales_rep_id: salesRepId } : {}),
      },
    });

    // Overdue payments (invoices past due date and not paid)
    const overduePayments = await this.invoiceRepo.count({
      where: {
        due_date: new Date(Date.now() - 24 * 60 * 60 * 1000), // Past due
        status: ['sent', 'overdue'],
        ...(salesRepId ? { sales_rep_id: salesRepId } : {}),
      },
    });

    // Monthly sales
    const monthlySalesResult = await this.orderRepo
      .createQueryBuilder('order')
      .select('SUM(order.final_amount)', 'total')
      .where('order.order_date >= :startOfMonth', { startOfMonth })
      .andWhere('order.status != :cancelled', { cancelled: 'cancelled' })
      .andWhere(salesRepId ? 'order.sales_rep_id = :salesRepId' : '1=1', { salesRepId })
      .getRawOne();

    const monthlySales = parseFloat(monthlySalesResult?.total || '0');

    // Recent orders (last 5)
    const recentOrders = await this.getOrders(
      salesRepId ? { status: undefined } : undefined,
      { page: 1, limit: 5 }
    );

    // Upcoming deliveries (next 5)
    const upcomingDeliveries = await this.getDeliveries(
      { status: 'pending' },
      { page: 1, limit: 5 }
    );

    // Unread notifications
    const unreadNotifications = await this.notificationRepo.count({
      where: {
        is_read: false,
        ...(salesRepId ? { sales_rep_id: salesRepId } : {}),
      },
    });

    return {
      total_customers: totalCustomers,
      active_orders: activeOrders,
      pending_invoices: pendingInvoices,
      overdue_payments: overduePayments,
      monthly_sales: monthlySales,
      monthly_target: 100000, // This could be configurable per sales rep
      recent_orders: recentOrders.data,
      upcoming_deliveries: upcomingDeliveries.data,
      unread_notifications: unreadNotifications,
    };
  }

  // Report operations
  async getReports(reportType?: string, dateFrom?: string, dateTo?: string): Promise<SalesRepReport[]> {
    const query = this.reportRepo.createQueryBuilder('report');

    if (reportType) {
      query.andWhere('report.report_type = :report_type', { report_type: reportType });
    }

    if (dateFrom) {
      query.andWhere('report.date_range_from >= :date_from', { date_from: dateFrom });
    }

    if (dateTo) {
      query.andWhere('report.date_range_to <= :date_to', { date_to: dateTo });
    }

    query.orderBy('report.generated_at', 'DESC');

    return await query.getMany();
  }

  async generateReport(reportType: string, dateFrom: string, dateTo: string, generatedBy?: number): Promise<SalesRepReport> {
    // Generate report data based on type
    let reportData: any = {};

    switch (reportType) {
      case 'sales_summary':
        reportData = await this.generateSalesSummaryReport(dateFrom, dateTo);
        break;
      case 'customer_performance':
        reportData = await this.generateCustomerPerformanceReport(dateFrom, dateTo);
        break;
      case 'order_analysis':
        reportData = await this.generateOrderAnalysisReport(dateFrom, dateTo);
        break;
      case 'payment_collection':
        reportData = await this.generatePaymentCollectionReport(dateFrom, dateTo);
        break;
      default:
        throw new Error('Invalid report type');
    }

    const report = this.reportRepo.create({
      report_type: reportType,
      title: `${reportType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Report`,
      date_range_from: new Date(dateFrom),
      date_range_to: new Date(dateTo),
      data: reportData,
      generated_by: generatedBy,
    });

    return await this.reportRepo.save(report);
  }

  private async generateSalesSummaryReport(dateFrom: string, dateTo: string): Promise<any> {
    const orders = await this.orderRepo
      .createQueryBuilder('order')
      .select([
        'SUM(order.final_amount) as total_sales',
        'COUNT(*) as total_orders',
        'AVG(order.final_amount) as average_order_value',
        'order.status',
      ])
      .where('order.order_date BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .andWhere('order.status != :cancelled', { cancelled: 'cancelled' })
      .groupBy('order.status')
      .getRawMany();

    return {
      summary: orders,
      date_range: { from: dateFrom, to: dateTo },
    };
  }

  private async generateCustomerPerformanceReport(dateFrom: string, dateTo: string): Promise<any> {
    const customers = await this.customerRepo
      .createQueryBuilder('customer')
      .leftJoin('sales_rep_orders', 'order', 'order.customer_id = customer.id')
      .select([
        'customer.id',
        'customer.name',
        'customer.email',
        'COUNT(order.id) as total_orders',
        'SUM(order.final_amount) as total_revenue',
        'AVG(order.final_amount) as average_order_value',
      ])
      .where('order.order_date BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .groupBy('customer.id, customer.name, customer.email')
      .orderBy('total_revenue', 'DESC')
      .getRawMany();

    return {
      customers,
      date_range: { from: dateFrom, to: dateTo },
    };
  }

  private async generateOrderAnalysisReport(dateFrom: string, dateTo: string): Promise<any> {
    const orders = await this.orderRepo
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.items', 'items')
      .where('order.order_date BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .orderBy('order.order_date', 'DESC')
      .getMany();

    return {
      orders,
      date_range: { from: dateFrom, to: dateTo },
      total_orders: orders.length,
    };
  }

  private async generatePaymentCollectionReport(dateFrom: string, dateTo: string): Promise<any> {
    const payments = await this.paymentRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.invoice', 'invoice')
      .leftJoinAndSelect('invoice.order', 'order')
      .leftJoinAndSelect('order.customer', 'customer')
      .where('payment.payment_date BETWEEN :dateFrom AND :dateTo', { dateFrom, dateTo })
      .orderBy('payment.payment_date', 'DESC')
      .getMany();

    return {
      payments,
      date_range: { from: dateFrom, to: dateTo },
      total_payments: payments.length,
      total_amount: payments.reduce((sum, payment) => sum + parseFloat(payment.amount.toString()), 0),
    };
  }
}

export default new SalesRepService();

