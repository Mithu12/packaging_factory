import Joi from 'joi';

export const createSupplierCategorySchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(255)
    .trim()
    .required()
    .messages({
      'string.empty': 'Category name is required',
      'string.min': 'Category name is required',
      'string.max': 'Category name must be less than 255 characters',
      'any.required': 'Category name is required'
    }),
  description: Joi.string()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description must be less than 1000 characters'
    }),
  color: Joi.string()
    .pattern(/^#[0-9A-F]{6}$/i)
    .optional()
    .messages({
      'string.pattern.base': 'Color must be a valid hex color (e.g., #3B82F6)'
    })
});

export const updateSupplierCategorySchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(255)
    .trim()
    .optional()
    .messages({
      'string.empty': 'Category name cannot be empty',
      'string.min': 'Category name must be at least 1 character',
      'string.max': 'Category name must be less than 255 characters'
    }),
  description: Joi.string()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'Description must be less than 1000 characters'
    }),
  color: Joi.string()
    .pattern(/^#[0-9A-F]{6}$/i)
    .optional()
    .messages({
      'string.pattern.base': 'Color must be a valid hex color (e.g., #3B82F6)'
    }),
  is_active: Joi.boolean().optional()
});

export const supplierCategoryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().optional(),
  is_active: Joi.boolean().optional()
});
