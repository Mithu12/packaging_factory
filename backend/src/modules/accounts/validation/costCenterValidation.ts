import Joi from 'joi';

// Base schema for common cost center fields
const costCenterBaseSchema = {
  name: Joi.string().min(1).max(255).trim(),
  code: Joi.string().min(1).max(50).trim(),
  type: Joi.string().valid('Department', 'Project', 'Location'),
  department: Joi.string().min(1).max(255).trim(),
  owner: Joi.string().min(1).max(255).trim(),
  budget: Joi.number().min(0).precision(2),
  status: Joi.string().valid('Active', 'Inactive'),
  description: Joi.string().max(1000).trim().allow('', null),
  defaultAccountId: Joi.number().integer().positive().optional(),
};

// Schema for creating a new cost center
export const createCostCenterSchema = Joi.object({
  name: costCenterBaseSchema.name.required(),
  code: costCenterBaseSchema.code.required(),
  type: costCenterBaseSchema.type.required(),
  defaultAccountId: costCenterBaseSchema.defaultAccountId,
  department: costCenterBaseSchema.department.required(),
  owner: costCenterBaseSchema.owner.required(),
  budget: costCenterBaseSchema.budget.default(0),
  status: costCenterBaseSchema.status.default('Active'),
  description: costCenterBaseSchema.description,
});

// Schema for updating an existing cost center
export const updateCostCenterSchema = Joi.object({
  name: costCenterBaseSchema.name,
  code: costCenterBaseSchema.code,
  type: costCenterBaseSchema.type,
  defaultAccountId: costCenterBaseSchema.defaultAccountId,
  department: costCenterBaseSchema.department,
  owner: costCenterBaseSchema.owner,
  budget: costCenterBaseSchema.budget,
  status: costCenterBaseSchema.status,
  description: costCenterBaseSchema.description,
}).min(1); // At least one field must be provided

// Schema for query parameters
export const getCostCentersQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(1000).default(10),
  search: Joi.string().max(255).trim().allow(''),
  type: Joi.string().valid('Department', 'Project', 'Location'),
  status: Joi.string().valid('Active', 'Inactive'),
  department: Joi.string().max(255).trim(),
  sortBy: Joi.string().valid('id', 'name', 'code', 'type', 'department', 'budget', 'actualSpend', 'created_at', 'updated_at').default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});
