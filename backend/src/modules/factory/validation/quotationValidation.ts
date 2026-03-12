import Joi from 'joi';

// Quotation line item validation schema
const quotationLineItemSchema = Joi.object({
  product_id: Joi.number().integer().positive().optional().allow(null),
  description: Joi.string().max(500).required(),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().max(50).optional().allow('').default('pcs'),
  unit_price: Joi.number().min(0).precision(2).required(),
});

// Create quotation validation schema
export const createQuotationSchema = Joi.object({
  factory_customer_id: Joi.number().integer().positive().required(),
  factory_id: Joi.number().integer().positive().required(),
  quotation_date: Joi.date().iso().optional(),
  valid_until: Joi.date().iso().optional(),
  notes: Joi.string().max(2000).optional().allow(''),
  terms: Joi.string().max(2000).optional().allow(''),
  reference: Joi.string().max(255).optional().allow(''),
  discount: Joi.number().min(0).precision(2).optional().default(0),
  tax_rate: Joi.number().min(0).max(100).precision(2).optional().default(0),
  line_items: Joi.array().items(quotationLineItemSchema).min(1).required(),
});

// Update quotation line item validation schema
const updateQuotationLineItemSchema = Joi.object({
  id: Joi.number().integer().positive().optional(),
  product_id: Joi.number().integer().positive().optional().allow(null),
  description: Joi.string().max(500).required(),
  quantity: Joi.number().positive().required(),
  unit: Joi.string().max(50).optional().allow('').default('pcs'),
  unit_price: Joi.number().min(0).precision(2).required(),
});

// Update quotation validation schema
export const updateQuotationSchema = Joi.object({
  factory_customer_id: Joi.number().integer().positive().optional(),
  factory_id: Joi.number().integer().positive().optional(),
  quotation_date: Joi.date().iso().optional(),
  valid_until: Joi.date().iso().optional(),
  notes: Joi.string().max(2000).optional().allow(''),
  terms: Joi.string().max(2000).optional().allow(''),
  reference: Joi.string().max(255).optional().allow(''),
  discount: Joi.number().min(0).precision(2).optional(),
  tax_rate: Joi.number().min(0).max(100).precision(2).optional(),
  status: Joi.string().valid('draft', 'sent', 'approved', 'rejected', 'expired').optional(),
  line_items: Joi.array().items(updateQuotationLineItemSchema).min(1).optional(),
}).min(1);

// Quotation query parameters validation schema
export const quotationQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  search: Joi.string().max(255).optional().allow(''),
  status: Joi.string().valid('', 'draft', 'sent', 'approved', 'rejected', 'converted', 'expired').optional(),
  factory_customer_id: Joi.number().integer().positive().optional(),
  factory_id: Joi.number().integer().positive().optional(),
  date_from: Joi.date().iso().optional(),
  date_to: Joi.date().iso().optional(),
  sort_by: Joi.string().valid('quotation_date', 'valid_until', 'total', 'factory_customer_name').optional().default('quotation_date'),
  sort_order: Joi.string().valid('asc', 'desc').optional().default('desc'),
}).custom((value, helpers) => {
  if (value.date_from && value.date_to && new Date(value.date_from) > new Date(value.date_to)) {
    return helpers.error('custom.invalidDateRange');
  }
  return value;
}, 'Date range validation').messages({
  'custom.invalidDateRange': 'date_from cannot be after date_to'
});
