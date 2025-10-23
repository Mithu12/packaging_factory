import Joi from 'joi';

// Create invoice validation schema
export const createInvoiceSchema = Joi.object({
  order_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Order ID must be a number',
    'number.integer': 'Order ID must be an integer',
    'number.positive': 'Order ID must be positive',
    'any.required': 'Order ID is required',
  }),
});

// Send invoice validation schema (for body)
export const sendInvoiceSchema = Joi.object({
  // No body validation needed for send invoice
});

// Invoice filters validation schema
export const invoiceFiltersSchema = Joi.object({
  customer_id: Joi.number().integer().positive().optional().messages({
    'number.base': 'Customer ID must be a number',
    'number.integer': 'Customer ID must be an integer',
    'number.positive': 'Customer ID must be positive',
  }),
  status: Joi.string().valid('draft', 'sent', 'paid', 'overdue', 'cancelled').optional().messages({
    'any.only': 'Status must be one of: draft, sent, paid, overdue, cancelled',
  }),
  date_from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({
    'string.pattern.base': 'Date must be in YYYY-MM-DD format',
  }),
  date_to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({
    'string.pattern.base': 'Date must be in YYYY-MM-DD format',
  }),
  min_amount: Joi.number().min(0).optional().messages({
    'number.base': 'Minimum amount must be a number',
    'number.min': 'Minimum amount must be non-negative',
  }),
  max_amount: Joi.number().min(0).optional().messages({
    'number.base': 'Maximum amount must be a number',
    'number.min': 'Maximum amount must be non-negative',
  }),
  overdue_only: Joi.boolean().optional().messages({
    'boolean.base': 'Overdue only must be a boolean',
  }),
  page: Joi.number().integer().min(1).optional().default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1',
  }),
  limit: Joi.number().integer().min(1).max(100).optional().default(10).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit must not exceed 100',
  }),
}).custom((value, helpers) => {
  // Validate date range
  if (value.date_from && value.date_to && new Date(value.date_from) > new Date(value.date_to)) {
    return helpers.error('custom.invalidDateRange');
  }
  return value;
}, 'Date range validation').messages({
  'custom.invalidDateRange': 'date_from cannot be after date_to',
});

// Parameter validation schemas
export const invoiceIdSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Invoice ID must be a number',
    'number.integer': 'Invoice ID must be an integer',
    'number.positive': 'Invoice ID must be positive',
    'any.required': 'Invoice ID is required',
  }),
});

