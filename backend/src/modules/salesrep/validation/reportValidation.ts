import Joi from 'joi';

// Generate report validation schema
export const generateReportSchema = Joi.object({
  report_type: Joi.string().valid('sales_summary', 'customer_performance', 'order_analysis', 'payment_collection').required().messages({
    'any.only': 'Report type must be one of: sales_summary, customer_performance, order_analysis, payment_collection',
    'any.required': 'Report type is required',
  }),
  date_from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Date must be in YYYY-MM-DD format',
    'any.required': 'From date is required',
  }),
  date_to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).required().messages({
    'string.pattern.base': 'Date must be in YYYY-MM-DD format',
    'any.required': 'To date is required',
  }),
}).custom((value, helpers) => {
  // Validate date range
  if (new Date(value.date_from) > new Date(value.date_to)) {
    return helpers.error('custom.invalidDateRange');
  }
  return value;
}, 'Date range validation').messages({
  'custom.invalidDateRange': 'date_from cannot be after date_to',
});

// Export report validation schema (for query)
export const exportReportSchema = Joi.object({
  format: Joi.string().valid('pdf', 'excel', 'csv').optional().default('pdf').messages({
    'any.only': 'Format must be one of: pdf, excel, csv',
  }),
});

// Report filters validation schema
export const reportFiltersSchema = Joi.object({
  report_type: Joi.string().valid('sales_summary', 'customer_performance', 'order_analysis', 'payment_collection').optional().messages({
    'any.only': 'Report type must be one of: sales_summary, customer_performance, order_analysis, payment_collection',
  }),
  date_from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({
    'string.pattern.base': 'Date must be in YYYY-MM-DD format',
  }),
  date_to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({
    'string.pattern.base': 'Date must be in YYYY-MM-DD format',
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
export const reportIdSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Report ID must be a number',
    'number.integer': 'Report ID must be an integer',
    'number.positive': 'Report ID must be positive',
    'any.required': 'Report ID is required',
  }),
});

