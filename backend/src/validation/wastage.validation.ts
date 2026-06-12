import Joi from 'joi';

const numericIdSchema = Joi.alternatives().try(
  Joi.number().integer().positive(),
  Joi.string().pattern(/^\d+$/)
);

export const approveWastageSchema = Joi.object({
  notes: Joi.string().max(500).allow('', null).optional(),
});

export const createWastageSchema = Joi.object({
  material_id: numericIdSchema.required(),
  quantity: Joi.number().positive().required(),
  wastage_reason: Joi.string().max(255).required(),
  work_order_id: numericIdSchema.allow(null).optional(),
  batch_number: Joi.string().max(100).allow('', null).optional(),
  notes: Joi.string().max(500).allow('', null).optional(),
});

export const wastageQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().allow('').optional(),
  status: Joi.string()
    .valid('', 'pending', 'approved', 'rejected', 'sold')
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

export const createWastageSaleSchema = Joi.object({
  wastage_ids: Joi.array().items(numericIdSchema).min(1).unique().required(),
  buyer_name: Joi.string().max(255).required(),
  buyer_phone: Joi.string().max(50).allow('', null).optional(),
  total_amount: Joi.number().positive().required(),
  payment_method: Joi.string().valid('cash', 'bank_transfer').required(),
  payment_reference: Joi.string().max(255).allow('', null).optional(),
  notes: Joi.string().max(500).allow('', null).optional(),
});

export const wastageSaleQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().allow('').optional(),
});
