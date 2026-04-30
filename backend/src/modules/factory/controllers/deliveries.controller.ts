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

      const order = await GetCustomerOrderInfoMediator.getCustomerOrderById(
        String(delivery.customer_order_id),
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

      const order = await GetCustomerOrderInfoMediator.getCustomerOrderById(
        String(delivery.customer_order_id),
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
}

export const deliveriesController = new DeliveriesController();
