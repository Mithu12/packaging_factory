import Joi from 'joi';

// Create return validation
export const validateCreateReturn = Joi.object({
  original_order_id: Joi.number().integer().positive().required(),
  return_type: Joi.string().valid('full', 'partial').required(),
  reason: Joi.string().valid(
    'defective_product',
    'wrong_product', 
    'customer_change_mind',
    'damaged_in_transit',
    'not_as_described',
    'duplicate_order',
    'quality_issue',
    'expired_product',
    'other'
  ).required(),
  refund_method: Joi.string().valid(
    'cash',
    'card',
    'store_credit',
    'original_method',
    'bank_transfer'
  ).optional(),
  processing_fee: Joi.number().min(0).precision(2).optional(),
  notes: Joi.string().max(500).optional().allow(''),
  return_location: Joi.string().max(100).optional().allow(''),
  items: Joi.array().min(1).items(
    Joi.object({
      original_line_item_id: Joi.number().integer().positive().required(),
      returned_quantity: Joi.number().positive().precision(2).required(),
      refund_unit_price: Joi.number().min(0).precision(2).optional(),
      item_condition: Joi.string().valid(
        'good',
        'damaged',
        'defective',
        'opened',
        'expired'
      ).default('good'),
      restockable: Joi.boolean().default(true),
      restock_fee: Joi.number().min(0).precision(2).default(0),
      notes: Joi.string().max(200).optional().allow('')
    })
  ).required()
});

// Process return validation (approve/reject)
export const validateProcessReturn = Joi.object({
  return_status: Joi.string().valid('approved', 'rejected').required(),
  authorization_notes: Joi.string().max(500).optional().allow(''),
  refund_method: Joi.string().valid(
    'cash',
    'card',
    'store_credit',
    'original_method',
    'bank_transfer'
  ).optional(),
  processing_fee: Joi.number().min(0).precision(2).optional(),
  inventory_actions: Joi.array().items(
    Joi.object({
      return_item_id: Joi.number().integer().positive().required(),
      adjustment_type: Joi.string().valid(
        'return_restock',
        'return_damaged',
        'return_write_off'
      ).required(),
      adjustment_reason: Joi.string().max(200).optional().allow('')
    })
  ).optional()
});

// Refund transaction validation
export const validateRefundTransaction = Joi.object({
  transaction_type: Joi.string().valid(
    'cash_refund',
    'card_refund',
    'store_credit',
    'bank_transfer'
  ).required(),
  amount: Joi.number().positive().precision(2).required(),
  transaction_reference: Joi.string().max(100).optional().allow(''),
  notes: Joi.string().max(300).optional().allow('')
});

// Return query parameters validation
export const validateReturnQuery = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().max(100).optional().allow(''),
  return_status: Joi.string().valid(
    'pending',
    'approved',
    'completed',
    'rejected',
    'cancelled'
  ).optional(),
  return_type: Joi.string().valid('full', 'partial').optional(),
  reason: Joi.string().valid(
    'defective_product',
    'wrong_product',
    'customer_change_mind',
    'damaged_in_transit',
    'not_as_described',
    'duplicate_order',
    'quality_issue',
    'expired_product',
    'other'
  ).optional(),
  customer_id: Joi.number().integer().positive().optional(),
  processed_by: Joi.number().integer().positive().optional(),
  date_from: Joi.date().iso().optional(),
  date_to: Joi.date().iso().min(Joi.ref('date_from')).optional(),
  sortBy: Joi.string().valid(
    'return_date',
    'return_number',
    'total_refund_amount',
    'return_status'
  ).default('return_date'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

// Update return status validation
export const validateUpdateReturnStatus = Joi.object({
  return_status: Joi.string().valid(
    'pending',
    'approved',
    'completed',
    'rejected',
    'cancelled'
  ).required(),
  notes: Joi.string().max(500).optional().allow('')
});

// Return eligibility check validation
export const validateReturnEligibilityParams = Joi.object({
  orderId: Joi.number().integer().positive().required()
});

// Customer returns query validation
export const validateCustomerReturnsQuery = Joi.object({
  customerId: Joi.number().integer().positive().required(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  return_status: Joi.string().valid(
    'pending',
    'approved',
    'completed',
    'rejected',
    'cancelled'
  ).optional(),
  date_from: Joi.date().iso().optional(),
  date_to: Joi.date().iso().min(Joi.ref('date_from')).optional()
});

// Return stats query validation
export const validateReturnStatsQuery = Joi.object({
  date_from: Joi.date().iso().optional(),
  date_to: Joi.date().iso().min(Joi.ref('date_from')).optional(),
  customer_id: Joi.number().integer().positive().optional(),
  return_status: Joi.string().valid(
    'pending',
    'approved',
    'completed',
    'rejected',
    'cancelled'
  ).optional(),
  group_by: Joi.string().valid('day', 'week', 'month').default('day')
});
