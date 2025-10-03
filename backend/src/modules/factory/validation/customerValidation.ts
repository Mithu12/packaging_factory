import Joi from 'joi';

// Create customer validation schema
export const createCustomerSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  email: Joi.string().email().max(255).required(),
  phone: Joi.string().max(20).optional().allow(''),
  company: Joi.string().max(255).optional().allow(''),
  address: Joi.object({
    street: Joi.string().optional().allow(''),
    city: Joi.string().optional().allow(''),
    state: Joi.string().optional().allow(''),
    postal_code: Joi.string().optional().allow(''),
    country: Joi.string().optional().allow(''),
  }).optional(),
  credit_limit: Joi.number().min(0).optional(),
  payment_terms: Joi.string().valid('net_15', 'net_30', 'net_45', 'net_60', 'cash_on_delivery', 'advance_payment').default('net_30'),
   is_active: Joi.boolean().optional(),
});

// Update customer validation schema
export const updateCustomerSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  email: Joi.string().email().max(255).optional(),
  phone: Joi.string().max(20).optional().allow(''),
  company: Joi.string().max(255).optional().allow(''),
  address: Joi.object({
    street: Joi.string().optional().allow(''),
    city: Joi.string().optional().allow(''),
    state: Joi.string().optional().allow(''),
    postal_code: Joi.string().optional().allow(''),
    country: Joi.string().optional().allow(''),
  }).optional(),
  credit_limit: Joi.number().min(0).optional(),
  payment_terms: Joi.string().valid('net_15', 'net_30', 'net_45', 'net_60', 'cash_on_delivery', 'advance_payment').optional(),
  is_active: Joi.boolean().optional(),
});

// Customer ID validation schema
export const customerIdSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
});
