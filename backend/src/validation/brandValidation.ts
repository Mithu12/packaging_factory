import Joi from 'joi';

// Create brand validation schema
export const validateCreateBrand = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Brand name must be at least 2 characters long',
      'string.max': 'Brand name must not exceed 100 characters',
      'any.required': 'Brand name is required'
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  is_active: Joi.boolean()
    .default(true)
    .messages({
      'any.only': 'Status must be either active or inactive'
    })
});

// Update brand validation schema
export const validateUpdateBrand = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Brand name must be at least 2 characters long',
      'string.max': 'Brand name must not exceed 100 characters'
    }),
  description: Joi.string()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.max': 'Description must not exceed 500 characters'
    }),
  is_active: Joi.boolean()
    .optional()
    .messages({
      'any.only': 'Status must be either true or false'
    })
}).min(1).messages({
  'object.min': 'At least one field must be provided for update'
});
