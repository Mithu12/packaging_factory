import { Request, Response, NextFunction } from 'express';
import { SalesInvoiceMediator } from '../mediators/salesInvoices/SalesInvoiceMediator';
import { PDFGenerator } from '@/services/pdf-generator';
import { MyLogger } from '@/utils/new-logger';
import { serializeSuccessResponse } from '@/utils/responseHelper';
import {
  CreateSalesInvoiceRequest,
  UpdateSalesInvoiceRequest,
  RecordPaymentRequest,
  SalesInvoiceQueryParams
} from '@/types/salesInvoice';

class SalesInvoicesController {
  /**
   * Get all sales invoices
   * @route GET /api/factory/sales-invoices
   */
  async getAllSalesInvoices(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'GET /api/factory/sales-invoices';
      const userId = req.user?.user_id;

      const params: SalesInvoiceQueryParams = {
        page: req.query.page ? parseInt(req.query.page as string) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        search: req.query.search as string,
        status: req.query.status as any,
        factory_customer_id: req.query.factory_customer_id as string,
        factory_id: req.query.factory_id as string,
        date_from: req.query.date_from as string,
        date_to: req.query.date_to as string,
        overdue_only: req.query.overdue_only === 'true',
        sort_by: req.query.sort_by as any,
        sort_order: req.query.sort_order as any
      };

      MyLogger.info(action, { params, userId });

      const result = await SalesInvoiceMediator.getSalesInvoices(params, userId);

      MyLogger.success(action, { total: result.total, page: result.page });
      serializeSuccessResponse(res, result, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sales invoice by ID
   * @route GET /api/factory/sales-invoices/:id
   */
  async getSalesInvoiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'GET /api/factory/sales-invoices/:id';
      const { id } = req.params;

      MyLogger.info(action, { invoiceId: id });

      const invoice = await SalesInvoiceMediator.getSalesInvoiceById(id);

      if (!invoice) {
        res.status(404).json({
          status: 'ERROR',
          message: 'Sales invoice not found'
        });
        return;
      }

      MyLogger.success(action, { invoiceId: id });
      serializeSuccessResponse(res, invoice, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Download sales invoice as PDF
   * @route GET /api/factory/sales-invoices/:id/pdf
   */
  async downloadInvoicePDF(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'GET /api/factory/sales-invoices/:id/pdf';
      const { id } = req.params;
      const userId = req.user?.user_id || 0;

      MyLogger.info(action, { invoiceId: id });

      // Get invoice
      const invoice = await SalesInvoiceMediator.getSalesInvoiceById(id);

      if (!invoice) {
        res.status(404).json({
          status: 'ERROR',
          message: 'Sales invoice not found'
        });
        return;
      }

      // Generate PDF
      const pdfBuffer = await PDFGenerator.generateSalesInvoicePDF(invoice);

      const filename = `Invoice_${invoice.invoice_number}.pdf`;
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length);

      res.send(pdfBuffer);

      MyLogger.success(action, {
        invoiceId: id,
        invoiceNumber: invoice.invoice_number,
        filename,
        pdfSize: pdfBuffer.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create sales invoice from customer order
   * @route POST /api/factory/sales-invoices
   */
  async createSalesInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'POST /api/factory/sales-invoices';
      const userId = req.user?.user_id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const data: CreateSalesInvoiceRequest = req.body;

      MyLogger.info(action, { data, userId });

      const invoice = await SalesInvoiceMediator.createInvoiceFromOrder(data, userId);

      MyLogger.success(action, {
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number,
        totalAmount: invoice.total_amount
      });

      res.status(201);
      serializeSuccessResponse(res, invoice, 'Invoice created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update sales invoice
   * @route PUT /api/factory/sales-invoices/:id
   */
  async updateSalesInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'PUT /api/factory/sales-invoices/:id';
      const { id } = req.params;
      const userId = req.user?.user_id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const data: UpdateSalesInvoiceRequest = req.body;

      MyLogger.info(action, { invoiceId: id, data, userId });

      const invoice = await SalesInvoiceMediator.updateSalesInvoice(id, data, userId);

      MyLogger.success(action, { invoiceId: id });
      serializeSuccessResponse(res, invoice, 'Invoice updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Record payment against invoice
   * @route POST /api/factory/sales-invoices/:id/payments
   */
  async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'POST /api/factory/sales-invoices/:id/payments';
      const { id } = req.params;
      const userId = req.user?.user_id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const data: RecordPaymentRequest = {
        ...req.body,
        invoice_id: id
      };

      MyLogger.info(action, { invoiceId: id, paymentAmount: data.payment_amount, userId });

      const invoice = await SalesInvoiceMediator.recordPayment(data, userId);

      MyLogger.success(action, { invoiceId: id, paymentAmount: data.payment_amount });
      serializeSuccessResponse(res, invoice, 'Payment recorded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get sales invoice statistics
   * @route GET /api/factory/sales-invoices/stats
   */
  async getSalesInvoiceStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'GET /api/factory/sales-invoices/stats';
      const factoryId = req.query.factory_id as string;
      const factoryCustomerId = req.query.factory_customer_id as string;

      MyLogger.info(action, { factoryId, factoryCustomerId });

      const stats = await SalesInvoiceMediator.getSalesInvoiceStats(factoryId, factoryCustomerId);

      MyLogger.success(action);
      serializeSuccessResponse(res, stats, 'SUCCESS');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cancel sales invoice
   * @route POST /api/factory/sales-invoices/:id/cancel
   */
  async cancelSalesInvoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'POST /api/factory/sales-invoices/:id/cancel';
      const { id } = req.params;
      const userId = req.user?.user_id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      MyLogger.info(action, { invoiceId: id, userId });

      const invoice = await SalesInvoiceMediator.cancelInvoice(id, userId);

      MyLogger.success(action, { invoiceId: id });
      serializeSuccessResponse(res, invoice, 'Invoice cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create invoice from customer order (convenience endpoint)
   * @route POST /api/factory/customer-orders/:orderId/generate-invoice
   */
  async generateInvoiceForOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const action = 'POST /api/factory/customer-orders/:orderId/generate-invoice';
      const { orderId } = req.params;
      const userId = req.user?.user_id;

      if (!userId) {
        throw new Error('User not authenticated');
      }

      const data: CreateSalesInvoiceRequest = {
        customer_order_id: orderId,
        ...req.body
      };

      MyLogger.info(action, { orderId, userId });

      const invoice = await SalesInvoiceMediator.createInvoiceFromOrder(data, userId);

      MyLogger.success(action, {
        orderId,
        invoiceId: invoice.id,
        invoiceNumber: invoice.invoice_number
      });

      res.status(201);
      serializeSuccessResponse(res, invoice, 'Invoice generated successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const salesInvoicesController = new SalesInvoicesController();

