import { Request, Response, NextFunction } from 'express';
import { CreateDeliveryMediator } from '../mediators/deliveries/CreateDelivery.mediator';
import { GetDeliveriesMediator } from '../mediators/deliveries/GetDeliveries.mediator';
import { CancelDeliveryMediator } from '../mediators/deliveries/CancelDelivery.mediator';
import { GetCustomerOrderInfoMediator } from '../mediators/customerOrders/GetCustomerOrderInfo.mediator';
import { SalesInvoiceMediator } from '../mediators/salesInvoices/SalesInvoiceMediator';
import { MyLogger } from '@/utils/new-logger';
import { serializeSuccessResponse, createError } from '@/utils/responseHelper';

class DeliveriesController {
  /** POST /api/factory/customer-orders/:id/deliveries */
  async createDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'POST /api/factory/customer-orders/:id/deliveries';
      const { id } = req.params;
      const userId = req.user?.user_id;
      if (!userId) throw createError('User not authenticated', 401);

      MyLogger.info(action, { orderId: id, userId, body: req.body });
      const result = await CreateDeliveryMediator.createPartialDelivery(id, req.body, userId);

      res.status(201);
      serializeSuccessResponse(res, result, 'Delivery created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/factory/customer-orders/customers/:customerId/deliveries
   * Customer-level entry point: no primary order, items may span multiple
   * orders belonging to this customer.
   */
  async createCustomerDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'POST /api/factory/customer-orders/customers/:customerId/deliveries';
      const { customerId } = req.params;
      const userId = req.user?.user_id;
      if (!userId) throw createError('User not authenticated', 401);

      MyLogger.info(action, { customerId, userId, body: req.body });

      const result = await CreateDeliveryMediator.createPartialDelivery(
        null,
        { ...req.body, factory_customer_id: Number(customerId) },
        userId
      );

      res.status(201);
      serializeSuccessResponse(res, result, 'Delivery created successfully');
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/factory/customer-orders/:id/deliveries */
  async listDeliveriesForOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const deliveries = await GetDeliveriesMediator.listDeliveriesByOrder(id);
      serializeSuccessResponse(res, deliveries, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/factory/customer-orders/deliveries */
  async listAllDeliveries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params = {
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
        search: (req.query.search as string) || undefined,
        status: (req.query.status as any) || undefined,
        factory_customer_id: (req.query.factory_customer_id as string) || undefined,
        factory_id: (req.query.factory_id as string) || undefined,
        date_from: (req.query.date_from as string) || undefined,
        date_to: (req.query.date_to as string) || undefined,
        sort_by: (req.query.sort_by as any) || undefined,
        sort_order: (req.query.sort_order as any) || undefined,
      };
      const result = await GetDeliveriesMediator.listAllDeliveries(params);
      serializeSuccessResponse(res, result, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/factory/customer-orders/customers/:customerId/deliveries */
  async listDeliveriesForCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { customerId } = req.params;
      const deliveries = await GetDeliveriesMediator.listDeliveriesByCustomer(customerId);
      serializeSuccessResponse(res, deliveries, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/factory/customer-orders/deliveries/:deliveryId */
  async getDeliveryById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { deliveryId } = req.params;
      const delivery = await GetDeliveriesMediator.getDeliveryById(deliveryId);
      if (!delivery) {
        res.status(404);
        serializeSuccessResponse(res, null, 'Delivery not found');
        return;
      }
      serializeSuccessResponse(res, delivery, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/factory/customer-orders/deliveries/:deliveryId/challan */
  async exportDeliveryChallan(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'GET /api/factory/customer-orders/deliveries/:deliveryId/challan';
      const { deliveryId } = req.params;
      MyLogger.info(action, { deliveryId });

      const delivery = await GetDeliveriesMediator.getDeliveryById(deliveryId);
      if (!delivery) {
        res.status(404).json({ success: false, message: 'Delivery not found', data: null });
        return;
      }

      // Customer-level (multi-order) deliveries have no primary order — fall back
      // to the first touched order so the PDF has an order context to render against.
      const orderIdForPdf =
        delivery.customer_order_id ?? delivery.touched_orders?.[0]?.order_id;
      if (!orderIdForPdf) {
        res.status(404).json({ success: false, message: 'No order context for delivery', data: null });
        return;
      }
      const order = await GetCustomerOrderInfoMediator.getCustomerOrderById(
        String(orderIdForPdf),
        req.user?.user_id
      );
      if (!order) {
        res.status(404).json({ success: false, message: 'Customer order not found', data: null });
        return;
      }

      const { PDFGenerator } = await import('@/services/pdf-generator');
      const pdfBuffer = await PDFGenerator.generateChallanPDF(order, delivery);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="challan-${delivery.delivery_number}.pdf"`
      );
      res.send(pdfBuffer);
      MyLogger.success(action, { deliveryId, pdfGenerated: true });
    } catch (error) {
      next(error);
    }
  }

  /** GET /api/factory/customer-orders/deliveries/:deliveryId/invoice */
  async exportDeliveryInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'GET /api/factory/customer-orders/deliveries/:deliveryId/invoice';
      const { deliveryId } = req.params;
      MyLogger.info(action, { deliveryId });

      const delivery = await GetDeliveriesMediator.getDeliveryById(deliveryId);
      if (!delivery) {
        res.status(404).json({ success: false, message: 'Delivery not found', data: null });
        return;
      }

      const orderIdForPdf =
        delivery.customer_order_id ?? delivery.touched_orders?.[0]?.order_id;
      if (!orderIdForPdf) {
        res.status(404).json({ success: false, message: 'No order context for delivery', data: null });
        return;
      }
      const order = await GetCustomerOrderInfoMediator.getCustomerOrderById(
        String(orderIdForPdf),
        req.user?.user_id
      );
      if (!order) {
        res.status(404).json({ success: false, message: 'Customer order not found', data: null });
        return;
      }

      const { PDFGenerator } = await import('@/services/pdf-generator');
      const pdfBuffer = await PDFGenerator.generateInvoicePDF(order, delivery);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="invoice-${delivery.invoice_number ?? delivery.delivery_number}.pdf"`
      );
      res.send(pdfBuffer);
      MyLogger.success(action, { deliveryId, pdfGenerated: true });
    } catch (error) {
      next(error);
    }
  }

  /** POST /api/factory/customer-orders/deliveries/:deliveryId/cancel */
  async cancelDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { deliveryId } = req.params;
      const userId = req.user?.user_id;
      if (!userId) throw createError('User not authenticated', 401);

      const delivery = await CancelDeliveryMediator.cancelDelivery(
        deliveryId,
        userId,
        req.body?.reason
      );
      serializeSuccessResponse(res, delivery, 'Delivery cancelled');
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/factory/customer-orders/deliveries/:deliveryId/generate-invoice
   * Backfill invoice for an existing delivery that lacks one (rare; normally
   * deliveries auto-create their invoice).
   */
  async generateInvoiceForDelivery(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { deliveryId } = req.params;
      const userId = req.user?.user_id;
      if (!userId) throw createError('User not authenticated', 401);

      const invoice = await SalesInvoiceMediator.createInvoiceFromDelivery(deliveryId, userId);
      res.status(201);
      serializeSuccessResponse(res, invoice, 'Invoice generated successfully');
    } catch (error) {
      next(error);
    }
  }

  /** PATCH /api/factory/customer-orders/deliveries/:deliveryId/bill-submitted */
  async setBillSubmitted(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { deliveryId } = req.params;
      const userId = req.user?.user_id;
      if (!userId) throw createError('User not authenticated', 401);

      const submitted = req.body?.bill_submitted !== false; // default true
      const delivery = await GetDeliveriesMediator.setBillSubmitted(deliveryId, userId, submitted);
      if (!delivery) throw createError('Delivery not found', 404);
      serializeSuccessResponse(res, delivery, 'Bill submission status updated');
    } catch (error) {
      next(error);
    }
  }
}

export const deliveriesController = new DeliveriesController();
