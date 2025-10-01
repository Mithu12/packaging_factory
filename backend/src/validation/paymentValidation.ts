import Joi from 'joi';

export const createInvoiceSchema = Joi.object({
  purchase_order_id: Joi.number().integer().positive().optional().allow(null),
  supplier_id: Joi.number().integer().positive().required(),
  invoice_date: Joi.date().iso().required(),
  due_date: Joi.date().iso().required(),
  total_amount: Joi.number().positive().precision(2).required(),
  terms: Joi.string().max(50).optional().allow(null, ''),
  notes: Joi.string().max(1000).optional().allow(null, '')
});

export const updateInvoiceSchema = Joi.object({
  purchase_order_id: Joi.number().integer().positive().optional().allow(null),
  supplier_id: Joi.number().integer().positive().optional(),
  invoice_date: Joi.date().iso().optional(),
  due_date: Joi.date().iso().optional(),
  total_amount: Joi.number().positive().precision(2).optional(),
  terms: Joi.string().max(50).optional().allow(null, ''),
  notes: Joi.string().max(1000).optional().allow(null, ''),
  status: Joi.string().valid('pending', 'partial', 'paid', 'overdue', 'cancelled').optional()
});

export const createPaymentSchema = Joi.object({
  invoice_id: Joi.number().integer().positive().optional().allow(null),
  supplier_id: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().precision(2).required(),
  outstanding_amount: Joi.number().positive().precision(2).optional(),
  payment_date: Joi.date().iso().required(),
  payment_method: Joi.string().max(50).required(),
  reference: Joi.string().max(100).optional().allow(null, ''),
  notes: Joi.string().max(1000).optional().allow(null, ''),
  created_by: Joi.string().max(100).optional().allow(null, '')
});

export const updatePaymentSchema = Joi.object({
  invoice_id: Joi.number().integer().positive().optional().allow(null),
  supplier_id: Joi.number().integer().positive().optional(),
  amount: Joi.number().positive().precision(2).optional(),
  payment_date: Joi.date().iso().optional(),
  payment_method: Joi.string().max(50).optional(),
  reference: Joi.string().max(100).optional().allow(null, ''),
  notes: Joi.string().max(1000).optional().allow(null, ''),
  created_by: Joi.string().max(100).optional().allow(null, ''),
  status: Joi.string().valid('pending', 'completed', 'failed', 'cancelled').optional()
});

export const invoiceQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().max(255).optional().allow(''),
  supplier_id: Joi.number().integer().positive().optional(),
  purchase_order_id: Joi.number().integer().positive().optional(),
  status: Joi.string().valid('pending', 'partial', 'paid', 'overdue', 'cancelled').optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  due_date_from: Joi.date().iso().optional(),
  due_date_to: Joi.date().iso().optional(),
  sortBy: Joi.string().valid('invoice_date', 'due_date', 'total_amount', 'outstanding_amount', 'status', 'invoice_number', 'created_at', 'supplier_name').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional()
});

export const paymentQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().max(255).optional().allow(''),
  supplier_id: Joi.number().integer().positive().optional(),
  invoice_id: Joi.number().integer().positive().optional(),
  status: Joi.string().valid('pending', 'completed', 'failed', 'cancelled').optional(),
  payment_method: Joi.string().max(50).optional(),
  start_date: Joi.date().iso().optional(),
  end_date: Joi.date().iso().optional(),
  sortBy: Joi.string().valid('payment_date', 'amount', 'status', 'payment_number', 'payment_method', 'created_at', 'supplier_name').optional(),
  sortOrder: Joi.string().valid('asc', 'desc').optional()
});
