import Joi from 'joi';

// Create customer validation schema
export const createCustomerSchema = Joi.object({
  name: Joi.string().min(2).max(255).required().messages({
    'string.empty': 'Customer name is required',
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must not exceed 255 characters',
  }),
  email: Joi.string().email().max(255).optional().allow(null, '').messages({
    'string.email': 'Invalid email format',
    'string.max': 'Email must not exceed 255 characters',
  }),
  phone: Joi.string().max(50).optional().allow(null, '').messages({
    'string.max': 'Phone must not exceed 50 characters',
  }),
  address: Joi.string().max(500).optional().allow(null, '').messages({
    'string.max': 'Address must not exceed 500 characters',
  }),
  city: Joi.string().max(100).optional().allow(null, '').messages({
    'string.max': 'City must not exceed 100 characters',
  }),
  state: Joi.string().max(100).optional().allow(null, '').messages({
    'string.max': 'State must not exceed 100 characters',
  }),
  postal_code: Joi.string().max(20).optional().allow(null, '').messages({
    'string.max': 'Postal code must not exceed 20 characters',
  }),
  credit_limit: Joi.number().min(0).precision(2).optional().default(0).messages({
    'number.min': 'Credit limit must be non-negative',
    'number.base': 'Credit limit must be a number',
  }),
});

// Update customer validation schema
export const updateCustomerSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Customer ID must be a number',
    'number.integer': 'Customer ID must be an integer',
    'number.positive': 'Customer ID must be positive',
    'any.required': 'Customer ID is required',
  }),
  name: Joi.string().min(2).max(255).optional().messages({
    'string.min': 'Name must be at least 2 characters',
    'string.max': 'Name must not exceed 255 characters',
  }),
  email: Joi.string().email().max(255).optional().allow(null, '').messages({
    'string.email': 'Invalid email format',
    'string.max': 'Email must not exceed 255 characters',
  }),
  phone: Joi.string().max(50).optional().allow(null, '').messages({
    'string.max': 'Phone must not exceed 50 characters',
  }),
  address: Joi.string().max(500).optional().allow(null, '').messages({
    'string.max': 'Address must not exceed 500 characters',
  }),
  city: Joi.string().max(100).optional().allow(null, '').messages({
    'string.max': 'City must not exceed 100 characters',
  }),
  state: Joi.string().max(100).optional().allow(null, '').messages({
    'string.max': 'State must not exceed 100 characters',
  }),
  postal_code: Joi.string().max(20).optional().allow(null, '').messages({
    'string.max': 'Postal code must not exceed 20 characters',
  }),
  credit_limit: Joi.number().min(0).precision(2).optional().messages({
    'number.min': 'Credit limit must be non-negative',
    'number.base': 'Credit limit must be a number',
  }),
}).min(1).messages({
  'object.min': 'At least one field must be provided for update',
});

// Customer filters validation schema
export const customerFiltersSchema = Joi.object({
  search: Joi.string().max(255).optional().allow('').messages({
    'string.max': 'Search query must not exceed 255 characters',
  }),
  city: Joi.string().max(100).optional().allow('').messages({
    'string.max': 'City filter must not exceed 100 characters',
  }),
  state: Joi.string().max(100).optional().allow('').messages({
    'string.max': 'State filter must not exceed 100 characters',
  }),
  credit_limit_min: Joi.number().min(0).optional().messages({
    'number.min': 'Credit limit minimum must be non-negative',
    'number.base': 'Credit limit minimum must be a number',
  }),
  credit_limit_max: Joi.number().min(0).optional().messages({
    'number.min': 'Credit limit maximum must be non-negative',
    'number.base': 'Credit limit maximum must be a number',
  }),
  balance_min: Joi.number().min(0).optional().messages({
    'number.min': 'Balance minimum must be non-negative',
    'number.base': 'Balance minimum must be a number',
  }),
  balance_max: Joi.number().min(0).optional().messages({
    'number.min': 'Balance maximum must be non-negative',
    'number.base': 'Balance maximum must be a number',
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
});

// Parameter validation schemas
export const customerIdSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    'number.base': 'Customer ID must be a number',
    'number.integer': 'Customer ID must be an integer',
    'number.positive': 'Customer ID must be positive',
    'any.required': 'Customer ID is required',
  }),
});

