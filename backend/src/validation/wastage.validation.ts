import Joi from 'joi';

const numericIdSchema = Joi.alternatives().try(
  Joi.number().integer().positive(),
  Joi.string().pattern(/^\d+$/)
);

export const approveWastageSchema = Joi.object({
  notes: Joi.string().max(500).allow('', null).optional(),
});

export const wastageQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().allow('').optional(),
  status: Joi.string()
    .valid('', 'pending', 'approved', 'rejected')
    .optional(),
  work_order_id: numericIdSchema.optional(),
  sort_by: Joi.string()
    .valid('recorded_date', 'material_name', 'quantity', 'cost', 'status')
    .default('recorded_date'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc'),
});

export const wastageParamsSchema = Joi.object({
  id: numericIdSchema.required(),
});
