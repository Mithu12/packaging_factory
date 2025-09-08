import Joi from 'joi';

// Category validation schemas
const categoryBaseSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(1000).optional().allow(null, ''),
});

export const createCategorySchema = categoryBaseSchema;

export const updateCategorySchema = categoryBaseSchema.keys({
  name: Joi.string().min(2).max(255).optional(),
}).min(1); // At least one field must be provided for update

export const getCategoriesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().optional().allow(''),
  sortBy: Joi.string().valid('id', 'name', 'created_at', 'updated_at').default('id'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

// Subcategory validation schemas
const subcategoryBaseSchema = Joi.object({
  name: Joi.string().min(2).max(255).required(),
  description: Joi.string().max(1000).optional().allow(null, ''),
  category_id: Joi.number().integer().positive().required(),
});

export const createSubcategorySchema = subcategoryBaseSchema;

export const updateSubcategorySchema = subcategoryBaseSchema.keys({
  name: Joi.string().min(2).max(255).optional(),
  category_id: Joi.number().integer().positive().optional(),
}).min(1); // At least one field must be provided for update

export const getSubcategoriesQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  search: Joi.string().optional().allow(''),
  category_id: Joi.number().integer().positive().optional(),
  sortBy: Joi.string().valid('id', 'name', 'category_id', 'created_at', 'updated_at').default('id'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});
