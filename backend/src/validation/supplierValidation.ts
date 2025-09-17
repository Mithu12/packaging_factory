import Joi from 'joi';

export const createSupplierSchema = Joi.object({
  name: Joi.string().min(2).max(255).required().messages({
    'string.empty': 'Company name is required',
    'string.min': 'Company name must be at least 2 characters long',
    'string.max': 'Company name cannot exceed 255 characters'
  }),
  contact_person: Joi.string().min(2).max(255).optional().messages({
    'string.min': 'Contact person name must be at least 2 characters long',
    'string.max': 'Contact person name cannot exceed 255 characters'
  }),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  email: Joi.string().email().optional().allow('').messages({
    'string.email': 'Please provide a valid email address'
  }),
  whatsapp_number: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow('').messages({
    'string.pattern.base': 'Please provide a valid WhatsApp number'
  }),
  website: Joi.string().uri().optional().messages({
    'string.uri': 'Please provide a valid website URL'
  }),
  address: Joi.string().max(500).optional().messages({
    'string.max': 'Address cannot exceed 500 characters'
  }),
  city: Joi.string().max(100).optional().messages({
    'string.max': 'City name cannot exceed 100 characters'
  }),
  state: Joi.string().max(100).optional().messages({
    'string.max': 'State name cannot exceed 100 characters'
  }),
  zip_code: Joi.string().max(20).optional().messages({
    'string.max': 'ZIP code cannot exceed 20 characters'
  }),
  country: Joi.string().max(100).optional().messages({
    'string.max': 'Country name cannot exceed 100 characters'
  }),
  category: Joi.string().max(100).optional().messages({
    'string.max': 'Category cannot exceed 100 characters'
  }),
  tax_id: Joi.string().max(100).optional().messages({
    'string.max': 'Tax ID cannot exceed 100 characters'
  }),
  vat_id: Joi.string().max(100).optional().messages({
    'string.max': 'VAT ID cannot exceed 100 characters'
  }),
  payment_terms: Joi.string().valid('net-15', 'net-30', 'net-45', 'net-60', 'cod', 'prepaid').optional().messages({
    'any.only': 'Payment terms must be one of: net-15, net-30, net-45, net-60, cod, prepaid'
  }),
  bank_name: Joi.string().max(255).optional().messages({
    'string.max': 'Bank name cannot exceed 255 characters'
  }),
  bank_account: Joi.string().max(100).optional().messages({
    'string.max': 'Bank account cannot exceed 100 characters'
  }),
  bank_routing: Joi.string().max(100).optional().messages({
    'string.max': 'Bank routing cannot exceed 100 characters'
  }),
  swift_code: Joi.string().max(20).optional().messages({
    'string.max': 'SWIFT code cannot exceed 20 characters'
  }),
  iban: Joi.string().max(50).optional().messages({
    'string.max': 'IBAN cannot exceed 50 characters'
  }),
  status: Joi.string().valid('active', 'inactive').default('active').messages({
    'any.only': 'Status must be either active or inactive'
  }),
  notes: Joi.string().max(1000).optional().messages({
    'string.max': 'Notes cannot exceed 1000 characters'
  })
});

export const updateSupplierSchema = Joi.object({
  name: Joi.string().min(2).max(255).optional().messages({
    'string.min': 'Company name must be at least 2 characters long',
    'string.max': 'Company name cannot exceed 255 characters'
  }),
  contact_person: Joi.string().min(2).max(255).optional().messages({
    'string.min': 'Contact person name must be at least 2 characters long',
    'string.max': 'Contact person name cannot exceed 255 characters'
  }),
  phone: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().messages({
    'string.pattern.base': 'Please provide a valid phone number'
  }),
  email: Joi.string().email().optional().allow('').messages({
    'string.email': 'Please provide a valid email address'
  }),
  whatsapp_number: Joi.string().pattern(/^[\+]?[1-9][\d]{0,15}$/).optional().allow('').messages({
    'string.pattern.base': 'Please provide a valid WhatsApp number'
  }),
  website: Joi.string().uri().optional().messages({
    'string.uri': 'Please provide a valid website URL'
  }),
  address: Joi.string().max(500).optional().messages({
    'string.max': 'Address cannot exceed 500 characters'
  }),
  city: Joi.string().max(100).optional().messages({
    'string.max': 'City name cannot exceed 100 characters'
  }),
  state: Joi.string().max(100).optional().messages({
    'string.max': 'State name cannot exceed 100 characters'
  }),
  zip_code: Joi.string().max(20).optional().messages({
    'string.max': 'ZIP code cannot exceed 20 characters'
  }),
  country: Joi.string().max(100).optional().messages({
    'string.max': 'Country name cannot exceed 100 characters'
  }),
  category: Joi.string().max(100).optional().messages({
    'string.max': 'Category cannot exceed 100 characters'
  }),
  tax_id: Joi.string().max(100).optional().messages({
    'string.max': 'Tax ID cannot exceed 100 characters'
  }),
  vat_id: Joi.string().max(100).optional().messages({
    'string.max': 'VAT ID cannot exceed 100 characters'
  }),
  payment_terms: Joi.string().valid('net-15', 'net-30', 'net-45', 'net-60', 'cod', 'prepaid').optional().messages({
    'any.only': 'Payment terms must be one of: net-15, net-30, net-45, net-60, cod, prepaid'
  }),
  bank_name: Joi.string().max(255).optional().messages({
    'string.max': 'Bank name cannot exceed 255 characters'
  }),
  bank_account: Joi.string().max(100).optional().messages({
    'string.max': 'Bank account cannot exceed 100 characters'
  }),
  bank_routing: Joi.string().max(100).optional().messages({
    'string.max': 'Bank routing cannot exceed 100 characters'
  }),
  swift_code: Joi.string().max(20).optional().messages({
    'string.max': 'SWIFT code cannot exceed 20 characters'
  }),
  iban: Joi.string().max(50).optional().messages({
    'string.max': 'IBAN cannot exceed 50 characters'
  }),
  status: Joi.string().valid('active', 'inactive').optional().messages({
    'any.only': 'Status must be either active or inactive'
  }),
  rating: Joi.number().min(0).max(5).optional().messages({
    'number.min': 'Rating must be between 0 and 5',
    'number.max': 'Rating must be between 0 and 5'
  }),
  total_orders: Joi.number().integer().min(0).optional().messages({
    'number.base': 'Total orders must be a number',
    'number.integer': 'Total orders must be an integer',
    'number.min': 'Total orders cannot be negative'
  }),
  last_order_date: Joi.date().iso().optional().messages({
    'date.format': 'Last order date must be a valid date'
  }),
  notes: Joi.string().max(1000).optional().messages({
    'string.max': 'Notes cannot exceed 1000 characters'
  })
});

export const supplierQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1'
  }),
  limit: Joi.number().integer().min(1).max(100).default(10).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100'
  }),
  search: Joi.string().max(255).optional().messages({
    'string.max': 'Search term cannot exceed 255 characters'
  }),
  category: Joi.string().max(100).optional().messages({
    'string.max': 'Category cannot exceed 100 characters'
  }),
  status: Joi.string().valid('active', 'inactive').optional().messages({
    'any.only': 'Status must be either active or inactive'
  }),
  sortBy: Joi.string().valid('name', 'created_at', 'rating', 'total_orders', 'last_order_date').default('created_at').messages({
    'any.only': 'Sort by must be one of: name, created_at, rating, total_orders, last_order_date'
  }),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
    'any.only': 'Sort order must be either asc or desc'
  })
});
