import express, { NextFunction, Request, Response } from 'express';
import { InvoiceMediator } from "@/mediators/payments/InvoiceMediator";
import { PaymentMediator } from "@/mediators/payments/PaymentMediator";
import { serializeSuccessResponse } from "@/utils/responseHelper";
import expressAsyncHandler from "express-async-handler";
import { MyLogger } from "@/utils/new-logger";
import Joi from 'joi';

const router = express.Router();

// Import validation schemas
import {
  createInvoiceSchema,
  updateInvoiceSchema,
  createPaymentSchema,
  updatePaymentSchema,
  invoiceQuerySchema,
  paymentQuerySchema
} from '@/validation/paymentValidation';

// Validation middleware
const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let action = 'Validate Request Body'
    try {
      MyLogger.info(action, { endpoint: req.path, method: req.method })
      const { error, value } = schema.validate(req.body);
      if (error) {
        MyLogger.warn(action, { endpoint: req.path, method: req.method, validationErrors: error.details })
        return res.status(400).json({
          error: {
            message: 'Validation error',
            details: error.details.map((detail: any) => detail.message)
          }
        });
      }
      req.body = value;
      MyLogger.success(action, { endpoint: req.path, method: req.method })
      return next();
    } catch (err: any) {
      MyLogger.error(action, err, { endpoint: req.path, method: req.method })
      throw err;
    }
  };
};

const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let action = 'Validate Query Parameters'
    try {
      MyLogger.info(action, { endpoint: req.path, method: req.method, query: req.query })
      const { error, value } = schema.validate(req.query);
      if (error) {
        MyLogger.warn(action, { endpoint: req.path, method: req.method, validationErrors: error.details })
        return res.status(400).json({
          error: {
            message: 'Validation error',
            details: error.details.map((detail: any) => detail.message)
          }
        });
      }
      req.query = value;
      MyLogger.success(action, { endpoint: req.path, method: req.method })
      return next();
    } catch (err: any) {
      MyLogger.error(action, err, { endpoint: req.path, method: req.method })
      throw err;
    }
  };
};

// ==================== INVOICE ROUTES ====================

// GET /api/payments/invoices - Get invoices with filtering and pagination
router.get('/invoices', validateQuery(invoiceQuerySchema), expressAsyncHandler(async (req, res, next) => {
  let action = 'GET /api/payments/invoices'
  try {
    MyLogger.info(action, { query: req.query })
    const invoices = await InvoiceMediator.getInvoices(req.query);
    MyLogger.success(action, { count: invoices.length })
    serializeSuccessResponse(res, invoices, 'SUCCESS')
  } catch (error: any) {
    MyLogger.error(action, error, { query: req.query })
    throw error;
  }
}));

// GET /api/payments/invoices/stats - Get invoice statistics
router.get('/invoices/stats', expressAsyncHandler(async (req, res, next) => {
  let action = 'GET /api/payments/invoices/stats'
  try {
    MyLogger.info(action)
    const stats = await InvoiceMediator.getInvoiceStats();
    MyLogger.success(action, stats)
    serializeSuccessResponse(res, stats, 'SUCCESS')
  } catch (error: any) {
    MyLogger.error(action, error)
    throw error;
  }
}));

// GET /api/payments/invoices/:id - Get specific invoice
router.get('/invoices/:id', expressAsyncHandler(async (req, res, next) => {
  let action = 'GET /api/payments/invoices/:id'
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new Error('Invalid invoice ID');
    }
    
    MyLogger.info(action, { invoiceId: id })
    const invoice = await InvoiceMediator.getInvoiceById(id);
    
    if (!invoice) {
      return res.status(404).json({
        error: {
          message: 'Invoice not found'
        }
      });
    }
    
    MyLogger.success(action, { invoiceId: id, invoiceNumber: invoice.invoice_number })
    serializeSuccessResponse(res, invoice, 'SUCCESS')
  } catch (error: any) {
    MyLogger.error(action, error, { invoiceId: req.params.id })
    throw error;
  }
}));

// POST /api/payments/invoices - Create new invoice
router.post('/invoices', validateRequest(createInvoiceSchema), expressAsyncHandler(async (req, res, next) => {
  let action = 'POST /api/payments/invoices'
  try {
    MyLogger.info(action, { supplierId: req.body.supplier_id, totalAmount: req.body.total_amount })
    const invoice = await InvoiceMediator.createInvoice(req.body);
    MyLogger.success(action, { invoiceId: invoice.id, invoiceNumber: invoice.invoice_number })
    serializeSuccessResponse(res, invoice, 'SUCCESS')
  } catch (error: any) {
    MyLogger.error(action, error, { supplierId: req.body.supplier_id })
    throw error;
  }
}));

// PUT /api/payments/invoices/:id - Update invoice
router.put('/invoices/:id', validateRequest(updateInvoiceSchema), expressAsyncHandler(async (req, res, next) => {
  let action = 'PUT /api/payments/invoices/:id'
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new Error('Invalid invoice ID');
    }
    
    MyLogger.info(action, { invoiceId: id })
    const invoice = await InvoiceMediator.updateInvoice(id, req.body);
    MyLogger.success(action, { invoiceId: id, invoiceNumber: invoice.invoice_number })
    serializeSuccessResponse(res, invoice, 'SUCCESS')
  } catch (error: any) {
    MyLogger.error(action, error, { invoiceId: req.params.id })
    throw error;
  }
}));

// DELETE /api/payments/invoices/:id - Delete invoice
router.delete('/invoices/:id', expressAsyncHandler(async (req, res, next) => {
  let action = 'DELETE /api/payments/invoices/:id'
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new Error('Invalid invoice ID');
    }
    
    MyLogger.info(action, { invoiceId: id })
    await InvoiceMediator.deleteInvoice(id);
    MyLogger.success(action, { invoiceId: id })
    serializeSuccessResponse(res, { message: 'Invoice deleted successfully' }, 'SUCCESS')
  } catch (error: any) {
    MyLogger.error(action, error, { invoiceId: req.params.id })
    throw error;
  }
}));

// ==================== PAYMENT ROUTES ====================

// GET /api/payments - Get payments with filtering and pagination
router.get('/', validateQuery(paymentQuerySchema), expressAsyncHandler(async (req, res, next) => {
  let action = 'GET /api/payments'
  try {
    MyLogger.info(action, { query: req.query })
    const payments = await PaymentMediator.getPayments(req.query);
    MyLogger.success(action, { count: payments.length })
    serializeSuccessResponse(res, payments, 'SUCCESS')
  } catch (error: any) {
    MyLogger.error(action, error, { query: req.query })
    throw error;
  }
}));

// GET /api/payments/stats - Get payment statistics
router.get('/stats', expressAsyncHandler(async (req, res, next) => {
  let action = 'GET /api/payments/stats'
  try {
    MyLogger.info(action)
    const stats = await PaymentMediator.getPaymentStats();
    MyLogger.success(action, stats)
    serializeSuccessResponse(res, stats, 'SUCCESS')
  } catch (error: any) {
    MyLogger.error(action, error)
    throw error;
  }
}));

// GET /api/payments/:id - Get specific payment
router.get('/:id', expressAsyncHandler(async (req, res, next) => {
  let action = 'GET /api/payments/:id'
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new Error('Invalid payment ID');
    }
    
    MyLogger.info(action, { paymentId: id })
    const payment = await PaymentMediator.getPaymentById(id);
    
    if (!payment) {
      return res.status(404).json({
        error: {
          message: 'Payment not found'
        }
      });
    }
    
    MyLogger.success(action, { paymentId: id, paymentNumber: payment.payment_number })
    serializeSuccessResponse(res, payment, 'SUCCESS')
  } catch (error: any) {
    MyLogger.error(action, error, { paymentId: req.params.id })
    throw error;
  }
}));

// POST /api/payments - Create new payment
router.post('/', validateRequest(createPaymentSchema), expressAsyncHandler(async (req, res, next) => {
  let action = 'POST /api/payments'
  try {
    MyLogger.info(action, { supplierId: req.body.supplier_id, amount: req.body.amount })
    const payment = await PaymentMediator.createPayment(req.body);
    MyLogger.success(action, { paymentId: payment.id, paymentNumber: payment.payment_number })
    serializeSuccessResponse(res, payment, 'SUCCESS')
  } catch (error: any) {
    MyLogger.error(action, error, { supplierId: req.body.supplier_id })
    throw error;
  }
}));

// PUT /api/payments/:id - Update payment
router.put('/:id', validateRequest(updatePaymentSchema), expressAsyncHandler(async (req, res, next) => {
  let action = 'PUT /api/payments/:id'
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new Error('Invalid payment ID');
    }
    
    MyLogger.info(action, { paymentId: id })
    const payment = await PaymentMediator.updatePayment(id, req.body);
    MyLogger.success(action, { paymentId: id, paymentNumber: payment.payment_number })
    serializeSuccessResponse(res, payment, 'SUCCESS')
  } catch (error: any) {
    MyLogger.error(action, error, { paymentId: req.params.id })
    throw error;
  }
}));

// DELETE /api/payments/:id - Delete payment
router.delete('/:id', expressAsyncHandler(async (req, res, next) => {
  let action = 'DELETE /api/payments/:id'
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      throw new Error('Invalid payment ID');
    }
    
    MyLogger.info(action, { paymentId: id })
    await PaymentMediator.deletePayment(id);
    MyLogger.success(action, { paymentId: id })
    serializeSuccessResponse(res, { message: 'Payment deleted successfully' }, 'SUCCESS')
  } catch (error: any) {
    MyLogger.error(action, error, { paymentId: req.params.id })
    throw error;
  }
}));

export default router;
