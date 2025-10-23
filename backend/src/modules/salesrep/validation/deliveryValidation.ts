import Joi from 'joi';

// Create delivery validation schema
export const createDeliverySchema = Joi.object({
  order_id: Joi.number().integer().positive().required().messages({
    'number.base': 'Order ID must be a number',
    'number.integer': 'Order ID must be an integer',
    'number.positive': 'Order ID must be positive',
    'any.required': 'Order ID is required',
  }),
  delivery_address: Joi.string().min(1).max(500).required().messages({
    'string.empty': 'Delivery address is required',
    'string.min': 'Delivery address must be at least 1 character',
    'string.max': 'Delivery address must not exceed 500 characters',
  }),
  contact_person: Joi.string().min(1).max(255).required().messages({
    'string.empty': 'Contact person is required',
    'string.min': 'Contact person must be at least 1 character',
    'string.max': 'Contact person must not exceed 255 characters',
  }),
  contact_phone: Joi.string().min(1).max(50).required().messages({
    'string.empty': 'Contact phone is required',
    'string.min': 'Contact phone must be at least 1 character',
    'string.max': 'Contact phone must not exceed 50 characters',
  }),
  tracking_number: Joi.string().max(100).optional().allow(null, '').messages({
    'string.max': 'Tracking number must not exceed 100 characters',
  }),
  courier_service: Joi.string().max(100).optional().allow(null, '').messages({
    'string.max': 'Courier service must not exceed 100 characters',
  }),
  notes: Joi.string().max(2000).optional().allow(null, '').messages({
    'string.max': 'Notes must not exceed 2000 characters',
  }),
});

// Update delivery validation schema
export const updateDeliverySchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Delivery ID must be a number',
    'number.integer': 'Delivery ID must be an integer',
    'number.positive': 'Delivery ID must be positive',
    'any.required': 'Delivery ID is required',
  }),
  delivery_address: Joi.string().min(1).max(500).optional().messages({
    'string.min': 'Delivery address must be at least 1 character',
    'string.max': 'Delivery address must not exceed 500 characters',
  }),
  contact_person: Joi.string().min(1).max(255).optional().messages({
    'string.min': 'Contact person must be at least 1 character',
    'string.max': 'Contact person must not exceed 255 characters',
  }),
  contact_phone: Joi.string().min(1).max(50).optional().messages({
    'string.min': 'Contact phone must be at least 1 character',
    'string.max': 'Contact phone must not exceed 50 characters',
  }),
  tracking_number: Joi.string().max(100).optional().allow(null, '').messages({
    'string.max': 'Tracking number must not exceed 100 characters',
  }),
  courier_service: Joi.string().max(100).optional().allow(null, '').messages({
    'string.max': 'Courier service must not exceed 100 characters',
  }),
  status: Joi.string().valid('pending', 'in_transit', 'delivered', 'cancelled').optional().messages({
    'any.only': 'Status must be one of: pending, in_transit, delivered, cancelled',
  }),
  notes: Joi.string().max(2000).optional().allow(null, '').messages({
    'string.max': 'Notes must not exceed 2000 characters',
  }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// Update delivery status validation schema
export const updateDeliveryStatusSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Delivery ID must be a number',
    'number.integer': 'Delivery ID must be an integer',
    'number.positive': 'Delivery ID must be positive',
    'any.required': 'Delivery ID is required',
  }),
  status: Joi.string().valid('pending', 'in_transit', 'delivered', 'cancelled').required().messages({
    'any.only': 'Status must be one of: pending, in_transit, delivered, cancelled',
    'any.required': 'Status is required',
  }),
  notes: Joi.string().max(1000).optional().allow(null, '').messages({
    'string.max': 'Notes must not exceed 1000 characters',
  }),
});

// Delivery filters validation schema
export const deliveryFiltersSchema = Joi.object({
  customer_id: Joi.number().integer().positive().optional().messages({
    'number.base': 'Customer ID must be a number',
    'number.integer': 'Customer ID must be an integer',
    'number.positive': 'Customer ID must be positive',
  }),
  status: Joi.string().valid('pending', 'in_transit', 'delivered', 'cancelled').optional().messages({
    'any.only': 'Status must be one of: pending, in_transit, delivered, cancelled',
  }),
  date_from: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({
    'string.pattern.base': 'Date must be in YYYY-MM-DD format',
  }),
  date_to: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional().messages({
    'string.pattern.base': 'Date must be in YYYY-MM-DD format',
  }),
  courier_service: Joi.string().max(100).optional().allow('').messages({
    'string.max': 'Courier service must not exceed 100 characters',
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
export const deliveryIdSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Delivery ID must be a number',
    'number.integer': 'Delivery ID must be an integer',
    'number.positive': 'Delivery ID must be positive',
    'any.required': 'Delivery ID is required',
  }),
});

