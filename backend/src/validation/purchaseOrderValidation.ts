import Joi from 'joi';

// Validation schema for creating a purchase order
export const createPurchaseOrderSchema = Joi.object({
  supplier_id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Supplier ID must be a number',
      'number.integer': 'Supplier ID must be an integer',
      'number.positive': 'Supplier ID must be positive',
      'any.required': 'Supplier ID is required'
    }),
  
  expected_delivery_date: Joi.date().iso().required()
    .messages({
      'date.base': 'Expected delivery date must be a valid date',
      'date.format': 'Expected delivery date must be in ISO format (YYYY-MM-DD)',
      'any.required': 'Expected delivery date is required'
    }),
  
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').default('normal')
    .messages({
      'any.only': 'Priority must be one of: low, normal, high, urgent'
    }),
  
  payment_terms: Joi.string().max(50).optional()
    .messages({
      'string.max': 'Payment terms cannot exceed 50 characters'
    }),
  
  delivery_terms: Joi.string().max(50).optional()
    .messages({
      'string.max': 'Delivery terms cannot exceed 50 characters'
    }),
  
  department: Joi.string().max(100).optional()
    .messages({
      'string.max': 'Department cannot exceed 100 characters'
    }),
  
  project: Joi.string().max(100).optional()
    .messages({
      'string.max': 'Project cannot exceed 100 characters'
    }),
  
  notes: Joi.string().max(1000).optional()
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters'
    }),
  
  line_items: Joi.array().items(
    Joi.object({
      product_id: Joi.number().integer().positive().required()
        .messages({
          'number.base': 'Product ID must be a number',
          'number.integer': 'Product ID must be an integer',
          'number.positive': 'Product ID must be positive',
          'any.required': 'Product ID is required'
        }),
      
      quantity: Joi.number().positive().required()
        .messages({
          'number.base': 'Quantity must be a number',
          'number.positive': 'Quantity must be positive',
          'any.required': 'Quantity is required'
        }),
      
      unit_price: Joi.number().min(0).required()
        .messages({
          'number.base': 'Unit price must be a number',
          'number.min': 'Unit price cannot be negative',
          'any.required': 'Unit price is required'
        }),
      
      description: Joi.string().max(500).optional()
        .messages({
          'string.max': 'Description cannot exceed 500 characters'
        })
    })
  ).min(1).required()
    .messages({
      'array.min': 'At least one line item is required',
      'any.required': 'Line items are required'
    })
});

// Validation schema for updating a purchase order
export const updatePurchaseOrderSchema = Joi.object({
  supplier_id: Joi.number().integer().positive().optional()
    .messages({
      'number.base': 'Supplier ID must be a number',
      'number.integer': 'Supplier ID must be an integer',
      'number.positive': 'Supplier ID must be positive'
    }),
  
  expected_delivery_date: Joi.date().iso().optional()
    .messages({
      'date.base': 'Expected delivery date must be a valid date',
      'date.format': 'Expected delivery date must be in ISO format (YYYY-MM-DD)'
    }),
  
  actual_delivery_date: Joi.date().iso().optional()
    .messages({
      'date.base': 'Actual delivery date must be a valid date',
      'date.format': 'Actual delivery date must be in ISO format (YYYY-MM-DD)'
    }),
  
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional()
    .messages({
      'any.only': 'Priority must be one of: low, normal, high, urgent'
    }),
  
  payment_terms: Joi.string().max(50).optional()
    .messages({
      'string.max': 'Payment terms cannot exceed 50 characters'
    }),
  
  delivery_terms: Joi.string().max(50).optional()
    .messages({
      'string.max': 'Delivery terms cannot exceed 50 characters'
    }),
  
  department: Joi.string().max(100).optional()
    .messages({
      'string.max': 'Department cannot exceed 100 characters'
    }),
  
  project: Joi.string().max(100).optional()
    .messages({
      'string.max': 'Project cannot exceed 100 characters'
    }),
  
  notes: Joi.string().max(1000).optional()
    .messages({
      'string.max': 'Notes cannot exceed 1000 characters'
    }),
  
  line_items: Joi.array().items(
    Joi.object({
      id: Joi.number().integer().positive().optional()
        .messages({
          'number.base': 'Line item ID must be a number',
          'number.integer': 'Line item ID must be an integer',
          'number.positive': 'Line item ID must be positive'
        }),
      
      product_id: Joi.number().integer().positive().required()
        .messages({
          'number.base': 'Product ID must be a number',
          'number.integer': 'Product ID must be an integer',
          'number.positive': 'Product ID must be positive',
          'any.required': 'Product ID is required'
        }),
      
      quantity: Joi.number().positive().required()
        .messages({
          'number.base': 'Quantity must be a number',
          'number.positive': 'Quantity must be positive',
          'any.required': 'Quantity is required'
        }),
      
      unit_price: Joi.number().min(0).required()
        .messages({
          'number.base': 'Unit price must be a number',
          'number.min': 'Unit price cannot be negative',
          'any.required': 'Unit price is required'
        }),
      
      description: Joi.string().max(500).optional()
        .messages({
          'string.max': 'Description cannot exceed 500 characters'
        })
    })
  ).min(1).optional()
    .messages({
      'array.min': 'At least one line item is required'
    })
});

// Validation schema for updating purchase order status
export const updatePurchaseOrderStatusSchema = Joi.object({
  status: Joi.string().valid('draft', 'pending', 'approved', 'sent', 'partially_received', 'received', 'cancelled').required()
    .messages({
      'any.only': 'Status must be one of: draft, pending, approved, sent, partially_received, received, cancelled',
      'any.required': 'Status is required'
    }),
  
  notes: Joi.string().max(500).optional()
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    })
});

// Validation schema for receiving goods
export const receiveGoodsSchema = Joi.object({
  line_items: Joi.array().items(
    Joi.object({
      line_item_id: Joi.number().integer().positive().required()
        .messages({
          'number.base': 'Line item ID must be a number',
          'number.integer': 'Line item ID must be an integer',
          'number.positive': 'Line item ID must be positive',
          'any.required': 'Line item ID is required'
        }),
      
      received_quantity: Joi.number().positive().required()
        .messages({
          'number.base': 'Received quantity must be a number',
          'number.positive': 'Received quantity must be positive',
          'any.required': 'Received quantity is required'
        }),
      
      notes: Joi.string().max(200).optional()
        .messages({
          'string.max': 'Notes cannot exceed 200 characters'
        })
    })
  ).min(1).required()
    .messages({
      'array.min': 'At least one line item is required',
      'any.required': 'Line items are required'
    }),
  
  received_date: Joi.date().iso().optional()
    .messages({
      'date.base': 'Received date must be a valid date',
      'date.format': 'Received date must be in ISO format (YYYY-MM-DD)'
    }),
  
  notes: Joi.string().max(500).optional()
    .messages({
      'string.max': 'Notes cannot exceed 500 characters'
    })
});

// Validation schema for query parameters
export const purchaseOrderQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1)
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  
  limit: Joi.number().integer().min(1).max(100).default(10)
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    }),
  
  search: Joi.string().max(100).optional()
    .messages({
      'string.max': 'Search term cannot exceed 100 characters'
    }),
  
  status: Joi.string().valid('draft', 'pending', 'approved', 'sent', 'partially_received', 'received', 'cancelled').optional()
    .messages({
      'any.only': 'Status must be one of: draft, pending, approved, sent, partially_received, received, cancelled'
    }),
  
  supplier_id: Joi.number().integer().positive().optional()
    .messages({
      'number.base': 'Supplier ID must be a number',
      'number.integer': 'Supplier ID must be an integer',
      'number.positive': 'Supplier ID must be positive'
    }),
  
  priority: Joi.string().valid('low', 'normal', 'high', 'urgent').optional()
    .messages({
      'any.only': 'Priority must be one of: low, normal, high, urgent'
    }),
  
  start_date: Joi.date().iso().optional()
    .messages({
      'date.base': 'Start date must be a valid date',
      'date.format': 'Start date must be in ISO format (YYYY-MM-DD)'
    }),
  
  end_date: Joi.date().iso().optional()
    .messages({
      'date.base': 'End date must be a valid date',
      'date.format': 'End date must be in ISO format (YYYY-MM-DD)'
    }),
  
  sortBy: Joi.string().valid('id', 'po_number', 'order_date', 'expected_delivery_date', 'total_amount', 'created_at', 'updated_at').default('created_at')
    .messages({
      'any.only': 'Sort by must be one of: id, po_number, order_date, expected_delivery_date, total_amount, created_at, updated_at'
    }),
  
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
    .messages({
      'any.only': 'Sort order must be either asc or desc'
    })
});
