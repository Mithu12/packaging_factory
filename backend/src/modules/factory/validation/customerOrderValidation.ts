import Joi from 'joi';

// Address validation schema
const addressSchema = Joi.object({
  street: Joi.string().max(255).required(),
  city: Joi.string().max(100).required(),
  state: Joi.string().max(100).required(),
  postal_code: Joi.string().max(20).required(),
  country: Joi.string().max(100).required(),
  contact_name: Joi.string().max(255).optional().allow(''),
  contact_phone: Joi.string().max(20).optional().allow(''),
});

// Order line item validation schema
const orderLineItemSchema = Joi.object({
  product_id: Joi.string().uuid().required(),
  quantity: Joi.number().positive().required(),
  unit_price: Joi.number().min(0).precision(2).required(),
  discount_percentage: Joi.number().min(0).max(100).precision(2).optional(),
  specifications: Joi.string().max(1000).optional().allow(''),
  delivery_date: Joi.date().iso().optional(),
  is_optional: Joi.boolean().optional().default(false),
});

// Create customer order validation schema
export const createCustomerOrderSchema = Joi.object({
  customer_id: Joi.string().uuid().required(),
  required_date: Joi.date().iso().greater('now').required(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').required(),
  notes: Joi.string().max(2000).optional().allow(''),
  terms: Joi.string().max(2000).optional().allow(''),
  payment_terms: Joi.string().valid('net_15', 'net_30', 'net_45', 'net_60', 'cash', 'advance').required(),
  shipping_address: addressSchema.required(),
  billing_address: addressSchema.required(),
  line_items: Joi.array().items(orderLineItemSchema).min(1).required(),
}).custom((value, helpers) => {
  // Validate that all delivery dates are before or equal to required date
  const requiredDate = new Date(value.required_date);
  for (const item of value.line_items) {
    if (item.delivery_date && new Date(item.delivery_date) > requiredDate) {
      return helpers.error('custom.deliveryDateAfterRequired');
    }
  }
  return value;
}, 'Delivery date validation').messages({
  'custom.deliveryDateAfterRequired': 'Line item delivery date cannot be after order required date'
});

// Update order line item validation schema
const updateOrderLineItemSchema = Joi.object({
  id: Joi.string().uuid().optional(),
  product_id: Joi.string().uuid().required(),
  quantity: Joi.number().positive().required(),
  unit_price: Joi.number().min(0).precision(2).required(),
  discount_percentage: Joi.number().min(0).max(100).precision(2).optional(),
  specifications: Joi.string().max(1000).optional().allow(''),
  delivery_date: Joi.date().iso().optional(),
  is_optional: Joi.boolean().optional(),
});

// Update customer order validation schema
export const updateCustomerOrderSchema = Joi.object({
  required_date: Joi.date().iso().greater('now').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  notes: Joi.string().max(2000).optional().allow(''),
  terms: Joi.string().max(2000).optional().allow(''),
  payment_terms: Joi.string().valid('net_15', 'net_30', 'net_45', 'net_60', 'cash', 'advance').optional(),
  shipping_address: addressSchema.optional(),
  billing_address: addressSchema.optional(),
  line_items: Joi.array().items(updateOrderLineItemSchema).min(1).optional(),
}).min(1); // At least one field must be provided

// Order query parameters validation schema
export const orderQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional().default(1),
  limit: Joi.number().integer().min(1).max(100).optional().default(20),
  search: Joi.string().max(255).optional().allow(''),
  status: Joi.string().valid('draft', 'pending', 'quoted', 'approved', 'rejected', 'in_production', 'completed', 'shipped').optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').optional(),
  customer_id: Joi.string().uuid().optional(),
  date_from: Joi.date().iso().optional(),
  date_to: Joi.date().iso().optional(),
  sales_person: Joi.string().max(255).optional(),
  sort_by: Joi.string().valid('order_date', 'required_date', 'total_value', 'customer_name').optional().default('order_date'),
  sort_order: Joi.string().valid('asc', 'desc').optional().default('desc'),
}).custom((value, helpers) => {
  // Validate date range
  if (value.date_from && value.date_to && new Date(value.date_from) > new Date(value.date_to)) {
    return helpers.error('custom.invalidDateRange');
  }
  return value;
}, 'Date range validation').messages({
  'custom.invalidDateRange': 'date_from cannot be after date_to'
});

// Approve order validation schema
export const approveOrderSchema = Joi.object({
  order_id: Joi.string().uuid().required(),
  approved: Joi.boolean().required(),
  notes: Joi.string().max(1000).optional().allow(''),
});

// Update order status validation schema
export const updateOrderStatusSchema = Joi.object({
  order_id: Joi.string().uuid().required(),
  status: Joi.string().valid('draft', 'pending', 'quoted', 'approved', 'rejected', 'in_production', 'completed', 'shipped').required(),
  notes: Joi.string().max(1000).optional().allow(''),
});

// Order ID parameter validation
export const orderIdSchema = Joi.object({
  id: Joi.string().uuid().required(),
});

// Bulk operations validation
export const bulkUpdateOrderStatusSchema = Joi.object({
  order_ids: Joi.array().items(Joi.string().uuid()).min(1).max(50).required(),
  status: Joi.string().valid('draft', 'pending', 'quoted', 'approved', 'rejected', 'in_production', 'completed', 'shipped').required(),
  notes: Joi.string().max(1000).optional().allow(''),
});

// Export order validation schema
export const exportOrdersSchema = Joi.object({
  format: Joi.string().valid('csv', 'excel', 'pdf').optional().default('csv'),
  status: Joi.string().valid('draft', 'pending', 'quoted', 'approved', 'rejected', 'in_production', 'completed', 'shipped').optional(),
  date_from: Joi.date().iso().optional(),
  date_to: Joi.date().iso().optional(),
  customer_id: Joi.string().uuid().optional(),
}).custom((value, helpers) => {
  // Validate date range
  if (value.date_from && value.date_to && new Date(value.date_from) > new Date(value.date_to)) {
    return helpers.error('custom.invalidDateRange');
  }
  return value;
}, 'Date range validation').messages({
  'custom.invalidDateRange': 'date_from cannot be after date_to'
});
