import Joi from 'joi';

// Customer validation schemas
export const createCustomerSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  email: Joi.string().email().optional().allow(''),
  phone: Joi.string().max(50).optional().allow(''),
  address: Joi.string().optional().allow(''),
  city: Joi.string().max(100).optional().allow(''),
  state: Joi.string().max(100).optional().allow(''),
  zip_code: Joi.string().max(20).optional().allow(''),
  country: Joi.string().max(100).optional().allow(''),
    credit_limit: Joi.number().optional().default(0),
  date_of_birth: Joi.date().optional().allow(''),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  customer_type: Joi.string().valid('regular', 'vip', 'wholesale', 'retail', 'walk_in').default('regular'),
  opening_due: Joi.number().min(0).optional().default(0),
  notes: Joi.string().optional().allow(''),
  password: Joi.string().min(6).optional().allow(''),
  erp_access_approved: Joi.boolean().optional().default(false)
});

export const updateCustomerSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  email: Joi.string().email().optional().allow(''),
  phone: Joi.string().max(50).optional().allow(''),
  address: Joi.string().optional().allow(''),
  city: Joi.string().max(100).optional().allow(''),
  state: Joi.string().max(100).optional().allow(''),
  zip_code: Joi.string().max(20).optional().allow(''),
  country: Joi.string().max(100).optional().allow(''),
    credit_limit: Joi.number().optional().default(0),
  date_of_birth: Joi.date().optional().allow(''),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  customer_type: Joi.string().valid('regular', 'vip', 'wholesale', 'retail', 'walk_in').optional(),
  status: Joi.string().valid('active', 'inactive', 'blocked').optional(),
  opening_due: Joi.number().min(0).optional(),
  notes: Joi.string().optional().allow(''),
  erp_access_approved: Joi.boolean().optional()
});

export const customerQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().optional(),
  customer_type: Joi.string().valid('regular', 'vip', 'wholesale', 'retail', 'walk_in').optional(),
  status: Joi.string().valid('active', 'inactive', 'blocked').optional(),
  sortBy: Joi.string().valid('name', 'email', 'phone', 'customer_type', 'status', 'total_purchases', 'created_at').default('id'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc')
});

// Sales Order validation schemas
export const createSalesOrderSchema = Joi.object({
  customer_id: Joi.number().integer().positive().optional(),
  distribution_center_id: Joi.number().integer().positive().optional().allow(null),
  payment_method: Joi.string().valid('cash', 'card', 'credit', 'check', 'bank_transfer').required(),
  cash_received: Joi.number().min(0).optional(),
  due_amount: Joi.number().min(0).optional().default(0),
  notes: Joi.string().optional().allow(''),
  discount_amount: Joi.number().min(0).optional().allow(null).default(0),
  discount_percentage: Joi.number().min(0).max(100).optional().allow(null).default(0),
  tax_amount: Joi.number().min(0).optional().default(0),
  cashier_id: Joi.number().integer().positive().optional(),
  line_items: Joi.array().items(
    Joi.object({
      product_id: Joi.number().integer().positive().required(),
      quantity: Joi.number().positive().required(),
      unit_price: Joi.number().min(0).required(),
      total_price: Joi.number().min(0).optional(),
      discount_amount: Joi.number().min(0).optional().default(0),
      discount_percentage: Joi.number().min(0).max(100).optional().default(0),
      is_gift: Joi.boolean().optional().default(false)
    })
  ).min(1).required()
});

export const updateSalesOrderSchema = Joi.object({
  status: Joi.string().valid('pending', 'processing', 'completed', 'cancelled', 'refunded').optional(),
  payment_status: Joi.string().valid('pending', 'paid', 'partially_paid', 'refunded').optional(),
  payment_method: Joi.string().valid('cash', 'card', 'credit', 'check', 'bank_transfer').optional(),
  cash_received: Joi.number().min(0).optional(),
  due_amount: Joi.number().min(0).optional(),
  notes: Joi.string().optional().allow('')
});

export const salesOrderQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().optional(),
  customer_id: Joi.number().integer().positive().optional(),
  distribution_center_id: Joi.number().integer().positive().optional(),
  status: Joi.string().valid('pending', 'processing', 'completed', 'cancelled', 'refunded').optional(),
  payment_status: Joi.string().valid('pending', 'paid', 'partially_paid', 'refunded').optional(),
  payment_method: Joi.string().valid('cash', 'card', 'credit', 'check', 'bank_transfer').optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
  sortBy: Joi.string().valid('order_number', 'order_date', 'status', 'payment_status', 'total_amount', 'customer_name').default('order_date'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Sales Receipt validation schemas
export const createSalesReceiptSchema = Joi.object({
  sales_order_id: Joi.number().integer().positive().required(),
  receipt_type: Joi.string().valid('sale', 'refund', 'exchange').default('sale'),
  notes: Joi.string().optional().allow('')
});

// Pricing Rule validation schemas
export const createPricingRuleSchema = Joi.object({
  name: Joi.string().min(1).max(255).required(),
  description: Joi.string().optional().allow(''),
  product_id: Joi.number().integer().positive().optional(),
  category_id: Joi.number().integer().positive().optional(),
  rule_type: Joi.string().valid('discount', 'markup', 'fixed_price').required(),
  rule_value: Joi.number().min(0).required(),
  rule_percentage: Joi.number().min(0).max(100).optional(),
  min_quantity: Joi.number().min(1).default(1),
  max_quantity: Joi.number().min(1).optional(),
  start_date: Joi.date().required(),
  end_date: Joi.date().optional(),
  customer_type: Joi.string().valid('regular', 'vip', 'wholesale', 'retail', 'walk_in').optional(),
  priority: Joi.number().integer().min(0).default(0)
}).custom((value, helpers) => {
  // Ensure either product_id or category_id is provided, but not both
  if (!value.product_id && !value.category_id) {
    return helpers.error('custom.eitherProductOrCategory');
  }
  if (value.product_id && value.category_id) {
    return helpers.error('custom.bothProductAndCategory');
  }
  return value;
}).messages({
  'custom.eitherProductOrCategory': 'Either product_id or category_id must be provided',
  'custom.bothProductAndCategory': 'Cannot specify both product_id and category_id'
});

export const updatePricingRuleSchema = Joi.object({
  name: Joi.string().min(1).max(255).optional(),
  description: Joi.string().optional().allow(''),
  product_id: Joi.number().integer().positive().optional(),
  category_id: Joi.number().integer().positive().optional(),
  rule_type: Joi.string().valid('discount', 'markup', 'fixed_price').optional(),
  rule_value: Joi.number().min(0).optional(),
  rule_percentage: Joi.number().min(0).max(100).optional(),
  min_quantity: Joi.number().min(1).optional(),
  max_quantity: Joi.number().min(1).optional(),
  start_date: Joi.date().optional(),
  end_date: Joi.date().optional(),
  customer_type: Joi.string().valid('regular', 'vip', 'wholesale', 'retail', 'walk_in').optional(),
  is_active: Joi.boolean().optional(),
  priority: Joi.number().integer().min(0).optional()
});

export const pricingRuleQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().optional(),
  product_id: Joi.number().integer().positive().optional(),
  category_id: Joi.number().integer().positive().optional(),
  rule_type: Joi.string().valid('discount', 'markup', 'fixed_price').optional(),
  customer_type: Joi.string().valid('regular', 'vip', 'wholesale', 'retail', 'walk_in').optional(),
  is_active: Joi.boolean().optional(),
  sortBy: Joi.string().valid('name', 'rule_type', 'start_date', 'end_date', 'priority', 'created_at').default('created_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});
