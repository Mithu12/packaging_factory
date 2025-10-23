import Joi from 'joi';

// Create payment validation schema
export const createPaymentSchema = Joi.object({
  invoice_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Invoice ID must be a number',
    'number.integer': 'Invoice ID must be an integer',
    'number.positive': 'Invoice ID must be positive',
    'any.required': 'Invoice ID is required',
  }),
  amount: Joi.number().positive().precision(2).required().messages({
    'number.base': 'Amount must be a number',
    'number.positive': 'Amount must be positive',
    'number.precision': 'Amount must have at most 2 decimal places',
  }),
  payment_method: Joi.string().valid('cash', 'bank_transfer', 'cheque', 'credit_card').required().messages({
    'any.only': 'Payment method must be one of: cash, bank_transfer, cheque, credit_card',
    'any.required': 'Payment method is required',
  }),
  reference_number: Joi.string().max(100).optional().allow(null, '').messages({
    'string.max': 'Reference number must not exceed 100 characters',
  }),
  notes: Joi.string().max(2000).optional().allow(null, '').messages({
    'string.max': 'Notes must not exceed 2000 characters',
  }),
});

// Payment filters validation schema
export const paymentFiltersSchema = Joi.object({
  customer_id: Joi.number().integer().positive().optional().messages({
    'number.base': 'Customer ID must be a number',
    'number.integer': 'Customer ID must be an integer',
    'number.positive': 'Customer ID must be positive',
  }),
  payment_method: Joi.string().valid('cash', 'bank_transfer', 'cheque', 'credit_card').optional().messages({
    'any.only': 'Payment method must be one of: cash, bank_transfer, cheque, credit_card',
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
export const paymentIdSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Payment ID must be a number',
    'number.integer': 'Payment ID must be an integer',
    'number.positive': 'Payment ID must be positive',
    'any.required': 'Payment ID is required',
  }),
});

